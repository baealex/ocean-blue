import classNames from 'classnames';

function SegmentedControl<TValue extends string>({
    options,
    value,
    onChange
}: {
    options: readonly { label: string; value: TValue }[];
    value: TValue;
    onChange: (value: TValue) => void;
}) {
    return (
        <div className="flex max-w-full overflow-x-auto rounded-full bg-sky-100/35 p-1">
            {options.map((option) => (
                <button
                    className={classNames(
                        'h-8 shrink-0 rounded-full px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-100',
                        value === option.value
                            ? 'bg-white/80 text-sky-900 shadow-[0_1px_3px_rgba(14,165,233,0.14)]'
                            : 'text-slate-500 hover:bg-white/45 hover:text-sky-900'
                    )}
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    type="button"
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export default SegmentedControl;
