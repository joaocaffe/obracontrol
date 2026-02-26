import { Menu, X } from 'lucide-react';

interface NavbarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
}

export function Navbar({ isSidebarOpen, setIsSidebarOpen }: NavbarProps) {
    return (
        <div className="md:hidden bg-stone-900 text-white p-4 flex justify-between items-center sticky top-0 z-20">
            <div className="font-bold text-xl tracking-tight">ObraControl Pro</div>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1">
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
    );
}
