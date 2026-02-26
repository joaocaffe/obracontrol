import { cn } from '../../lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
    className?: string;
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
    const variants = {
        success: "bg-emerald-100 text-emerald-800",
        warning: "bg-blue-100 text-blue-800",
        error: "bg-red-100 text-red-800",
        info: "bg-indigo-100 text-indigo-800",
        neutral: "bg-stone-100 text-stone-800"
    };

    return (
        <span className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium",
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
}
