import { Link, NavLink, Outlet } from 'react-router-dom';
import { FaBolt, FaTerminal } from 'react-icons/fa';

/**
 * RootLayout - Base layout component that wraps all pages
 */
function RootLayout() {
    return (
        <div className="min-h-screen text-slate-950">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
                <header>
                    <nav className="flex w-full items-center justify-between gap-3 rounded-3xl border border-sky-100/80 bg-white/60 px-3 py-3 shadow-[0_18px_60px_-42px_rgba(14,165,233,0.45)] backdrop-blur-xl">
                        <Link
                            className="inline-flex min-w-0 items-center gap-3 rounded-full px-2 py-1.5 text-slate-950 transition hover:bg-sky-50/70"
                            to="/"
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-sky-600 shadow-[0_14px_36px_-24px_rgba(14,165,233,0.8)] ring-1 ring-sky-100 backdrop-blur-xl">
                                <FaBolt />
                            </span>
                            <span className="truncate text-base font-semibold">Ocean Blue</span>
                        </Link>

                        <NavLink
                            className={({ isActive }) => `inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-sky-100 ${
                                isActive
                                    ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                                    : 'border-sky-100 bg-white/70 text-sky-800 backdrop-blur-xl hover:border-sky-200 hover:bg-sky-50/90'
                            }`}
                            to="/how-to-proxy"
                        >
                            <FaTerminal className="text-xs" />
                            <span>How to proxy</span>
                        </NavLink>
                    </nav>
                </header>
                <Outlet />
            </div>
        </div>
    );
}

export default RootLayout;
