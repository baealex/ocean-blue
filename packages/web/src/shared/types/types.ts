// API types for tunnel tokens and sessions

export interface TunnelToken {
    id: string;
    tokenPreview: string | null;
    name: string;
    maxTunnels: number;
    currentTunnels: number;
    createdAt: string;
    lastUsed: string | null;
    isActive: boolean;
}

export interface TunnelSession {
    id: string;
    subdomain: string;
    createdAt: string;
    lastActive: string;
    isActive: boolean;
    clientVersion: string | null;
    clientIp: string | null;
}

export interface CreateTokenInput {
    name: string;
    maxTunnels: number;
}

export interface UpdateTokenInput {
    id: string;
    isActive: boolean;
}

export interface TokenResponse {
    tunnelTokens: TunnelToken[];
}

export interface CreatedTunnelToken {
    id: string;
    plainToken: string;
    tokenPreview: string;
    name: string;
    maxTunnels: number;
    currentTunnels: number;
    createdAt: string;
    lastUsed: string | null;
    isActive: boolean;
}

export interface CreateTokenResponse {
    createTunnelToken: CreatedTunnelToken;
}

export interface UpdateTokenResponse {
    updateTunnelToken: {
        id: string;
        isActive: boolean;
    };
}

export interface DeleteTokenResponse {
    deleteTunnelToken: boolean;
}

export interface SessionsResponse {
    tunnelSessionsByToken: TunnelSession[];
}

export interface CloseSessionResponse {
    closeTunnelSession: boolean;
}
