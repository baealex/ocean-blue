import { useEffect, useMemo, useState } from 'react';
import { FaCheck, FaCopy, FaExternalLinkAlt, FaKey, FaNetworkWired, FaServer, FaTerminal } from 'react-icons/fa';
import { toast } from '@baejino/react-ui/toast';

import { useAuthStore } from '~/features/auth';

const PAGE_CONTAINER = 'flex w-full flex-col gap-6';
const PANEL = 'rounded-ocean-blue-panel border border-ocean-blue-border bg-ocean-blue-surface p-5 shadow-ocean-blue-surface backdrop-blur-xl sm:p-6';
const MINI_PANEL = 'rounded-ocean-blue-panel border border-ocean-blue-border bg-ocean-blue-surface p-5 backdrop-blur-xl';
const INLINE_PANEL = 'rounded-ocean-blue-panel border border-ocean-blue-border bg-ocean-blue-surface p-4 backdrop-blur-xl';
const ICON_BADGE = 'flex h-10 w-10 items-center justify-center rounded-2xl bg-ocean-blue-surface-strong text-ocean-blue-accent ring-1 ring-ocean-blue-border';
const DEFAULT_LOCAL_TEST_COMMAND = 'python3 -m http.server 3000';

function buildTunnelCommand(serverUrl: string) {
  return `ocean-blue proxy --server ${serverUrl} --local-port 3000 --subdomain myapp`;
}

function useProxyExamples() {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        serverUrl: '<this-page-origin>',
        proxyUrl: '<subdomain>.<this-page-host>',
        cliCommand: buildTunnelCommand('<this-page-origin>')
      };
    }

    const { origin, hostname, port, protocol } = window.location;
    const proxyHost = hostname === '127.0.0.1' ? 'localhost' : hostname || 'localhost';
    const portSuffix = port ? `:${port}` : '';

    return {
      serverUrl: origin,
      proxyUrl: `${protocol}//myapp.${proxyHost}${portSuffix}`,
      cliCommand: buildTunnelCommand(origin)
    };
  }, []);
}

function CopyCommand({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Failed to copy text to the clipboard.');
    }
  };

  return (
    <div className={`${INLINE_PANEL} min-w-0`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wider text-ocean-blue-muted">{label}</p>
        <button
          aria-label={`Copy ${label}`}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition focus:outline-none focus:ring-4 focus:ring-ocean-blue-focus ${
            copied
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-ocean-blue-border bg-ocean-blue-surface-strong text-ocean-blue-accent hover:border-ocean-blue-accent hover:bg-ocean-blue-surface'
          }`}
          onClick={handleCopy}
          type="button"
        >
          {copied ? <FaCheck /> : <FaCopy />}
        </button>
      </div>
      <code className="block max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-950 px-4 py-3 text-sm leading-6 text-sky-100 [overflow-wrap:anywhere]">
        {value}
      </code>
    </div>
  );
}

const HowToProxy = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const examples = useProxyExamples();
  const optionRows = [
    ['--server', `The Ocean Blue server URL. Use this web console origin: ${examples.serverUrl}`],
    ['--local-port', 'The port where your local app is running. Example: localhost:3000'],
    ['--subdomain', `The public subdomain to reserve. Example: myapp opens ${examples.proxyUrl}.`],
    ['--token', 'Optional. Pass a tunnel key. If omitted, the CLI uses a saved key or starts the server auth flow.']
  ];

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      window.location.assign('/login?redirectTo=%2Fhow-to-proxy');
    }
  }, [isAuthenticated, isAuthLoading]);

  return (
    <main className={PAGE_CONTAINER}>
      <section className={PANEL}>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-ocean-blue-accent">Proxy guide</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ocean-blue-text sm:text-3xl">How to proxy</h1>
          <p className="mt-3 text-sm leading-6 text-ocean-blue-muted">
            Run a local app, connect the CLI to Ocean Blue, and route public subdomain traffic back to your machine.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className={MINI_PANEL}>
          <div className={ICON_BADGE}>
            <FaServer />
          </div>
          <h2 className="mt-4 text-base font-semibold text-ocean-blue-text">1. Run local app</h2>
          <p className="mt-2 text-sm leading-6 text-ocean-blue-muted">Start the app you want to expose and keep it listening on a local port.</p>
        </article>
        <article className={MINI_PANEL}>
          <div className={ICON_BADGE}>
            <FaTerminal />
          </div>
          <h2 className="mt-4 text-base font-semibold text-ocean-blue-text">2. Start CLI</h2>
          <p className="mt-2 text-sm leading-6 text-ocean-blue-muted">The CLI opens a tunnel to the server and forwards requests to your local app.</p>
        </article>
        <article className={MINI_PANEL}>
          <div className={ICON_BADGE}>
            <FaNetworkWired />
          </div>
          <h2 className="mt-4 text-base font-semibold text-ocean-blue-text">3. Open public URL</h2>
          <p className="mt-2 text-sm leading-6 text-ocean-blue-muted">Open the assigned public URL to reach the local app through Ocean Blue.</p>
        </article>
      </section>

      <section className={`${PANEL} grid gap-4`}>
        <CopyCommand label="Local app" value={DEFAULT_LOCAL_TEST_COMMAND} />
        <CopyCommand label="CLI" value={examples.cliCommand} />
        <div className={`${INLINE_PANEL} min-w-0`}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ocean-blue-muted">Proxy URL</p>
            <a
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ocean-blue-border bg-ocean-blue-surface-strong text-ocean-blue-accent transition hover:border-ocean-blue-accent hover:bg-ocean-blue-surface focus:outline-none focus:ring-4 focus:ring-ocean-blue-focus"
              href={examples.proxyUrl}
              rel="noreferrer"
              target="_blank"
              title="Open proxy URL"
            >
              <FaExternalLinkAlt />
            </a>
          </div>
          <code className="block max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-950 px-4 py-3 text-sm leading-6 text-sky-100 [overflow-wrap:anywhere]">
            {examples.proxyUrl}
          </code>
        </div>
      </section>

      <section className={PANEL}>
        <h2 className="text-lg font-semibold text-ocean-blue-text">Command options</h2>
        <div className="mt-4 overflow-hidden rounded-ocean-blue-panel border border-ocean-blue-border bg-ocean-blue-surface backdrop-blur-xl">
          <dl className="divide-y divide-ocean-blue-border">
            {optionRows.map(([name, description]) => (
              <div className="grid gap-2 px-4 py-4 sm:grid-cols-[150px_1fr] sm:gap-4" key={name}>
                <dt className="font-mono text-sm font-semibold text-ocean-blue-accent">{name}</dt>
                <dd className="text-sm leading-6 text-ocean-blue-muted">{description}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-ocean-blue-panel border border-ocean-blue-border bg-ocean-blue-surface p-4 text-sm leading-6 text-ocean-blue-muted backdrop-blur-xl">
          <FaKey className="mt-1 shrink-0 text-ocean-blue-accent" />
          <p>
            You do not need to paste a tunnel key into every command. The CLI uses a saved key first; if none exists, it starts the server auth flow.
          </p>
        </div>
      </section>
    </main>
  );
};

export default HowToProxy;
