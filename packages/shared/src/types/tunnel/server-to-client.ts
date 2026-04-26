/**
 * Server -> Client Message Types
 */

import type { BaseMessage } from './common.js';

export namespace ServerToClient {
  export interface WelcomeMessage extends BaseMessage {
    type: 'welcome';
    data: { message: string };
  }

  export interface RegisterSuccessMessage extends BaseMessage {
    id: string;
    type: 'register_success';
    data: { subdomain: string; url: string };
  }

  export interface ProxyRequestMessage extends BaseMessage {
    id: string;
    type: 'proxy_request';
    data: string; // base64 encoded raw HTTP request
    clientIP?: string; // client IP address
    timestamp: number; // server received timestamp in ms
  }

  export interface ProxyDataMessage extends BaseMessage {
    id: string;
    type: 'proxy_data';
    data: string; // base64 encoded raw data chunk
  }

  export interface ProxyEndMessage extends BaseMessage {
    id: string;
    type: 'proxy_end';
    data: string; // empty string
  }

  export interface ErrorMessage extends BaseMessage {
    type: 'error';
    error: string;
  }

  export interface AuthFailedMessage extends BaseMessage {
    type: 'auth_failed';
    error: string;
  }

  export type Message =
    | WelcomeMessage
    | RegisterSuccessMessage
    | ProxyRequestMessage
    | ProxyDataMessage
    | ProxyEndMessage
    | ErrorMessage
    | AuthFailedMessage;
}
