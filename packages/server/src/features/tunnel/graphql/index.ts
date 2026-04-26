import type { IResolvers } from '@graphql-tools/utils';

import { gql } from '~/core/graphql.js';
import { TunnelAuthService } from '~/features/auth/tunnel-auth.service.js';
import prisma from '~/models.js';

export const tunnelTokenType = gql`
    type TunnelToken {
        id: ID!
        tokenPreview: String
        name: String!
        maxTunnels: Int!
        currentTunnels: Int!
        createdAt: String!
        lastUsed: String
        isActive: Boolean!
    }

    type CreatedTunnelToken {
        id: ID!
        plainToken: String!
        tokenPreview: String!
        name: String!
        maxTunnels: Int!
        currentTunnels: Int!
        createdAt: String!
        lastUsed: String
        isActive: Boolean!
    }

    type TunnelSession {
        id: ID!
        subdomain: String!
        tokenId: String!
        createdAt: String!
        lastActive: String!
        isActive: Boolean!
        clientVersion: String
        clientIp: String
        tunnelToken: TunnelToken!
    }
`;

export const tunnelTokenQuery = gql`
    type Query {
        tunnelToken(id: ID!): TunnelToken
        tunnelTokens: [TunnelToken!]!
        myTunnelTokens: [TunnelToken!]!
        tunnelSessions: [TunnelSession!]!
        tunnelSessionsByToken(tokenId: ID!): [TunnelSession!]!
    }
`;

export const tunnelTokenMutation = gql`
    type Mutation {
        createTunnelToken(name: String!, maxTunnels: Int): CreatedTunnelToken!
        updateTunnelToken(id: ID!, name: String, maxTunnels: Int, isActive: Boolean): TunnelToken!
        deleteTunnelToken(id: ID!): Boolean!
        closeTunnelSession(id: ID!): Boolean!
    }
`;

export const tunnelTokenTypeDefs = `
    ${tunnelTokenType}
    ${tunnelTokenQuery}
    ${tunnelTokenMutation}
`;

const listTunnelTokens = () => {
    return prisma.tunnelToken.findMany({
        orderBy: { createdAt: 'desc' }
    });
};

export const tunnelTokenResolvers: IResolvers = {
    Query: {
        tunnelToken: async (_, { id }) => {
            return prisma.tunnelToken.findUnique({ where: { id: String(id) } });
        },

        tunnelTokens: async () => {
            return listTunnelTokens();
        },

        // Backward-compatible alias for the existing web client query.
        myTunnelTokens: async () => {
            return listTunnelTokens();
        },

        tunnelSessions: async () => {
            return prisma.tunnelSession.findMany({
                include: { tunnelToken: true },
                orderBy: [
                    { isActive: 'desc' },
                    { lastActive: 'desc' }
                ]
            });
        },

        tunnelSessionsByToken: async (_, { tokenId }) => {
            const token = await prisma.tunnelToken.findUnique({ where: { id: String(tokenId) } });
            if (!token) throw new Error('Tunnel key not found');

            return prisma.tunnelSession.findMany({
                where: { tokenId: String(tokenId) },
                include: { tunnelToken: true },
                orderBy: { createdAt: 'desc' }
            });
        }
    },

    Mutation: {
        createTunnelToken: async (_, { name, maxTunnels = 10 }) => {
            const { record, plainToken, tokenPreview } = await TunnelAuthService.createTokenRecord({
                name,
                maxTunnels
            });

            return {
                ...record,
                plainToken,
                tokenPreview
            };
        },

        updateTunnelToken: async (_, { id, name, maxTunnels, isActive }) => {
            const token = await prisma.tunnelToken.findUnique({ where: { id: String(id) } });
            if (!token) throw new Error('Tunnel key not found');

            return prisma.tunnelToken.update({
                where: { id: String(id) },
                data: {
                    name: name !== undefined ? name : undefined,
                    maxTunnels: maxTunnels !== undefined ? maxTunnels : undefined,
                    isActive: isActive !== undefined ? isActive : undefined
                }
            });
        },

        deleteTunnelToken: async (_, { id }) => {
            const token = await prisma.tunnelToken.findUnique({ where: { id: String(id) } });
            if (!token) throw new Error('Tunnel key not found');

            await prisma.tunnelSession.deleteMany({ where: { tokenId: String(id) } });
            await prisma.tunnelToken.delete({ where: { id: String(id) } });
            return true;
        },

        closeTunnelSession: async (_, { id }) => {
            const session = await prisma.tunnelSession.findUnique({
                where: { id: String(id) },
                include: { tunnelToken: true }
            });

            if (!session) throw new Error('Session not found');

            await prisma.tunnelSession.update({
                where: { id: String(id) },
                data: { isActive: false }
            });

            if (session.isActive) {
                await prisma.tunnelToken.update({
                    where: { id: session.tokenId },
                    data: { currentTunnels: Math.max(0, session.tunnelToken.currentTunnels - 1) }
                });
            }

            return true;
        }
    },

    TunnelSession: {
        tunnelToken: (parent) => {
            if (parent.tunnelToken) return parent.tunnelToken;
            return prisma.tunnelToken.findUnique({ where: { id: parent.tokenId } });
        }
    }
};
