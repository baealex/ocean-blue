import classNames from 'classnames';
import type { InputHTMLAttributes } from 'react';

function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={classNames(
                'h-11 w-full rounded-full border border-sky-100 bg-white/70 px-4 text-sm text-slate-950 outline-none backdrop-blur-xl transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white/90 focus:ring-4 focus:ring-sky-100',
                className
            )}
            {...props}
        />
    );
}

export default Input;
