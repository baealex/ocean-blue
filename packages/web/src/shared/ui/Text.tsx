import classNames from 'classnames';
import type { HTMLAttributes, ReactNode } from 'react';

type TextVariant = 'body' | 'muted' | 'label' | 'title';

const variants: Record<TextVariant, string> = {
    body: 'text-sm leading-6 text-slate-700',
    muted: 'text-sm leading-6 text-slate-500',
    label: 'text-xs font-semibold uppercase tracking-wider text-slate-500',
    title: 'font-semibold tracking-tight text-slate-950'
};

function Text({
    as: Component = 'p',
    children,
    className,
    variant = 'body',
    ...props
}: HTMLAttributes<HTMLElement> & {
    as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
    children: ReactNode;
    variant?: TextVariant;
}) {
    return (
        <Component className={classNames(variants[variant], className)} {...props}>
            {children}
        </Component>
    );
}

export default Text;
