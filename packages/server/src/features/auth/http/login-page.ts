const escapeHtml = (value: string) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

interface LoginPageParams {
    redirectTo: string;
    csrfToken: string;
    errorMessage?: string;
}

const renderErrorBlock = (errorMessage?: string) => {
    if (!errorMessage) {
        return '';
    }

    return `<div class="error" role="alert">${escapeHtml(errorMessage)}</div>`;
};

export const renderLoginPage = ({ redirectTo, csrfToken, errorMessage }: LoginPageParams) => `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ocean Blue Sign In</title>
    <style>
        :root {
            color-scheme: light;
            --page-bg:
                radial-gradient(circle at 12% 10%, rgba(125, 211, 252, 0.38), transparent 30%),
                radial-gradient(circle at 88% 6%, rgba(34, 211, 238, 0.22), transparent 28%),
                radial-gradient(circle at 76% 92%, rgba(186, 230, 253, 0.48), transparent 30%),
                linear-gradient(135deg, #f0f9ff 0%, #ecfeff 58%, #ffffff 100%);
            --surface: rgba(255, 255, 255, 0.58);
            --surface-strong: rgba(255, 255, 255, 0.74);
            --border-subtle: rgba(186, 230, 253, 0.82);
            --border-focus: #38bdf8;
            --fg-default: #0f172a;
            --fg-secondary: #475569;
            --fg-tertiary: #64748b;
            --fg-placeholder: #94a3b8;
            --fg-brand: #0369a1;
            --fg-error: #d44345;
            --accent-soft-primary: rgba(14, 165, 233, 0.14);
            --accent-soft-danger: rgba(255, 77, 79, 0.08);
            --cta: #0ea5e9;
            --cta-hover: #0284c7;
            --shadow: 0 18px 60px -36px rgba(14, 165, 233, 0.45);
            font-family: "Spoqa Han Sans Neo", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: var(--page-bg);
            color: var(--fg-default);
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
            background: var(--page-bg);
        }
        .shell { width: min(392px, 100%); }
        .brand {
            display: inline-flex;
            align-items: center;
            min-height: 40px;
            margin-bottom: 14px;
            padding: 0 14px;
            border: 1px solid var(--border-subtle);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.48);
            color: var(--fg-brand);
            font-size: 13px;
            font-weight: 700;
            line-height: 1.4;
            backdrop-filter: blur(20px);
        }
        .panel {
            padding: 30px;
            border: 1px solid var(--border-subtle);
            border-radius: 28px;
            background: var(--surface);
            box-shadow: var(--shadow);
            backdrop-filter: blur(24px);
        }
        h1 {
            margin: 0;
            color: var(--fg-default);
            font-size: 1.375rem;
            line-height: 1.3;
            font-weight: 700;
            letter-spacing: 0;
        }
        .lead {
            margin: 6px 0 24px;
            color: var(--fg-secondary);
            font-size: 0.9375rem;
            line-height: 1.6;
        }
        form { display: grid; gap: 16px; }
        .field { display: grid; gap: 8px; }
        label {
            color: var(--fg-secondary);
            font-size: 0.75rem;
            line-height: 1.4;
            font-weight: 600;
        }
        input {
            width: 100%;
            padding: 14px 18px;
            border: 1px solid var(--border-subtle);
            border-radius: 999px;
            background: var(--surface-strong);
            font-size: 16px;
            color: var(--fg-default);
            backdrop-filter: blur(16px);
            box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.02);
            transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        input::placeholder { color: var(--fg-placeholder); }
        input:focus {
            outline: none;
            background: rgba(255, 255, 255, 0.9);
            border-color: var(--border-focus);
            box-shadow: 0 0 0 4px var(--accent-soft-primary);
        }
        button {
            width: 100%;
            min-height: 52px;
            border: 1px solid transparent;
            border-radius: 999px;
            background: var(--cta);
            color: #ffffff;
            padding: 14px 18px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 16px 28px -18px rgba(14, 165, 233, 0.9);
            transition: background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
        }
        button:hover { background: var(--cta-hover); }
        button:active { transform: translateY(1px); }
        button:focus-visible {
            outline: none;
            box-shadow: 0 0 0 4px var(--accent-soft-primary);
        }
        .hint {
            margin-top: 16px;
            color: var(--fg-tertiary);
            font-size: 0.75rem;
            line-height: 1.5;
        }
        .error {
            margin-bottom: 16px;
            padding: 12px 14px;
            border: 1px solid rgba(255, 77, 79, 0.16);
            border-radius: 18px;
            background: var(--accent-soft-danger);
            color: var(--fg-error);
            font-size: 0.875rem;
            font-weight: 600;
        }
        @media (max-width: 640px) {
            body {
                place-items: stretch;
                padding: 18px;
            }
            .shell {
                width: 100%;
                margin: auto 0;
            }
            .panel {
                padding: 28px 24px;
            }
        }
    </style>
</head>
<body>
    <main class="shell">
        <div class="brand">Ocean Blue</div>
        <section class="panel" aria-labelledby="login-title">
            <h1 id="login-title">Sign in</h1>
            <p class="lead">Enter the workspace password to continue.</p>
            ${renderErrorBlock(errorMessage)}
            <form method="post" action="/login">
                <input type="hidden" name="redirectTo" value="${escapeHtml(redirectTo)}" />
                <input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}" />
                <div class="field">
                    <label for="password">Password</label>
                    <input id="password" name="password" type="password" autocomplete="current-password" required autofocus />
                </div>
                <button type="submit">Sign in</button>
            </form>
            <div class="hint">This session must be authenticated before the workspace loads.</div>
        </section>
    </main>
</body>
</html>`;
