import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
    TokenResponse,
    CreateTokenInput,
    CreateTokenResponse,
    UpdateTokenInput,
    UpdateTokenResponse,
    DeleteTokenResponse,
    SessionsResponse,
    AllSessionsResponse,
    CloseSessionResponse,
    TunnelToken
} from './types';
import { tunnelQueryKeys } from './queryKeys';

// GraphQL client function
async function fetchGraphQL<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            variables
        })
    });

    const json = await response.json();

    if (json.errors) {
        throw new Error(json.errors[0].message);
    }

    return json.data as T;
}

// Query hooks
export const useTokens = () => {
    return useQuery({
        queryKey: tunnelQueryKeys.tokens(),
        queryFn: () => fetchGraphQL<TokenResponse>(`
            query TunnelTokens {
                tunnelTokens {
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
        `),
        refetchOnWindowFocus: false,
        staleTime: 30000 // 30 seconds
    });
};

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

export interface TokenByIdResponse {
    tunnelToken: TunnelToken;
}

export const useTokenById = (tokenId: string | undefined) => {
    return useQuery({
        queryKey: tunnelQueryKeys.token(tokenId),
        queryFn: () => fetchGraphQL<TokenByIdResponse>(`
            query TunnelTokenById($tokenId: ID!) {
                tunnelToken(id: $tokenId) {
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
        `, { tokenId }),
        enabled: !!tokenId,
        refetchOnWindowFocus: false,
        staleTime: 30000 // 30 seconds
    });
};

// Mutation hooks
export const useCreateToken = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateTokenInput) => fetchGraphQL<CreateTokenResponse>(`
            mutation CreateTunnelToken($name: String!, $maxTunnels: Int!) {
                createTunnelToken(name: $name, maxTunnels: $maxTunnels) {
                    id
                    plainToken
                    tokenPreview
                    name
                    maxTunnels
                    currentTunnels
                    createdAt
                    lastUsed
                    isActive
                }
            }
        `, input as unknown as Record<string, unknown>),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.tokens() });
        }
    });
};

export const useUpdateToken = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateTokenInput) => fetchGraphQL<UpdateTokenResponse>(`
            mutation UpdateTunnelToken($id: ID!, $isActive: Boolean!) {
                updateTunnelToken(id: $id, isActive: $isActive) {
                    id
                    isActive
                }
            }
        `, input as unknown as Record<string, unknown>),
        onSuccess: (_, variables) => {
            // Optimistic update
            queryClient.setQueryData<TokenResponse>(tunnelQueryKeys.tokens(), (old) => {
                if (!old) return { tunnelTokens: [] };

                return {
                    tunnelTokens: old.tunnelTokens.map(token => {
                        return token.id === variables.id
                            ? {
                                ...token,
                                isActive: variables.isActive
                            }
                            : token;
                    })
                };
            });

            queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.tokens() });
            queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.token(variables.id) });
        }
    });
};

export const useDeleteToken = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => fetchGraphQL<DeleteTokenResponse>(`
            mutation DeleteTunnelToken($id: ID!) {
                deleteTunnelToken(id: $id)
            }
        `, { id }),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.tokens() });
            queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.token(id) });
            queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.sessions() });
        }
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
            queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.sessions() });
            queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.sessionsByToken(variables.tokenId) });
            queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.tokens() });
            queryClient.invalidateQueries({ queryKey: tunnelQueryKeys.token(variables.tokenId) });
        }
    });
};
