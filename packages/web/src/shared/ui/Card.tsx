import classNames from 'classnames';
import type { HTMLAttributes, ReactNode } from 'react';

const surfaceClassName =
    'rounded-3xl border border-sky-100/80 bg-white/60 shadow-[0_18px_60px_-36px_rgba(14,165,233,0.45)] backdrop-blur-xl';

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
