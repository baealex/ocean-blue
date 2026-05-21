import type { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
    interface SessionData {
        authenticated?: boolean;
        csrfToken?: string;
        tunnelAuth?: {
            deviceId: string;
            callbackUrl: string;
            timestamp: number;
        };
    }
}

export type Controller = (req: Request, res: Response, next?: NextFunction) => Promise<void>;
