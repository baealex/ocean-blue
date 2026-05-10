import type { AuthSessionResponse } from '@baejino/auth';

type OceanBlueAuthSession = AuthSessionResponse & { csrfToken?: string };
import { create } from 'zustand';

const OPEN_SESSION: OceanBlueAuthSession = {
    mode: 'open',
    authRequired: false,
    authenticated: false
};

const canAccess = (session: AuthSessionResponse | null) => {
    if (!session) return false;
    return !session.authRequired || session.authenticated;
};

interface AuthState {
    session: OceanBlueAuthSession | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const readError = async (response: Response, fallback: string) => {
    try {
        const data = await response.json();
        return typeof data.error === 'string' ? data.error : fallback;
    } catch {
        return fallback;
    }
};

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    logout: async () => {
        set({ isLoading: true, error: null });

        try {
            const csrfToken = get().session?.csrfToken;
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
                headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined
            });

            if (!response.ok) {
                throw new Error(await readError(response, 'Logout failed'));
            }

            const session = await response.json() as OceanBlueAuthSession;

            set({
                session,
                isAuthenticated: canAccess(session),
                isLoading: false
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'An unknown error occurred',
                isLoading: false
            });
        }
    },

    checkAuth: async () => {
        set({ isLoading: true, error: null });

        try {
            const response = await fetch('/api/auth/session', { credentials: 'include' });

            if (!response.ok) {
                set({
                    session: OPEN_SESSION,
                    isAuthenticated: false,
                    isLoading: false
                });
                return;
            }

            const session = await response.json() as OceanBlueAuthSession;

            set({
                session,
                isAuthenticated: canAccess(session),
                isLoading: false
            });
        } catch (error) {
            set({
                session: null,
                isAuthenticated: false,
                error: error instanceof Error ? error.message : 'An unknown error occurred',
                isLoading: false
            });
        }
    }
}));
