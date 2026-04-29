export function getDashboardHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ocean Blue Tunnel Dashboard</title>
    <style>
        :root {
            color-scheme: light;
            --bg: #f0f9ff;
            --surface: rgba(255, 255, 255, 0.72);
            --surface-soft: rgba(240, 249, 255, 0.62);
            --surface-strong: rgba(224, 242, 254, 0.66);
            --border: rgba(186, 230, 253, 0.78);
            --border-strong: rgba(14, 165, 233, 0.34);
            --text: #0f172a;
            --muted: #64748b;
            --soft: #334155;
            --brand: #0ea5e9;
            --brand-strong: #0284c7;
            --green: #059669;
            --amber: #d97706;
            --red: #e11d48;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100vh;
            padding: 28px 20px;
            background:
                radial-gradient(circle at 12% 10%, rgba(125, 211, 252, 0.38), transparent 30%),
                radial-gradient(circle at 88% 6%, rgba(34, 211, 238, 0.22), transparent 28%),
                radial-gradient(circle at 76% 92%, rgba(186, 230, 253, 0.48), transparent 30%),
                linear-gradient(135deg, #f0f9ff 0%, #ecfeff 58%, #ffffff 100%);
            color: var(--text);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .shell {
            display: grid;
            width: min(100%, 1040px);
            margin: 0 auto;
            gap: 14px;
        }

        .topbar,
        .card,
        .requests {
            border: 1px solid var(--border);
            border-radius: 28px;
            background: var(--surface);
            box-shadow: 0 18px 60px -36px rgba(14, 165, 233, 0.46);
            backdrop-filter: blur(18px);
        }

        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 16px 18px;
        }

        .brand {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 14px;
        }

        .logo {
            display: grid;
            width: 40px;
            height: 40px;
            flex: 0 0 auto;
            place-items: center;
            border-radius: 18px 22px 18px 22px;
            background: rgba(255, 255, 255, 0.64);
            color: var(--brand);
            font-weight: 800;
            box-shadow:
                inset 0 0 0 1px rgba(186, 230, 253, 0.9),
                0 14px 36px -24px rgba(14, 165, 233, 0.85);
        }

        h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 760;
            line-height: 1.2;
            letter-spacing: 0;
        }

        .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            flex: 0 0 auto;
            border: 1px solid var(--border);
            border-radius: 999px;
            background: var(--surface-soft);
            padding: 8px 12px;
            color: var(--brand-strong);
            font-size: 13px;
            font-weight: 700;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: var(--amber);
            box-shadow: 0 0 18px currentColor;
        }

        .status.connected .status-dot { background: var(--green); }
        .status.reconnecting .status-dot { background: var(--amber); }
        .status.error .status-dot,
        .status.disconnected .status-dot { background: var(--red); }

        .summary {
            display: grid;
            grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.6fr);
            gap: 14px;
        }

        .card {
            min-width: 0;
            padding: 16px;
        }

        .label {
            margin: 0;
            color: var(--muted);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .value {
            margin: 10px 0 0;
            overflow: hidden;
            color: var(--text);
            font-size: 18px;
            font-weight: 700;
            line-height: 1.25;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .value-link {
            display: inline-block;
            max-width: 100%;
            overflow: hidden;
            color: var(--text);
            text-decoration: none;
            text-overflow: ellipsis;
            vertical-align: top;
            white-space: nowrap;
        }

        .value-link:hover {
            color: var(--brand);
            text-decoration: underline;
            text-underline-offset: 4px;
        }

        .meta {
            margin: 8px 0 0;
            overflow: hidden;
            color: var(--muted);
            font-size: 13px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .requests {
            display: grid;
            min-height: 0;
            grid-template-rows: auto auto auto;
            overflow: hidden;
        }

        .requests-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 1px solid var(--border);
            padding: 16px 18px;
        }

        .requests-title {
            margin: 0;
            font-size: 16px;
            font-weight: 800;
        }

        .requests-count {
            color: var(--muted);
            font-size: 13px;
        }

        .footer-meta {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: var(--muted);
            font-size: 13px;
        }

        .footer-divider {
            width: 4px;
            height: 4px;
            border-radius: 999px;
            background: var(--border-strong);
        }

        .table-wrap {
            min-height: 0;
            overflow-x: auto;
            overflow-y: visible;
            background: rgba(255, 255, 255, 0.44);
        }

        .log-row {
            display: grid;
            grid-template-columns: 110px 90px minmax(220px, 1fr) 90px 140px 110px 100px;
            min-width: 980px;
            border-bottom: 1px solid rgba(186, 230, 253, 0.68);
        }

        .log-head {
            background: var(--surface-strong);
        }

        .log-cell {
            display: flex;
            min-width: 0;
            min-height: 46px;
            align-items: center;
            overflow: hidden;
            padding: 13px 16px;
            color: var(--soft);
            font-size: 13px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .log-head .log-cell {
            color: var(--muted);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.06em;
            min-height: 40px;
            text-transform: uppercase;
        }

        .log-text {
            display: block;
            min-width: 0;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .pill {
            display: inline-flex;
            min-width: 54px;
            max-width: 100%;
            overflow: hidden;
            justify-content: center;
            border-radius: 999px;
            padding: 5px 9px;
            font-size: 12px;
            font-weight: 800;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .method { background: rgba(14, 165, 233, 0.1); color: var(--brand-strong); }
        .status-code.ok { background: rgba(16, 185, 129, 0.12); color: var(--green); }
        .status-code.redirect { background: rgba(14, 165, 233, 0.1); color: var(--brand-strong); }
        .status-code.warn { background: rgba(245, 158, 11, 0.12); color: var(--amber); }
        .status-code.error { background: rgba(244, 63, 94, 0.12); color: var(--red); }

        .empty {
            display: grid;
            min-height: 240px;
            place-items: center;
            color: var(--muted);
            font-size: 15px;
        }

        .requests-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            border-top: 1px solid var(--border);
            background: var(--surface);
            padding: 12px 18px;
        }

        .pager {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .pager button {
            height: 34px;
            border: 1px solid var(--border);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.68);
            color: var(--brand-strong);
            cursor: pointer;
            font-size: 12px;
            font-weight: 800;
            padding: 0 13px;
        }

        .pager button:hover:not(:disabled) {
            border-color: var(--border-strong);
            background: #f0f9ff;
            color: #075985;
        }

        .pager button:disabled {
            cursor: not-allowed;
            opacity: 0.42;
        }

        .page-label {
            min-width: 92px;
            color: var(--muted);
            font-size: 12px;
            text-align: center;
        }

        @media (max-width: 860px) {
            body { padding: 14px; }
            .topbar { align-items: flex-start; flex-direction: column; }
            .summary { grid-template-columns: 1fr; }
            .value { font-size: 18px; }
            .requests-header,
            .requests-footer {
                align-items: flex-start;
                flex-direction: column;
            }
            .pager {
                width: 100%;
                overflow-x: auto;
            }
        }
    </style>
</head>
<body>
    <main class="shell">
        <header class="topbar">
            <div class="brand">
                <div class="logo">OB</div>
                <div>
                    <h1>Ocean Blue</h1>
                </div>
            </div>
            <div id="status" class="status">
                <span class="status-dot"></span>
                <span id="status-text">connecting</span>
            </div>
        </header>

        <section class="summary" aria-label="Tunnel summary">
            <article class="card">
                <p class="label">Public URL</p>
                <p class="value"><a class="value-link" id="public-url" href="#" target="_blank" rel="noreferrer">-</a></p>
                <p class="meta" id="subdomain">-</p>
            </article>
            <article class="card">
                <p class="label">Local app</p>
                <p class="value" id="local-port">-</p>
            </article>
        </section>

        <section class="requests">
            <div class="requests-header">
                <h2 class="requests-title">Request log</h2>
                <span class="requests-count" id="request-count">0 entries</span>
            </div>
            <div class="table-wrap">
                <div class="log-row log-head" role="row">
                    <div class="log-cell" role="columnheader">Time</div>
                    <div class="log-cell" role="columnheader">Method</div>
                    <div class="log-cell" role="columnheader">Path</div>
                    <div class="log-cell" role="columnheader">Status</div>
                    <div class="log-cell" role="columnheader">IP</div>
                    <div class="log-cell" role="columnheader">Size</div>
                    <div class="log-cell" role="columnheader">Duration</div>
                </div>
                <div id="request-rows"></div>
                <div id="empty" class="empty">Waiting for requests</div>
            </div>
            <div class="requests-footer">
                <div class="footer-meta">
                    <span id="page-count">10 per page</span>
                    <span class="footer-divider" aria-hidden="true"></span>
                    <span>Traffic <span id="total-data">0 B</span></span>
                </div>
                <div class="pager" aria-label="Request log pagination">
                    <button id="first-page" type="button">First</button>
                    <button id="prev-page" type="button">Prev</button>
                    <span class="page-label" id="page-label">Page 1 of 1</span>
                    <button id="next-page" type="button">Next</button>
                    <button id="last-page" type="button">Last</button>
                </div>
            </div>
        </section>
    </main>

    <script>
        const state = {
            config: {},
            status: 'connecting',
            stats: {
                totalRequests: 0,
                totalDataTransferred: 0,
                avgResponseTime: 0
            },
            requests: [],
            page: 0
        };

        const elements = {
            status: document.getElementById('status'),
            statusText: document.getElementById('status-text'),
            publicUrl: document.getElementById('public-url'),
            subdomain: document.getElementById('subdomain'),
            localPort: document.getElementById('local-port'),
            totalData: document.getElementById('total-data'),
            requestCount: document.getElementById('request-count'),
            pageCount: document.getElementById('page-count'),
            pageLabel: document.getElementById('page-label'),
            firstPage: document.getElementById('first-page'),
            prevPage: document.getElementById('prev-page'),
            nextPage: document.getElementById('next-page'),
            lastPage: document.getElementById('last-page'),
            requestRows: document.getElementById('request-rows'),
            empty: document.getElementById('empty')
        };

        const PAGE_SIZE = 10;

        function escapeHtml(value) {
            return String(value ?? '')
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');
        }

        function formatBytes(bytes) {
            if (!bytes) return '0 B';
            const units = ['B', 'KB', 'MB', 'GB'];
            const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
            const value = bytes / Math.pow(1024, index);
            return Math.round(value * 100) / 100 + ' ' + units[index];
        }

        function formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString();
        }

        function getStatusClass(statusCode) {
            if (statusCode >= 500) return 'error';
            if (statusCode >= 400) return 'warn';
            if (statusCode >= 300) return 'redirect';
            return 'ok';
        }

        function render() {
            renderSummary();
            renderRows();
        }

        function renderSummary() {
            const status = state.status || 'connecting';
            const publicUrl = state.config.publicUrl || '';
            elements.status.className = 'status ' + status;
            elements.statusText.textContent = status;
            elements.publicUrl.textContent = publicUrl || '-';
            elements.publicUrl.href = publicUrl || '#';
            elements.publicUrl.removeAttribute('aria-disabled');
            if (!publicUrl) {
                elements.publicUrl.setAttribute('aria-disabled', 'true');
            }
            elements.subdomain.textContent = state.config.subdomain ? state.config.subdomain + ' subdomain' : '-';
            elements.localPort.textContent = state.config.localPort ? 'localhost:' + state.config.localPort : '-';
            elements.totalData.textContent = formatBytes(state.stats.totalDataTransferred || 0);
            elements.empty.style.display = state.requests.length ? 'none' : 'grid';
        }

        function renderRows() {
            const totalRows = state.requests.length;
            const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

            if (!Number.isFinite(state.page) || state.page < 0) {
                state.page = 0;
            }

            if (state.page >= totalPages) {
                state.page = totalPages - 1;
            }

            const start = state.page * PAGE_SIZE;
            const end = Math.min(totalRows, start + PAGE_SIZE);
            const visibleRequests = state.requests.slice(start, end);

            elements.requestCount.textContent = totalRows
                ? 'Showing ' + (start + 1) + '-' + end + ' of ' + totalRows
                : '0 entries';
            elements.pageCount.textContent = PAGE_SIZE + ' per page';
            elements.pageLabel.textContent = 'Page ' + (state.page + 1) + ' of ' + totalPages;
            elements.firstPage.disabled = state.page === 0;
            elements.prevPage.disabled = state.page === 0;
            elements.nextPage.disabled = state.page >= totalPages - 1;
            elements.lastPage.disabled = state.page >= totalPages - 1;

            elements.requestRows.innerHTML = visibleRequests.map((request) => {
                const statusClass = getStatusClass(request.status || 0);
                const size = formatBytes((request.requestSize || 0) + (request.responseSize || 0));

                return '<div class="log-row" role="row">' +
                    '<div class="log-cell"><span class="log-text">' + escapeHtml(formatTime(request.timestamp)) + '</span></div>' +
                    '<div class="log-cell"><span class="pill method">' + escapeHtml(request.method || '-') + '</span></div>' +
                    '<div class="log-cell"><span class="log-text path" title="' + escapeHtml(request.path || '/') + '">' + escapeHtml(request.path || '/') + '</span></div>' +
                    '<div class="log-cell"><span class="pill status-code ' + statusClass + '">' + escapeHtml(request.status || '-') + '</span></div>' +
                    '<div class="log-cell"><span class="log-text ip" title="' + escapeHtml(request.ip || '-') + '">' + escapeHtml(request.ip || '-') + '</span></div>' +
                    '<div class="log-cell"><span class="log-text">' + escapeHtml(size) + '</span></div>' +
                    '<div class="log-cell"><span class="log-text">' + escapeHtml(request.timeMs || 0) + ' ms</span></div>' +
                '</div>';
            }).join('');
        }

        function applyMessage(message) {
            if (!message || !message.type) return;

            if (message.type === 'init' && message.data) {
                state.config = message.data.config || {};
                state.status = message.data.status || state.status;
                state.stats = message.data.stats || state.stats;
                state.requests = (message.data.requests || []).slice(0, 5000);
                state.page = 0;
            }

            if (message.type === 'status' && message.data) {
                state.status = message.data;
            }

            if (message.type === 'request' && message.data) {
                state.requests = [message.data, ...state.requests].slice(0, 5000);
            }

            if (message.type === 'stats' && message.data) {
                state.stats = message.data;
            }

            render();
        }

        render();

        elements.firstPage.addEventListener('click', () => {
            state.page = 0;
            renderRows();
        });

        elements.prevPage.addEventListener('click', () => {
            state.page = Math.max(0, state.page - 1);
            renderRows();
        });

        elements.nextPage.addEventListener('click', () => {
            const totalPages = Math.max(1, Math.ceil(state.requests.length / PAGE_SIZE));
            state.page = Math.min(totalPages - 1, state.page + 1);
            renderRows();
        });

        elements.lastPage.addEventListener('click', () => {
            const totalPages = Math.max(1, Math.ceil(state.requests.length / PAGE_SIZE));
            state.page = totalPages - 1;
            renderRows();
        });

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(wsProtocol + '//' + window.location.host);

        ws.onmessage = (event) => {
            try {
                applyMessage(JSON.parse(event.data));
            } catch {
                // Ignore invalid dashboard messages.
            }
        };

        ws.onclose = () => {
            state.status = 'disconnected';
            render();
        };

        ws.onerror = () => {
            state.status = 'error';
            render();
        };
    </script>
</body>
</html>`;
}
