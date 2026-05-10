import { useEffect, useState } from 'react';

interface RequestData {
    timestamp: number;
    method: string;
    path: string;
    status: number;
    ip: string;
    requestSize: number;
    responseSize: number;
    timeMs: number;
}

interface StatsData {
    totalRequests: number;
    totalDataTransferred: number;
    avgResponseTime: number;
}

interface ConfigData {
    publicUrl?: string;
    localPort?: number;
}

const getSafePublicUrl = (value?: string) => {
    if (!value) return undefined;

    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
    } catch {
        return undefined;
    }
};

const pageShellClassName = 'mx-auto flex min-h-screen max-w-[1600px] flex-col bg-[linear-gradient(135deg,#0f1419_0%,#1a1f2e_100%)] px-6 py-6 text-slate-200';
const headerClassName = 'relative mb-6 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] px-8 py-8 shadow-[0_10px_40px_rgba(102,126,234,0.4)]';
const statsGridClassName = 'mb-6 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]';
const statCardClassName = 'relative overflow-hidden rounded-2xl border border-[rgba(102,126,234,0.3)] bg-[rgba(22,27,51,0.8)] p-7 backdrop-blur-[10px] transition duration-250 hover:-translate-y-1 hover:border-[rgba(102,126,234,0.6)] hover:shadow-[0_12px_40px_rgba(102,126,234,0.3)]';
const requestsSectionClassName = 'flex max-h-[calc(100vh-420px)] flex-1 flex-col overflow-hidden rounded-2xl border border-[rgba(102,126,234,0.3)] bg-[rgba(22,27,51,0.8)] backdrop-blur-[10px]';
const requestsContainerClassName = [
    'min-h-0 flex-1 overflow-y-auto',
    '[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5',
    '[&::-webkit-scrollbar-track]:bg-[rgba(15,20,25,0.3)]',
    '[&::-webkit-scrollbar-thumb]:rounded-md [&::-webkit-scrollbar-thumb]:bg-[rgba(102,126,234,0.5)]',
    '[&::-webkit-scrollbar-thumb:hover]:bg-[rgba(102,126,234,0.7)]'
].join(' ');

const getMethodClassName = (method: string) => {
    switch (method) {
        case 'GET':
            return 'bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] shadow-[0_2px_8px_rgba(16,185,129,0.3)]';
        case 'POST':
            return 'bg-[linear-gradient(135deg,#3b82f6_0%,#2563eb_100%)] shadow-[0_2px_8px_rgba(59,130,246,0.3)]';
        case 'PUT':
            return 'bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] shadow-[0_2px_8px_rgba(245,158,11,0.3)]';
        case 'DELETE':
            return 'bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_100%)] shadow-[0_2px_8px_rgba(239,68,68,0.3)]';
        case 'PATCH':
            return 'bg-[linear-gradient(135deg,#8b5cf6_0%,#7c3aed_100%)] shadow-[0_2px_8px_rgba(139,92,246,0.3)]';
        default:
            return 'bg-[linear-gradient(135deg,#64748b_0%,#475569_100%)] shadow-[0_2px_8px_rgba(100,116,139,0.25)]';
    }
};

const getStatusTextClassName = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
        return 'text-emerald-400 [text-shadow:0_0_10px_rgba(16,185,129,0.5)]';
    }

    if (statusCode >= 300 && statusCode < 400) {
        return 'text-blue-400 [text-shadow:0_0_10px_rgba(59,130,246,0.5)]';
    }

    if (statusCode >= 400 && statusCode < 500) {
        return 'text-amber-400 [text-shadow:0_0_10px_rgba(245,158,11,0.5)]';
    }

    if (statusCode >= 500) {
        return 'text-rose-400 [text-shadow:0_0_10px_rgba(239,68,68,0.5)]';
    }

    return 'text-slate-300';
};

const getStatusBadgeClassName = (currentStatus: string) => {
    if (currentStatus === 'connected') {
        return {
            wrapper: 'border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.15)] text-emerald-400',
            dot: 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]'
        };
    }

    if (currentStatus === 'reconnecting') {
        return {
            wrapper: 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.15)] text-amber-400',
            dot: 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
        };
    }

    return {
        wrapper: 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.15)] text-rose-400',
        dot: 'bg-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]'
    };
};

