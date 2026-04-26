import { resolvePasswordAuthConfig } from '@baejino/auth';

export const authConfig = resolvePasswordAuthConfig({
    env: process.env,
    passwordEnv: 'OCEAN_BLUE_AUTH_PASSWORD',
    sessionSecretEnv: 'OCEAN_BLUE_SESSION_SECRET',
    allowOpenEnv: 'OCEAN_BLUE_ALLOW_INSECURE_NO_AUTH',
    requireExplicitOpen: true,
    allowPasswordAsSessionSecret: false,
    cookieName: 'ocean-blue.sid'
});
