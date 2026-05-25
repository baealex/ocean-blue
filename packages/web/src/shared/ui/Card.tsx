import classNames from 'classnames';
import type { HTMLAttributes, ReactNode } from 'react';

const surfaceClassName =
    'rounded-ocean-blue-panel border border-ocean-blue-border bg-ocean-blue-surface shadow-ocean-blue-surface backdrop-blur-xl';

function Card({
    as: Component = 'div',
    children,
    className,
    ...props
}: HTMLAttributes<HTMLElement> & {
    as?: 'article' | 'div' | 'section';
    children: ReactNode;
}) {
    return (
        <Component className={classNames(surfaceClassName, className)} {...props}>
            {children}
        </Component>
    );
}

export { surfaceClassName };
export default Card;
