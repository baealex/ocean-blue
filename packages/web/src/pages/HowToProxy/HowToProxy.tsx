import { useEffect, useMemo, useState } from 'react';
import { FaCheck, FaCopy, FaExternalLinkAlt, FaKey, FaNetworkWired, FaServer, FaTerminal } from 'react-icons/fa';
import { toast } from '@baejino/react-ui/toast';

import { useAuthStore } from '~/features/auth';

const PAGE_CONTAINER = 'flex w-full flex-col gap-6';
const PANEL = 'rounded-3xl border border-sky-100/80 bg-white/60 p-5 shadow-[0_18px_60px_-36px_rgba(14,165,233,0.42)] backdrop-blur-xl sm:p-6';
const MINI_PANEL = 'rounded-3xl border border-sky-100/80 bg-white/50 p-5 backdrop-blur-xl';
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
    <div className="min-w-0 rounded-3xl border border-sky-100/80 bg-white/55 p-4 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <button
          aria-label={`Copy ${label}`}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition focus:outline-none focus:ring-4 focus:ring-sky-100 ${
            copied
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-sky-100 bg-white/70 text-sky-700 hover:border-sky-200 hover:bg-sky-50/90'
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
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Proxy guide</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">How to proxy</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Run a local app, connect the CLI to Ocean Blue, and route public subdomain traffic back to your machine.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className={MINI_PANEL}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-sky-600 ring-1 ring-sky-100">
            <FaServer />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-950">1. Run local app</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Start the app you want to expose and keep it listening on a local port.</p>
        </article>
        <article className={MINI_PANEL}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-sky-600 ring-1 ring-sky-100">
            <FaTerminal />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-950">2. Start CLI</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">The CLI opens a tunnel to the server and forwards requests to your local app.</p>
        </article>
        <article className={MINI_PANEL}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-sky-600 ring-1 ring-sky-100">
            <FaNetworkWired />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-950">3. Open public URL</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Open the assigned public URL to reach the local app through Ocean Blue.</p>
        </article>
      </section>

      <section className={`${PANEL} grid gap-4`}>
        <CopyCommand label="Local app" value={DEFAULT_LOCAL_TEST_COMMAND} />
        <CopyCommand label="CLI" value={examples.cliCommand} />
        <div className="min-w-0 rounded-3xl border border-sky-100/80 bg-white/55 p-4 backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proxy URL</p>
            <a
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-white/70 text-sky-700 transition hover:border-sky-200 hover:bg-sky-50/90 focus:outline-none focus:ring-4 focus:ring-sky-100"
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
        <h2 className="text-lg font-semibold text-slate-950">Command options</h2>
        <div className="mt-4 overflow-hidden rounded-3xl border border-sky-100/80 bg-white/45 backdrop-blur-xl">
          <dl className="divide-y divide-sky-100">
            {optionRows.map(([name, description]) => (
              <div className="grid gap-2 px-4 py-4 sm:grid-cols-[150px_1fr] sm:gap-4" key={name}>
                <dt className="font-mono text-sm font-semibold text-sky-800">{name}</dt>
                <dd className="text-sm leading-6 text-slate-600">{description}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-3xl border border-sky-100/80 bg-white/45 p-4 text-sm leading-6 text-slate-600 backdrop-blur-xl">
          <FaKey className="mt-1 shrink-0 text-sky-600" />
          <p>
            You do not need to paste a tunnel key into every command. The CLI uses a saved key first; if none exists, it starts the server auth flow.
          </p>
        </div>
      </section>
    </main>
  );
};

export default HowToProxy;
