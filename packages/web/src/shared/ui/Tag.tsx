import classNames from 'classnames';
import type { HTMLAttributes, ReactNode } from 'react';

function Tag({
    children,
    className,
    ...props
}: HTMLAttributes<HTMLSpanElement> & {
    children: ReactNode;
}) {
    return (
        <span
            className={classNames(
                'inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/60 px-2.5 py-1 text-xs font-semibold text-sky-800',
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}

export default Tag;
