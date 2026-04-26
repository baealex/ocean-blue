import { useEffect, type ReactNode, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaKey, FaServer, FaSpinner, FaTrash } from 'react-icons/fa';
import { useModal } from '@baejino/react-ui/modal';
import { toast } from '@baejino/react-ui/toast';
import { useAuthStore } from '~/features/auth';
import TunnelSessionsTable from '~/features/dashboard/components/TunnelSessionsTable';
import { useDeleteToken, useSessions, useTokenById } from '~/shared/services/api';
import type { TunnelSession, TunnelToken } from '~/shared/services/api';
import { Badge, Button, Card, Tag, Text } from '~/shared/ui';
import { formatDate } from '~/shared/utils/date';

const PAGE_SHELL = 'text-slate-950';
const PAGE_CONTAINER = 'flex w-full flex-col gap-6';

function InfoItem({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <Text variant="label">{label}</Text>
      <div className="mt-2 min-w-0 text-sm font-semibold text-slate-800">{value}</div>
      {hint ? <Text className="mt-2 text-xs leading-5" variant="muted">{hint}</Text> : null}
    </div>
  );
}

const SessionDetails = () => {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const modal = useModal();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading: tokenLoading } = useTokenById(tokenId || '');
  const token = data?.tunnelToken as TunnelToken | undefined;

  const { data: sessionsData, isLoading: sessionsLoading } = useSessions(tokenId || '');
  const sessions = sessionsData?.tunnelSessionsByToken as TunnelSession[] | undefined;

  const { mutateAsync: deleteTokenMutation } = useDeleteToken();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      window.location.assign(`/login?redirectTo=${encodeURIComponent(location.pathname)}`);
    }
  }, [isAuthenticated, isAuthLoading, location.pathname]);

  const handleDeleteToken = async () => {
    try {
      if (!tokenId) {
        return;
      }

      const confirmed = await modal.confirm({
        title: 'Delete this key?',
        description: 'This will revoke access for clients using this key. Connected tunnels using it will no longer be trusted.',
        confirmLabel: 'Delete key',
        cancelLabel: 'Keep key',
        tone: 'danger'
      });

      if (confirmed) {
        await deleteTokenMutation(tokenId);
        toast.success('Key deleted');
        navigate('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete key';
      setError(message);
      toast.error(message);
    }
  };

  const sortedSessions = useMemo(() => {
    return [...(sessions || [])]
      .filter((session) => session.isActive)
      .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
  }, [sessions]);

  const activeSessionCount = token?.currentTunnels || 0;
  const activeSessionLabel = activeSessionCount === 1 ? '1 running session' : `${activeSessionCount} running sessions`;
  const sessionListLabel = sortedSessions.length === 1 ? '1 running session' : `${sortedSessions.length} running sessions`;

  if (tokenLoading || sessionsLoading) {
    return (
      <div className={PAGE_SHELL}>
        <div className={PAGE_CONTAINER}>
          <Card className="flex min-h-[260px] flex-col items-center justify-center gap-4 p-5 text-center sm:p-6">
            <FaSpinner className="animate-spin text-3xl text-sky-600" />
            <div>
              <Text as="h1" className="text-xl" variant="title">Loading key details</Text>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={PAGE_SHELL}>
        <div className={PAGE_CONTAINER}>
          <Card className="p-5 sm:p-6">
            <Text as="h1" className="text-2xl" variant="title">Key not found</Text>
            <Text className="mt-3 max-w-2xl" variant="muted">This key may have already been deleted.</Text>
            <Link
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-sky-100 bg-white/70 px-4 text-sm font-semibold text-sky-800 backdrop-blur-xl transition hover:border-sky-200 hover:bg-sky-50/90 focus:outline-none focus:ring-4 focus:ring-sky-100"
              to="/"
            >
              <FaArrowLeft className="text-xs" />
              Tunnel keys
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE_SHELL}>
      <div className={PAGE_CONTAINER}>
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-full border border-sky-100 bg-white/55 px-3 text-sm font-semibold text-sky-800 backdrop-blur-xl transition hover:border-sky-200 hover:bg-white/75 focus:outline-none focus:ring-4 focus:ring-sky-100"
            to="/"
          >
            <FaArrowLeft className="text-xs" />
            Tunnel keys
          </Link>
          <Button
            className="h-10 border-rose-200 bg-white/55 px-3 text-rose-700 hover:bg-rose-50/90 focus:ring-rose-100"
            onClick={handleDeleteToken}
            variant="secondary"
          >
            <FaTrash />
            Delete key
          </Button>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        <Card as="section" className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge showDot tone={activeSessionCount > 0 ? 'success' : 'neutral'}>
                  {activeSessionCount > 0 ? 'Running' : 'Idle'}
                </Badge>
                <Tag>
                  <FaKey className="text-[10px]" />
                  Tunnel key
                </Tag>
              </div>
              <Text as="h1" className="mt-3 truncate text-2xl sm:text-3xl" variant="title">{token.name}</Text>
            </div>

            <div className="rounded-[1.75rem] border border-sky-100 bg-sky-50/55 px-5 py-4 backdrop-blur-xl lg:min-w-56">
              <Text variant="label">Current sessions</Text>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{activeSessionCount}</p>
              <Text className="mt-1" variant="muted">{activeSessionLabel}</Text>
            </div>
          </div>

          <div className="-mx-5 -mb-5 mt-5 grid divide-y divide-sky-100/80 border-t border-sky-100/80 bg-white/25 sm:-mx-6 sm:-mb-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <InfoItem
              label="Key preview"
              value={<code className="block truncate rounded-full bg-white/65 px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-sky-100">{token.tokenPreview || 'Saved securely'}</code>}
              hint="The full key is only shown once."
            />
            <InfoItem label="Created" value={formatDate(token.createdAt)} />
            <InfoItem label="Last used" value={token.lastUsed ? formatDate(token.lastUsed) : 'Never'} />
          </div>
        </Card>

        <Card as="section" className="overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Text as="h2" className="text-lg" variant="title">Sessions</Text>
              <Text className="mt-1" variant="muted">{sessionListLabel}</Text>
            </div>
          </div>

          <div className="-mx-5 -mb-5 mt-5 border-t border-sky-100/80 sm:-mx-6 sm:-mb-6">
            {sortedSessions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 text-2xl text-sky-600 ring-1 ring-sky-100">
                  <FaServer />
                </div>
                <Text as="h3" className="mt-4 text-base" variant="title">No sessions running</Text>
                <Text className="mx-auto mt-2 max-w-lg" variant="muted">
                  Start the CLI with this key to open a tunnel. Connected sessions will appear here.
                </Text>
              </div>
            ) : (
              <TunnelSessionsTable sessions={sortedSessions} showCreatedAt />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SessionDetails;
