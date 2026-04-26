import type {
    Request,
    Response,
    NextFunction
} from 'express';
import type { Controller } from '~/types/index.js';
import appLogger from './app-logger.js';

export default function useAsync(callback: Controller) {
    return function (req: Request, res: Response, next: NextFunction) {
        callback(req, res, next)
            .catch((e: Error) => {
                res.status(500).send('Internal Server Error');
                appLogger.error(`Unhandled error: ${e.message}\n${e.stack}`);
                next();
            });
    };
}
