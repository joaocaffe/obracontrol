import { LayoutDashboard, ListTodo, Users, Hammer, CalendarDays, CreditCard, DollarSign, LogOut, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen }: SidebarProps) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'stages', label: 'Etapas', icon: ListTodo },
        { id: 'labor', label: 'Mão de Obra', icon: Users },
        { id: 'materials', label: 'Materiais', icon: Hammer },
        { id: 'payments', label: 'Pagamentos', icon: DollarSign },
        { id: 'credit-cards', label: 'Cartões', icon: CreditCard },
        { id: 'monthly-summary', label: 'Resumo Mensal', icon: CalendarDays },
        { id: 'gantt', label: 'Cronograma', icon: CalendarDays },
    ];

    const handleLogout = () => {
        supabase.auth.signOut();
    };

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-30 w-64 bg-stone-900 text-white transform transition-transform duration-300 ease-in-out flex flex-col",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}
        >
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <Hammer className="text-white" size={20} />
                    </div>
                    <span className="text-xl font-bold tracking-tight">ObraControl</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="md:hidden p-1 text-stone-400 hover:text-white"
                >
                    <X size={24} />
                </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (window.innerWidth < 768) {
                                    setIsSidebarOpen(false);
                                }
                            }}
                            className={cn(
                                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                activeTab === item.id
                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                    : "text-stone-400 hover:bg-stone-800 hover:text-white"
                            )}
                        >
                            <Icon size={20} className={cn(
                                "transition-colors",
                                activeTab === item.id ? "text-white" : "text-stone-500 group-hover:text-white"
                            )} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-stone-800">
                <div className="flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 font-bold text-xs uppercase">
                            EC
                        </div>
                        <div className="text-sm">
                            <div className="text-white font-medium">Eng. Civil</div>
                            <div className="text-xs text-stone-500">Administrador</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-stone-500 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors"
                        title="Sair"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
