import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGraphQL } from './graphqlTransport';
import { tunnelQueryKeys } from './queryKeys';
import {
    invalidateSessionList,
    invalidateSessionsByToken,
    invalidateTokenDetail,
    invalidateTokenList
} from './tunnelCache';
import type { AllSessionsResponse, CloseSessionResponse, SessionsResponse } from './types';

export const useSessions = (tokenId: string) => {
    return useQuery({
        queryKey: tunnelQueryKeys.sessionsByToken(tokenId),
        queryFn: () => fetchGraphQL<SessionsResponse>(`
            query TunnelSessionsByToken($tokenId: ID!) {
                tunnelSessionsByToken(tokenId: $tokenId) {
                    id
                    subdomain
                    tokenId
                    createdAt
                    lastActive
                    isActive
                    clientVersion
                    clientIp
                }
            }
        `, { tokenId }),
        enabled: !!tokenId,
        refetchOnWindowFocus: false,
        staleTime: 30000 // 30 seconds
    });
};

export const useAllSessions = () => {
    return useQuery({
        queryKey: tunnelQueryKeys.sessions(),
        queryFn: () => fetchGraphQL<AllSessionsResponse>(`
            query TunnelSessions {
                tunnelSessions {
                    id
                    subdomain
                    tokenId
                    createdAt
                    lastActive
                    isActive
                    clientVersion
                    clientIp
                    tunnelToken {
                        id
                        tokenPreview
                        name
                        maxTunnels
                        currentTunnels
                        createdAt
                        lastUsed
                        isActive
                    }
                }
            }
        `),
        refetchOnWindowFocus: false,
        staleTime: 30000 // 30 seconds
    });
};

export const useCloseSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sessionId }: { sessionId: string; tokenId: string }) => fetchGraphQL<CloseSessionResponse>(`
            mutation CloseTunnelSession($id: ID!) {
                closeTunnelSession(id: $id)
            }
        `, { id: sessionId }),
        onSuccess: (_, variables) => {
            invalidateSessionList(queryClient);
            invalidateSessionsByToken(queryClient, variables.tokenId);
            invalidateTokenList(queryClient);
            invalidateTokenDetail(queryClient, variables.tokenId);
        }
    });
};
