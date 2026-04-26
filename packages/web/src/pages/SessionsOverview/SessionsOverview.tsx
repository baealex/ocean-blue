import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaServer } from 'react-icons/fa';

import { useAuthStore } from '~/features/auth';
import TunnelSessionsTable from '~/features/dashboard/components/TunnelSessionsTable';
import { useAllSessions } from '~/shared/services/api';
import { Card, SearchField } from '~/shared/ui';

const PAGE_SHELL = 'text-slate-950';
const PAGE_CONTAINER = 'flex w-full flex-col gap-6';

function getTimestamp(value?: string | null) {
  return value ? new Date(value).getTime() || 0 : 0;
}

const SessionsOverview = () => {
  const location = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const { data, isLoading } = useAllSessions();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      window.location.assign(`/login?redirectTo=${encodeURIComponent(location.pathname)}`);
    }
  }, [isAuthenticated, isAuthLoading, location.pathname]);

  const sessions = useMemo(() => {
    return [...(data?.tunnelSessions || [])]
      .filter((session) => session.isActive)
      .sort((a, b) => getTimestamp(b.lastActive) - getTimestamp(a.lastActive));
  }, [data]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sessions;

    return sessions.filter((session) => {
      return [
        session.subdomain,
        session.tunnelToken?.name || '',
        session.clientIp || '',
        session.clientVersion || ''
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [query, sessions]);

  const runningCount = sessions.length;
  const runningLabel = runningCount === 1 ? '1 running session' : `${runningCount} running sessions`;

  return (
    <div className={PAGE_SHELL}>
      <main className={PAGE_CONTAINER}>
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-full border border-sky-100 bg-white/55 px-3 text-sm font-semibold text-sky-800 backdrop-blur-xl transition hover:border-sky-200 hover:bg-white/75 focus:outline-none focus:ring-4 focus:ring-sky-100"
            to="/"
          >
            <FaArrowLeft className="text-xs" />
            Tunnel keys
          </Link>
        </div>

        <Card as="section" className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-sky-100/80 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">Sessions</h1>
              <p className="mt-1 text-sm text-slate-500">{isLoading ? 'Checking sessions' : runningLabel}</p>
            </div>

            <SearchField className="sm:w-80" onChange={(event) => setQuery(event.target.value)} placeholder="Search sessions" value={query} />
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 px-5 py-10 text-sm text-slate-600">
              <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-sky-100 border-t-sky-500" />
              Loading sessions
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-2xl text-sky-600 ring-1 ring-sky-100">
                <FaServer />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-950">No running sessions</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
                Running CLI sessions will appear here with their assigned subdomains.
              </p>
            </div>
          ) : (
            <TunnelSessionsTable sessions={filteredSessions} showKey />
          )}
        </Card>
      </main>
    </div>
  );
};

export default SessionsOverview;
