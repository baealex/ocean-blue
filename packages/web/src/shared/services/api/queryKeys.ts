export const tunnelQueryKeys = {
    all: ['tunnel'] as const,
    tokens: () => [...tunnelQueryKeys.all, 'tokens'] as const,
    token: (tokenId: string | undefined) => [...tunnelQueryKeys.tokens(), 'detail', tokenId ?? ''] as const,
    sessions: () => [...tunnelQueryKeys.all, 'sessions'] as const,
    sessionsByToken: (tokenId: string) => [...tunnelQueryKeys.sessions(), 'by-token', tokenId] as const
};
