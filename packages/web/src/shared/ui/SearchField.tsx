import classNames from 'classnames';
import type { ChangeEvent } from 'react';
import { FaSearch } from 'react-icons/fa';

import Input from './Input';

function SearchField({
    className,
    onChange,
    placeholder,
    value
}: {
    className?: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    value: string;
}) {
    return (
        <div className={classNames('relative min-w-0', className)}>
            <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-600">
                <FaSearch className="text-base opacity-100" />
            </span>
            <Input className="pl-10" onChange={onChange} placeholder={placeholder} type="search" value={value} />
        </div>
    );
}

export default SearchField;
