import crypto from 'crypto';
import type { TunnelToken } from '@prisma/client';

import models from '~/models.js';
import { appLogger } from '~/core/index.js';

const TOKEN_PREFIX = 'tk_';

export const generateTunnelToken = () => `${TOKEN_PREFIX}${crypto.randomBytes(32).toString('hex')}`;

export const hashTunnelToken = (token: string) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

export const buildTunnelTokenPreview = (token: string) => {
    if (token.length <= 12) {
        return token;
    }

    return `${token.slice(0, 6)}••••••••${token.slice(-4)}`;
};

const isLegacyPlaintextToken = (token: string) => token.startsWith(TOKEN_PREFIX);

export class TunnelAuthService {
    static async migrateLegacyToken(record: TunnelToken) {
        if (!isLegacyPlaintextToken(record.token)) {
            if (!record.tokenPreview) {
                appLogger.warn(`Tunnel token ${record.id} is missing tokenPreview`);
            }
            return record;
        }

        const tokenPreview = buildTunnelTokenPreview(record.token);
        const tokenHash = hashTunnelToken(record.token);

        return models.tunnelToken.update({
            where: { id: record.id },
            data: {
                token: tokenHash,
                tokenPreview
            }
        });
    }

    static async backfillPlaintextTokens() {
        const legacyTokens = await models.tunnelToken.findMany({
            where: {
                token: {
                    startsWith: TOKEN_PREFIX
                }
            }
        });

        for (const legacyToken of legacyTokens) {
            await TunnelAuthService.migrateLegacyToken(legacyToken).catch((err) => {
                appLogger.error(`Failed to migrate legacy tunnel token ${legacyToken.id}: ${err}`);
            });
        }

        if (legacyTokens.length > 0) {
            appLogger.info(`Migrated ${legacyTokens.length} legacy tunnel token(s) to hashed storage`);
        }
    }

    static async createTokenRecord(input: { name: string; maxTunnels?: number; isActive?: boolean }) {
        const plainToken = generateTunnelToken();
        const tokenPreview = buildTunnelTokenPreview(plainToken);

        const record = await models.tunnelToken.create({
            data: {
                name: input.name,
                token: hashTunnelToken(plainToken),
                tokenPreview,
                maxTunnels: input.maxTunnels,
                isActive: input.isActive
            }
        });

        return {
            record,
            plainToken,
            tokenPreview
        };
    }

    static async isValidAuthToken(token: string) {
        const result = await models.tunnelToken.findFirst({
            where: {
                OR: [
                    { token },
                    { token: hashTunnelToken(token) }
                ],
                isActive: true
            }
        });

        if (!result) {
            return false;
        }

        await TunnelAuthService.migrateLegacyToken(result).catch(err => {
            appLogger.error(`Failed to migrate legacy tunnel token ${result.id}: ${err}`);
        });

        await models.tunnelToken.update({
            where: { id: result.id },
            data: { lastUsed: new Date() }
        }).catch(err => {
            appLogger.error(`Failed to update token lastUsed: ${err}`);
        });

        return true;
    }

    static async getTokenInfo(token: string) {
        const result = await models.tunnelToken.findFirst({
            where: {
                OR: [
                    { token },
                    { token: hashTunnelToken(token) }
                ],
                isActive: true
            }
        });

        if (!result) {
            return null;
        }

        const migratedResult = await TunnelAuthService.migrateLegacyToken(result).catch(err => {
            appLogger.error(`Failed to migrate legacy tunnel token ${result.id}: ${err}`);
            return result;
        });

        await models.tunnelToken.update({
            where: { id: migratedResult.id },
            data: { lastUsed: new Date() }
        }).catch(err => {
            appLogger.error(`Failed to update token lastUsed for ${migratedResult.id}: ${err}`);
        });

        return {
            tokenId: migratedResult.id,
            maxTunnels: migratedResult.maxTunnels,
            currentTunnels: migratedResult.currentTunnels
        };
    }
}
