import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '~/features/auth/store/authStore';

interface AuthGuardProps {
    children: ReactNode;
    redirectTo?: string;
}

const AuthGuard = ({ children, redirectTo = '/' }: AuthGuardProps) => {
    const { isAuthenticated, isLoading } = useAuthStore();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            window.location.assign(redirectTo);
        }
    }, [isAuthenticated, isLoading, redirectTo]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return isAuthenticated ? children : null;
};

export default AuthGuard;
