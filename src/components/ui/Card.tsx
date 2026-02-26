import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
    children: ReactNode;
    className?: string;
}

export function Card({ children, className }: CardProps) {
    return (
        <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-stone-100", className)}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className }: CardProps) {
    return <h3 className={cn("text-lg font-semibold text-stone-900 mb-4", className)}>{children}</h3>;
}
