import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCheck,
  FaCopy,
  FaExternalLinkAlt,
  FaKey,
  FaPlus
} from 'react-icons/fa';
import { toast } from '@baejino/react-ui/toast';
import { useAuthStore } from '~/features/auth';
import TokenCreationModal from '~/features/dashboard/components/TokenCreationModal';
import { useTokens, useCreateToken, useAllSessions } from '~/shared/services/api';
import type { CreatedTunnelToken, TunnelToken } from '~/shared/services/api';
import { Button, Card, IconButton, SearchField, SegmentedControl } from '~/shared/ui';
import { formatDate } from '~/shared/utils/date';

const PAGE_SHELL = 'text-slate-950';
const PAGE_CONTAINER = 'flex w-full flex-col gap-6';

const FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Idle', value: 'idle' }
] as const;

type FilterValue = (typeof FILTER_OPTIONS)[number]['value'];

function getTimestamp(value?: string | null) {
  return value ? new Date(value).getTime() || 0 : 0;
}

function CopyButton({
  copied,
  onClick,
  title
}: {
  copied: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <IconButton
      aria-label={title}
      className={copied ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : undefined}
      onClick={onClick}
      title={title}
    >
      {copied ? <FaCheck /> : <FaCopy />}
    </IconButton>
  );
}

function CommandRow({
  label,
  value,
  copied,
  onCopy,
  action
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="min-w-0 border-t border-sky-100 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <CopyButton copied={copied} onClick={onCopy} title={`Copy ${label}`} />
        </div>
      </div>
      <code className="block max-w-full min-w-0 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-950 px-4 py-3 text-sm leading-6 text-sky-100 [overflow-wrap:anywhere]">
        {value}
      </code>
    </div>
  );
}

