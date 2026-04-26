import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@baejino/react-ui/toast';

import router from '~/app/router';
import { useAuthStore } from '~/features/auth/store/authStore';
import { AppModalProvider } from '~/components/ui/Modal';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false
        }
    }
});

/**
 * App - Root component of the application
 */
function App() {
    const { checkAuth } = useAuthStore();

    useEffect(() => {
    // Check authentication status when app loads
        checkAuth();
    }, [checkAuth]);

    return (
        <QueryClientProvider client={queryClient}>
            <AppModalProvider>
                <RouterProvider router={router} />
                <ToastProvider closeButton position="bottom-right" richColors />
            </AppModalProvider>
        </QueryClientProvider>
    );
}

export default App;
