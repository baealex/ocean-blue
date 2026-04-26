/**
 * Common types and constants for tunnel protocol
 */

// Binary Protocol Message Types
export const PROXY_DATA_TYPE = 1;
export const PROXY_END_TYPE = 2;

/**
 * Base message interface
 */
export interface BaseMessage {
  id?: string;
  type: string;
}

/**
 * Tunnel configuration
 */
export interface TunnelConfig {
  localPort: number;
  subdomain?: string;
  serverHost?: string;
  serverPort?: number;
  serverProtocol?: 'http' | 'https';
  apiKey?: string;
}

/**
 * Tunnel connection information
 */
export interface TunnelConnection {
  id: string;
  subdomain: string;
  localPort: number;
  publicUrl: string;
  isActive: boolean;
  createdAt: Date;
  subdomainMode?: 'nested' | 'flat';
}

/**
 * Tunnel connection status
 */
export interface TunnelStatus {
  connected: boolean;
  url?: string;
  subdomain?: string;
  error?: string;
}