function TokenSessionCount({
  density = 'default',
  token
}: {
  density?: 'compact' | 'default';
  token: TunnelToken;
}) {
  const sessionCount = Math.max(0, token.currentTunnels || 0);
  const hasSessions = sessionCount > 0;
  const isCompact = density === 'compact';

  return (
    <div className={`flex min-w-0 items-center ${isCompact ? 'gap-2.5' : 'gap-3'}`}>
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full border font-semibold ${
          isCompact ? 'h-8 min-w-8 px-2 text-xs' : 'h-10 min-w-10 px-3 text-sm'
        } ${
          hasSessions ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-sky-100 bg-sky-50 text-sky-700'
        }`}
      >
        {sessionCount}
      </span>
      <div className="min-w-0">
        <p className={isCompact ? 'text-[13px] font-medium text-slate-800' : 'text-sm font-semibold text-slate-800'}>
          {sessionCount === 1 ? '1 session' : `${sessionCount} sessions`}
        </p>
        <p className={isCompact ? 'mt-0.5 text-[11px] text-slate-500' : 'mt-0.5 text-xs text-slate-500'}>
          {hasSessions ? 'currently running' : 'none running'}
        </p>
      </div>
    </div>
  );
}

function MobileTokenCard({ token }: { token: TunnelToken }) {
  return (
    <Card as="article" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link className="block truncate text-base font-semibold text-slate-950 hover:text-sky-700" to={`/tokens/${token.id}`}>
            {token.name}
          </Link>
          <p className="mt-1 text-xs text-slate-500">{token.lastUsed ? formatDate(token.lastUsed) : 'Never used'}</p>
        </div>
      </div>

      <div className="mt-4">
        <TokenSessionCount token={token} />
      </div>

      <Link
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-sky-100 bg-white/70 px-3 text-sm font-semibold text-sky-800 backdrop-blur-xl transition hover:border-sky-200 hover:bg-sky-50/90"
        to={`/tokens/${token.id}`}
      >
        Sessions
        <FaExternalLinkAlt className="text-xs" />
      </Link>
    </Card>
  );
}

function RunningSessionsSummary({
  isLoading,
  sessionCount
}: {
  isLoading: boolean;
  sessionCount: number;
}) {
  const sessionLabel = sessionCount === 1 ? '1 running session' : `${sessionCount} running sessions`;

  return (
    <Card as="section" className="min-w-0 p-3.5 sm:p-4" aria-label="Running sessions">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current tunnels</p>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-3">
            <Link
              className="inline-flex h-9 items-center gap-2.5 rounded-full border border-sky-100 bg-white/65 px-3 text-sm font-semibold text-slate-900 backdrop-blur-xl transition hover:border-sky-200 hover:bg-white/85 focus:outline-none focus:ring-4 focus:ring-sky-100"
              to="/sessions"
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
              {isLoading ? 'Checking sessions' : sessionLabel}
              <FaExternalLinkAlt className="text-xs text-slate-500" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

const TunnelTokens = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState<FilterValue>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedValueKey, setCopiedValueKey] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<CreatedTunnelToken | null>(null);

  const { data, isLoading } = useTokens();
  const tokensData: TunnelToken[] = (data?.tunnelTokens || []) as TunnelToken[];
  const { data: sessionsData, isLoading: sessionsLoading } = useAllSessions();
  const activeSessionCount = useMemo(() => {
    return (sessionsData?.tunnelSessions || []).filter((session) => session.isActive).length;
  }, [sessionsData]);
  const { mutateAsync: createTokenMutation } = useCreateToken();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      window.location.assign('/login?redirectTo=%2F');
    }
  }, [isAuthenticated, isAuthLoading]);

  const filteredTokens = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tokensData
      .filter((token) => {
        if (!normalizedQuery) return true;

        return [
          token.name,
          token.tokenPreview || '',
          token.lastUsed || '',
          token.createdAt
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .filter((token) => {
        if (sessionFilter === 'running') return token.currentTunnels > 0;
        if (sessionFilter === 'idle') return token.currentTunnels === 0;
        return true;
      })
      .sort((a, b) => {
        const connectedDelta = Number(b.currentTunnels > 0) - Number(a.currentTunnels > 0);
        if (connectedDelta !== 0) return connectedDelta;

        const sessionDelta = b.currentTunnels - a.currentTunnels;
        if (sessionDelta !== 0) return sessionDelta;

        return getTimestamp(b.lastUsed || b.createdAt) - getTimestamp(a.lastUsed || a.createdAt);
      });
  }, [query, sessionFilter, tokensData]);

  const hasAnyTokens = tokensData.length > 0;

  const handleCreateToken = async (name: string, maxTunnels: number) => {
    setError(null);
    try {
      const result = await createTokenMutation({
        name,
        maxTunnels
      });
      setCreatedToken(result.createTunnelToken);
      setIsModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tunnel key';
      setError(message);
      toast.error(message);
    }
  };

  const handleCopyValue = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValueKey(key);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedValueKey(null), 2000);
    } catch {
      const message = 'Failed to copy text to the clipboard.';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className={PAGE_SHELL}>
      <main className={PAGE_CONTAINER}>
        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        {createdToken ? (
          <section className="min-w-0 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-[0_18px_50px_-34px_rgba(16,185,129,0.6)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">New tunnel key</p>
                <h2 className="mt-1 text-base font-semibold text-slate-950">Copy this key now</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-800">
                  This full key is shown only once. Copy it before closing this message.
                </p>
              </div>
              <Button className="shrink-0 self-start" onClick={() => setCreatedToken(null)} size="sm" variant="ghost">
                I copied it
              </Button>
            </div>
            <div className="mt-4 min-w-0">
              <CommandRow
                copied={copiedValueKey === 'created-token'}
                label="Tunnel key"
                onCopy={() => handleCopyValue(createdToken.plainToken, 'created-token')}
                value={createdToken.plainToken}
              />
            </div>
          </section>
        ) : null}

        <RunningSessionsSummary isLoading={sessionsLoading} sessionCount={activeSessionCount} />

        <Card as="section" aria-label="Tunnel keys" className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-sky-100/80 p-3.5 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            <SearchField className="sm:w-72" onChange={(event) => setQuery(event.target.value)} placeholder="Search keys" value={query} />

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <SegmentedControl options={FILTER_OPTIONS} value={sessionFilter} onChange={setSessionFilter} />
              <Button className="shrink-0" onClick={() => setIsModalOpen(true)} size="sm" variant="primary">
                <FaPlus className="text-[11px]" />
                Create key
              </Button>
            </div>
          </div>
          <div>
            {isLoading ? (
              <div className="flex items-center gap-3 px-5 py-10 text-sm text-slate-600">
                <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-sky-100 border-t-sky-500" />
                Loading keys
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-2xl text-sky-600 ring-1 ring-sky-100">
                  <FaKey />
                </div>
                {hasAnyTokens ? (
                  <>
                    <h3 className="mt-4 text-base font-semibold text-slate-950">No matching keys</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                      Try a different search term or switch the session filter.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="mt-4 text-base font-semibold text-slate-950">Create your first tunnel key</h3>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
                      Tunnel keys let the CLI connect this server to your local app. Create one, copy the key once, then run the proxy command from the guide.
                    </p>
                  </>
                )}
                <div className="mt-5">
                  <Button onClick={() => setIsModalOpen(true)} variant="primary">
                    <FaPlus />
                    Create key
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full table-fixed divide-y divide-sky-100 bg-transparent">
                    <thead className="bg-sky-50/35 backdrop-blur-xl">
                      <tr>
                        <th className="w-[50%] px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Name</th>
                        <th className="w-[28%] px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sessions</th>
                        <th className="w-[14%] px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last used</th>
                        <th className="w-[8%] px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100 bg-transparent">
                      {filteredTokens.map((token) => (
                        <tr className="transition hover:bg-white/35" key={token.id}>
                          <td className="px-5 py-3.5">
                            <Link className="block truncate text-sm font-semibold text-slate-950 hover:text-sky-700" to={`/tokens/${token.id}`}>
                              {token.name}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5">
                            <TokenSessionCount density="compact" token={token} />
                          </td>
                          <td className="px-5 py-3.5 text-xs font-medium text-slate-500">
                            {token.lastUsed ? formatDate(token.lastUsed) : 'Never'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              className="inline-flex h-8 items-center justify-center rounded-full border border-sky-100 bg-white/65 px-2.5 text-xs font-semibold text-sky-800 backdrop-blur-xl transition hover:border-sky-200 hover:bg-sky-50/90"
                              to={`/tokens/${token.id}`}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 p-3 lg:hidden">
                  {filteredTokens.map((token) => (
                    <MobileTokenCard key={token.id} token={token} />
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        <TokenCreationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreateToken={handleCreateToken}
        />
      </main>
    </div>
  );
};

export default TunnelTokens;
