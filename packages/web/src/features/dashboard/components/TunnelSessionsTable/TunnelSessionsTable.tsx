import { Link } from 'react-router-dom';
import { FaExternalLinkAlt } from 'react-icons/fa';

import type { TunnelSession } from '~/shared/services/api';
import { formatDate } from '~/shared/utils/date';

function getSessionUrl(subdomain: string) {
  if (typeof window === 'undefined') return undefined;

  const normalized = subdomain.trim();
  if (!normalized) return undefined;
  if (/^https?:\/\//.test(normalized)) return normalized;

  const { hostname, port, protocol } = window.location;
  const proxyHost = hostname === '127.0.0.1' ? 'localhost' : hostname || 'localhost';
  const host = normalized.includes('.') ? normalized : `${normalized}.${proxyHost}`;
  const portSuffix = normalized.includes('.') ? '' : port ? `:${port}` : '';

  return `${protocol}//${host}${portSuffix}`;
}

function SessionLink({ subdomain }: { subdomain: string }) {
  const href = getSessionUrl(subdomain);

  if (!href) {
    return <span className="font-mono text-sm font-semibold text-slate-950">{subdomain}</span>;
  }

  return (
    <a
      className="inline-flex max-w-full items-center gap-2 text-sm font-semibold text-sky-800 transition hover:text-sky-950"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <span className="min-w-0 truncate font-mono">{subdomain}</span>
      <FaExternalLinkAlt className="shrink-0 text-[10px]" />
    </a>
  );
}

function KeyLink({ session }: { session: TunnelSession }) {
  const token = session.tunnelToken;

  if (!token) {
    return <span className="text-sm text-slate-600">Unknown key</span>;
  }

  return (
    <Link className="block truncate text-sm font-semibold text-sky-800 hover:text-sky-950" to={`/tokens/${token.id}`}>
      {token.name}
    </Link>
  );
}

function ClientCell({ session }: { session: TunnelSession }) {
  return (
    <>
      <p className="truncate">{session.clientIp || 'Unknown IP'}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{session.clientVersion || 'Unknown version'}</p>
    </>
  );
}

function MobileSessionCard({
  session,
  showCreatedAt,
  showKey
}: {
  session: TunnelSession;
  showCreatedAt: boolean;
  showKey: boolean;
}) {
  return (
    <article className="rounded-3xl border border-sky-100/80 bg-white/45 p-4 backdrop-blur-xl md:hidden">
      <div className="min-w-0">
        <SessionLink subdomain={session.subdomain} />
        <p className="mt-1 text-xs text-slate-500">Last active {formatDate(session.lastActive)}</p>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {showKey ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Key</dt>
            <dd className="mt-1">
              <KeyLink session={session} />
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Client</dt>
          <dd className="mt-1 text-sm text-slate-700">
            <ClientCell session={session} />
          </dd>
        </div>
        {showCreatedAt ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Created</dt>
            <dd className="mt-1 text-sm text-slate-700">{formatDate(session.createdAt)}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function TunnelSessionsTable({
  sessions,
  showCreatedAt = false,
  showKey = false
}: {
  sessions: TunnelSession[];
  showCreatedAt?: boolean;
  showKey?: boolean;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full table-fixed divide-y divide-sky-100 bg-transparent">
          <thead className="bg-sky-50/45 backdrop-blur-xl">
            <tr>
              <th className={`${showKey ? 'w-[34%]' : 'w-[40%]'} px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500`} scope="col">
                Subdomain
              </th>
              {showKey ? (
                <th className="w-[26%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500" scope="col">
                  Key
                </th>
              ) : null}
              <th className={`${showKey ? 'w-[20%]' : 'w-[28%]'} px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500`} scope="col">
                Last active
              </th>
              <th className={`${showKey ? 'w-[20%]' : 'w-[32%]'} px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500`} scope="col">
                Client
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100 bg-transparent">
            {sessions.map((session) => (
              <tr className="align-top transition hover:bg-white/35" key={session.id}>
                <td className="px-5 py-4">
                  <SessionLink subdomain={session.subdomain} />
                  {showCreatedAt ? <p className="mt-1 text-xs text-slate-500">Created {formatDate(session.createdAt)}</p> : null}
                </td>
                {showKey ? (
                  <td className="px-5 py-4">
                    <KeyLink session={session} />
                  </td>
                ) : null}
                <td className="px-5 py-4 text-sm text-slate-700">{formatDate(session.lastActive)}</td>
                <td className="px-5 py-4 text-sm text-slate-700">
                  <ClientCell session={session} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {sessions.map((session) => (
          <MobileSessionCard key={session.id} session={session} showCreatedAt={showCreatedAt} showKey={showKey} />
        ))}
      </div>
    </>
  );
}

export default TunnelSessionsTable;
