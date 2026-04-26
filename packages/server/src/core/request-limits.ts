import type { Request, RequestHandler } from 'express';

export function parsePositiveInteger(value: string | undefined, fallback: number): number {
    if (!value) {
        return fallback;
    }

    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export function parseByteLimit(value: string | undefined, fallback: number): number {
    if (!value) {
        return fallback;
    }

    const matchedValue = value.trim().toLowerCase().match(/^(\d+)(b|kb|mb|gb)?$/);
    if (!matchedValue) {
        return fallback;
    }

    const amount = Number(matchedValue[1]);
    const unit = matchedValue[2] || 'b';
    const multipliers = {
        b: 1,
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024
    } as const;

    return amount * multipliers[unit as keyof typeof multipliers];
}

export function captureRawBody(limitInBytes: number, limitLabel: string): RequestHandler {
    return (req, res, next) => {
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        let completed = false;

        const cleanup = () => {
            req.removeListener('data', onData);
            req.removeListener('end', onEnd);
            req.removeListener('error', onError);
            req.removeListener('aborted', onAborted);
        };

        const finish = (handler: () => void) => {
            if (completed) {
                return;
            }

            completed = true;
            cleanup();
            handler();
        };

        const onData = (chunk: Buffer) => {
            totalBytes += chunk.length;

            if (totalBytes > limitInBytes) {
                finish(() => {
                    res.status(413).type('text/plain').send(`Tunnel request body exceeds ${limitLabel}`);
                    req.resume();
                });
                return;
            }

            chunks.push(chunk);
        };

        const onEnd = () => {
            finish(() => {
                (req as Request & { rawBody?: Buffer }).rawBody = Buffer.concat(chunks);
                next();
            });
        };

        const onError = (error: Error) => {
            finish(() => next(error));
        };

        const onAborted = () => {
            finish(() => {
                next(new Error('Client aborted request while Ocean Blue was reading the body'));
            });
        };

        req.on('data', onData);
        req.on('end', onEnd);
        req.on('error', onError);
        req.on('aborted', onAborted);
    };
}
