/**
 * Shared constants across packages
 */

export const DEFAULT_LOCAL_HOST = 'localhost';
export const DEFAULT_TUNNEL_PATH = '/tunnel';
export const DEFAULT_SERVER_URL = 'http://localhost:25830';
export const DEFAULT_SERVER_HOST = 'localhost';
export const DEFAULT_SERVER_PORT = 25830;

/**
 * Timeout configurations (in milliseconds)
 */
export const TIMEOUTS = {
    REQUEST: 30000,        // 30 seconds
    HEARTBEAT: 30000,      // 30 seconds
    RECONNECT: 5000,       // 5 seconds
} as const;