const TunnelStats = () => {
    const [config, setConfig] = useState<ConfigData>({});
    const [status, setStatus] = useState('Waiting...');
    const [stats, setStats] = useState<StatsData>({
        totalRequests: 0,
        totalDataTransferred: 0,
        avgResponseTime: 0
    });
    const [requests, setRequests] = useState<RequestData[]>([]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.source !== window.parent || event.origin !== window.location.origin) return;

            const message = event.data;

            if (!message?.type) return;

            switch (message.type) {
                case 'init':
                    if (message.data) {
                        if (message.data.config) {
                            setConfig({
                                ...message.data.config,
                                publicUrl: getSafePublicUrl(message.data.config.publicUrl)
                            });
                        }
                        if (message.data.status) setStatus(message.data.status);
                        if (message.data.stats) setStats(message.data.stats);
                        if (message.data.requests) setRequests(message.data.requests);
                    }
                    break;
                case 'status':
                    if (message.data) setStatus(message.data);
                    break;
                case 'request':
                    if (message.data) {
                        setRequests((prev) => {
                            const newRequests = [message.data, ...prev];
                            return newRequests.slice(0, 100);
                        });
                    }
                    break;
                case 'stats':
                    if (message.data) setStats(message.data);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        window.parent.postMessage({ type: 'ready' }, '*');

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
    };

    const formatTime = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    const statusBadge = getStatusBadgeClassName(status);
    const safePublicUrl = getSafePublicUrl(config.publicUrl);

    return (
        <div className={pageShellClassName}>
            <header className={headerClassName}>
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,transparent_30%,rgba(255,255,255,0.1)_50%,transparent_70%)]"
                    style={{ animation: 'ocean-blue-shine 3s linear infinite' }}
                />

                <div className="relative z-0">
                    <h1 className="mb-6 text-5xl font-bold tracking-tight text-white">
                        <span
                            className="mr-2 inline-block"
                            style={{ animation: 'ocean-blue-bounce 2s infinite' }}
                        >
                            🚀
                        </span>
                        Ocean Blue Dashboard
                    </h1>

                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center justify-center rounded-lg border border-white/20 bg-white/15 px-6 py-4 text-sm backdrop-blur-[10px] transition duration-250 hover:-translate-y-0.5 hover:bg-white/20">
                            <strong className="mr-2 opacity-90">Status:</strong>
                            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-bold ${statusBadge.wrapper}`}>
                                <span
                                    className={`h-2 w-2 rounded-full ${statusBadge.dot}`}
                                    style={{ animation: 'ocean-blue-status-pulse 2s infinite' }}
                                />
                                <span>{status}</span>
                            </span>
                        </div>

                        <div className="flex items-center justify-center rounded-lg border border-white/20 bg-white/15 px-6 py-4 text-sm backdrop-blur-[10px] transition duration-250 hover:-translate-y-0.5 hover:bg-white/20">
                            <strong className="mr-2 opacity-90">Public URL:</strong>
                            <a
                                href={safePublicUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-yellow-300 transition hover:text-yellow-200 hover:underline"
                            >
                                {safePublicUrl || '-'}
                            </a>
                        </div>

                        <div className="flex items-center justify-center rounded-lg border border-white/20 bg-white/15 px-6 py-4 text-sm backdrop-blur-[10px] transition duration-250 hover:-translate-y-0.5 hover:bg-white/20">
                            <strong className="mr-2 opacity-90">Local:</strong>
                            <span>localhost:{config.localPort || '-'}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className={statsGridClassName}>
                {[
                    { label: 'Total Requests', value: stats.totalRequests.toLocaleString() },
                    { label: 'Data Transferred', value: formatBytes(stats.totalDataTransferred) },
                    { label: 'Avg Response Time', value: `${stats.avgResponseTime} ms` }
                ].map((item) => (
                    <div key={item.label} className={statCardClassName}>
                        <div className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]" />
                        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-[1px] text-slate-400">{item.label}</h3>
                        <div className="bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] bg-clip-text text-5xl font-extrabold text-transparent">
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>

            <section className={requestsSectionClassName}>
                <div className="shrink-0 border-b border-[rgba(102,126,234,0.2)] bg-[rgba(102,126,234,0.05)] px-8 py-6">
                    <h2 className="text-xl font-bold text-slate-100">📊 Request Log</h2>
                </div>

                <div className={requestsContainerClassName}>
                    {requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 px-8 py-12 text-center">
                            <div className="text-5xl text-white/30">⏳</div>
                            <p className="max-w-md text-xl text-slate-300">Waiting for requests...</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10 bg-[rgba(15,20,25,0.5)]">
                                <tr>
                                    {['Time', 'Method', 'Path', 'Status', 'IP', 'Size', 'Duration'].map((header) => (
                                        <th
                                            key={header}
                                            className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.5px] text-slate-400"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req, index) => (
                                    <tr
                                        key={`${req.timestamp}-${index}`}
                                        className="transition duration-150 hover:bg-[rgba(102,126,234,0.08)]"
                                        style={index === 0 ? { animation: 'ocean-blue-request-slide-in 250ms cubic-bezier(0.4, 0, 0.2, 1)' } : undefined}
                                    >
                                        <td className="border-t border-[rgba(102,126,234,0.1)] px-6 py-4 text-[13px] text-slate-400">
                                            {formatTime(req.timestamp)}
                                        </td>
                                        <td className="border-t border-[rgba(102,126,234,0.1)] px-6 py-4 text-[14px]">
                                            <span className={`inline-block rounded-[6px] px-4 py-1.5 text-[11px] font-bold tracking-[0.5px] text-white ${getMethodClassName(req.method)}`}>
                                                {req.method}
                                            </span>
                                        </td>
                                        <td className="border-t border-[rgba(102,126,234,0.1)] px-6 py-4 font-mono text-sm text-slate-200">
                                            {req.path}
                                        </td>
                                        <td className={`border-t border-[rgba(102,126,234,0.1)] px-6 py-4 text-[15px] font-bold ${getStatusTextClassName(req.status)}`}>
                                            {req.status}
                                        </td>
                                        <td className="border-t border-[rgba(102,126,234,0.1)] px-6 py-4 font-mono text-[13px] text-violet-300">
                                            {req.ip}
                                        </td>
                                        <td className="border-t border-[rgba(102,126,234,0.1)] px-6 py-4 text-[13px] text-slate-400">
                                            {formatBytes(req.requestSize + req.responseSize)}
                                        </td>
                                        <td className="border-t border-[rgba(102,126,234,0.1)] px-6 py-4 text-[13px] font-semibold text-indigo-400">
                                            {req.timeMs} ms
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    );
};

export default TunnelStats;
