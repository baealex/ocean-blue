/**
 * Client -> Server Message Types
 */

import type { BaseMessage } from './common.js';

export namespace ClientToServer {
  export interface RegisterMessage extends BaseMessage {
    id: string;
    type: 'register';
    data: { subdomain: string; token?: string; clientVersion?: string };
  }

  export interface ProxyErrorMessage extends BaseMessage {
    id: string;
    type: 'proxy_error';
    error: string;
  }

  export type Message =
    | RegisterMessage
    | ProxyErrorMessage;
}
