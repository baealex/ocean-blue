import classNames from 'classnames';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md';

const variants: Record<ButtonVariant, string> = {
    primary: 'border-sky-500 bg-sky-500 text-white hover:border-sky-600 hover:bg-sky-600 focus:ring-sky-100',
    secondary:
        'border-sky-100 bg-white/70 text-sky-800 backdrop-blur-xl hover:border-sky-200 hover:bg-sky-50/90 focus:ring-sky-100',
    ghost: 'border-transparent bg-transparent text-sky-700 hover:bg-sky-100/70 hover:text-sky-950 focus:ring-sky-100'
};

const sizes: Record<ButtonSize, string> = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-11 px-4 text-sm'
};

function Button({
    children,
    className,
    size = 'md',
    type = 'button',
    variant = 'secondary',
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    size?: ButtonSize;
    variant?: ButtonVariant;
}) {
    return (
        <button
            className={classNames(
                'inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
                sizes[size],
                variants[variant],
                className
            )}
            type={type}
            {...props}
        >
            {children}
        </button>
    );
}

export default Button;
