import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
    return (
        <div className="flex justify-between items-end mb-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-stone-900">{title}</h1>
                {description && <p className="text-stone-500 mt-1">{description}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
