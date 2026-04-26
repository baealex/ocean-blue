import './register-aliases.js';

import { server, tunnelServer } from './app.js';
import prisma from '~/models.js';
import { appLogger } from '~/core/index.js';
import { TunnelAuthService } from '~/features/auth/tunnel-auth.service.js';

const PORT = process.env.PORT || 25830;
const serverUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

const start = async () => {
    await TunnelAuthService.backfillPlaintextTokens();

    server.listen(PORT, () => {
        appLogger.info(`Ocean Blue is running at ${serverUrl}`);
        appLogger.info(`HTTP server listening on port ${PORT}`);
    });
};

start().catch((error) => {
    appLogger.error(`Failed to start server: ${error}`);
    process.exit(1);
});

const shutdown = async () => {
    appLogger.info('Shutting down gracefully...');

    const forceTimeout = setTimeout(() => {
        appLogger.error('Graceful shutdown timed out, forcing exit');
        process.exit(1);
    }, 10_000);

    try {
        server.close();
        tunnelServer.close();
        await prisma.$disconnect();
    } catch (err) {
        appLogger.error(`Error during shutdown: ${err}`);
    }

    clearTimeout(forceTimeout);
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
