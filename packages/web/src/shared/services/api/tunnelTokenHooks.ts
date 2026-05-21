import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGraphQL } from './graphqlTransport';
import { tunnelQueryKeys } from './queryKeys';
import {
    invalidateAllSessionCaches,
    invalidateTokenDetail,
    invalidateTokenList,
    updateTokenActiveState
} from './tunnelCache';
import type {
    CreateTokenInput,
    CreateTokenResponse,
    DeleteTokenResponse,
    TokenResponse,
    TunnelToken,
    UpdateTokenInput,
    UpdateTokenResponse
} from './types';

export interface TokenByIdResponse {
    tunnelToken: TunnelToken;
}

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
        `, { name: input.name, maxTunnels: input.maxTunnels }),
        onSuccess: () => {
            invalidateTokenList(queryClient);
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
        `, { id: input.id, isActive: input.isActive }),
        onSuccess: (_, variables) => {
            updateTokenActiveState(queryClient, variables.id, variables.isActive);
            invalidateTokenList(queryClient);
            invalidateTokenDetail(queryClient, variables.id);
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
            invalidateTokenList(queryClient);
            invalidateTokenDetail(queryClient, id);
            invalidateAllSessionCaches(queryClient);
        }
    });
};
