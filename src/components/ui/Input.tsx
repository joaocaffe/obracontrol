import React, { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    className?: string;
}

export function Input({ label, className, ...props }: InputProps) {
    return (
        <div>
            {label && <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>}
            <input
                className={cn(
                    "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow",
                    className
                )}
                {...props}
            />
        </div>
    );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
    className?: string;
}

export function Select({ label, options, className, ...props }: SelectProps) {
    return (
        <div>
            {label && <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>}
            <select
                className={cn(
                    "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow",
                    className
                )}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}
