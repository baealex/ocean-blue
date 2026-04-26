import { resolvePasswordAuthConfig, type AuthConfig, type AuthEnvironment } from '@baejino/auth';

export const resolveOceanBlueAuthConfig = (env: AuthEnvironment = process.env): AuthConfig => resolvePasswordAuthConfig({
    env,
    passwordEnv: 'OCEAN_BLUE_AUTH_PASSWORD',
    sessionSecretEnv: 'OCEAN_BLUE_SESSION_SECRET',
    allowOpenEnv: 'OCEAN_BLUE_ALLOW_INSECURE_NO_AUTH',
    requireExplicitOpen: false,
    allowPasswordAsSessionSecret: false,
    cookieName: 'ocean-blue.sid'
});

export const authConfig = resolveOceanBlueAuthConfig();
