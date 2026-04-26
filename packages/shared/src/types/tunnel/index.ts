/**
 * Tunnel Protocol Types
 * Shared between server and CLI
 */

export * from './common.js';
export * from './client-to-server.js';
export * from './server-to-client.js';

import type { ClientToServer } from './client-to-server.js';
import type { ServerToClient } from './server-to-client.js';

/**
 * Union type of all tunnel messages
 */
export type TunnelMessage = ClientToServer.Message | ServerToClient.Message;

// Re-export for convenience
export type ProxyRequestMessage = ServerToClient.ProxyRequestMessage;
