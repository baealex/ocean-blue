import { Navigate, createBrowserRouter } from 'react-router-dom';

import RootLayout from '~/app/router/layouts/RootLayout';

import TunnelTokens from '~/pages/TunnelTokens';
import SessionDetails from '~/pages/SessionDetails';
import TunnelStats from '~/pages/TunnelStats';
import HowToProxy from '~/pages/HowToProxy';
import SessionsOverview from '~/pages/SessionsOverview';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            {
                path: '',
                element: <TunnelTokens />
            },
            {
                path: 'tokens/:tokenId',
                element: <SessionDetails />
            },
            {
                path: 'sessions',
                element: <SessionsOverview />
            },
            {
                path: 'how-to-proxy',
                element: <HowToProxy />
            },
            {
                path: 'dashboard',
                element: <Navigate to="/" replace />
            },
            {
                path: 'manage-tunnels',
                element: <Navigate to="/" replace />
            },
            {
                path: 'manage-tunnels/:tokenId',
                element: <SessionDetails />
            },
            {
                path: 'tunnel-stats',
                element: <TunnelStats />
            }
        ]
    }
]);

export default router;
