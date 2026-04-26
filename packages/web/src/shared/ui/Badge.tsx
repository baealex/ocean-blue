import classNames from 'classnames';
import type { HTMLAttributes, ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'info' | 'danger';

const tones: Record<BadgeTone, string> = {
    neutral: 'border-sky-100 bg-sky-50/70 text-slate-600',
    success: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
    info: 'border-sky-100 bg-sky-50/60 text-sky-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-700'
};

const dotTones: Record<BadgeTone, string> = {
    neutral: 'bg-slate-300',
    success: 'bg-emerald-500',
    info: 'bg-sky-500',
    danger: 'bg-rose-500'
};

function Badge({
    children,
    className,
    showDot = false,
    tone = 'neutral',
    ...props
}: HTMLAttributes<HTMLSpanElement> & {
    children: ReactNode;
    showDot?: boolean;
    tone?: BadgeTone;
}) {
    return (
        <span
            className={classNames(
                'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold',
                tones[tone],
                className
            )}
            {...props}
        >
            {showDot ? <span className={classNames('h-2 w-2 rounded-full', dotTones[tone])} /> : null}
            {children}
        </span>
    );
}

export default Badge;
