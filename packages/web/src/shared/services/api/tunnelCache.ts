import type { QueryClient } from '@tanstack/react-query';
import type { TokenResponse } from './types';
import { tunnelQueryKeys } from './queryKeys';

export function updateTokenActiveState(queryClient: QueryClient, tokenId: string, isActive: boolean) {
    queryClient.setQueryData<TokenResponse>(tunnelQueryKeys.tokens(), (old) => {
        if (!old) return { tunnelTokens: [] };

        return {
            tunnelTokens: old.tunnelTokens.map(token => {
                return token.id === tokenId
                    ? {
                        ...token,
                        isActive
                    }
                    : token;
            })
        };
    });
}

export function invalidateTokenList(queryClient: QueryClient) {
    return queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.tokens(), exact: true });
}

export function invalidateTokenDetail(queryClient: QueryClient, tokenId: string) {
    return queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.token(tokenId), exact: true });
}

export function invalidateSessionList(queryClient: QueryClient) {
    return queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.sessions(), exact: true });
}

export function invalidateAllSessionCaches(queryClient: QueryClient) {
    return queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.sessions(), exact: false });
}

export function invalidateSessionsByToken(queryClient: QueryClient, tokenId: string) {
    return queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.sessionsByToken(tokenId), exact: true });
}
