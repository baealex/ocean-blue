import type { IncomingHttpHeaders } from 'http';

type RequestWithClientAddress = {
    headers: IncomingHttpHeaders;
    socket: {
        remoteAddress?: string;
    };
};

function firstHeaderAddress(value: string | string[] | undefined): string | null {
    const values = Array.isArray(value) ? value : [value];

    for (const item of values) {
        const address = item?.split(',')
            .map((part) => part.trim())
            .find(Boolean);

        if (address) {
            return address;
        }
    }

    return null;
}

export function getRequestClientIp(req: RequestWithClientAddress): string | null {
    const forwardedIp = firstHeaderAddress(req.headers['x-forwarded-for']);
    const realIp = firstHeaderAddress(req.headers['x-real-ip']);
    const socketIp = req.socket.remoteAddress?.trim();

    return forwardedIp || realIp || socketIp || null;
}
