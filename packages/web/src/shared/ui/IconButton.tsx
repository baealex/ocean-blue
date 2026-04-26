import classNames from 'classnames';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

function IconButton({
    children,
    className,
    type = 'button',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
}) {
    return (
        <button
            className={classNames(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-white/70 text-sky-700 backdrop-blur-xl transition hover:border-sky-200 hover:bg-sky-50/90 hover:text-sky-900 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60',
                className
            )}
            type={type}
            {...props}
        >
            {children}
        </button>
    );
}

export default IconButton;
