import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { formatCurrency, cn } from '../lib/utils';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { Calendar, TrendingUp, Hammer, Users, Printer } from 'lucide-react';
import { parseISO, format, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyData {
    month: string; // YYYY-MM
    labor: number;
    materials: number;
}

export function MonthlySummary() {
    const { laborCosts, materialCosts, stages, isLoading } = useStore();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-stone-200 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-stone-500 font-medium">Carregando resumo...</p>
                </div>
            </div>
        );
    }
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

    const monthlyData = useMemo(() => {
        const data: Record<string, MonthlyData> = {};

        const getMonthData = (monthKey: string) => {
            if (!data[monthKey]) {
                data[monthKey] = { month: monthKey, labor: 0, materials: 0 };
            }
            return data[monthKey];
        };

        // Calculate Labor Costs (including hidden)
        laborCosts.forEach(cost => {
            if (!cost.startDate || !cost.endDate) return;

            const start = parseISO(cost.startDate);
            const end = parseISO(cost.endDate);
            const interval = { start, end };

            const monthsInRange = eachMonthOfInterval(interval);

            monthsInRange.forEach(monthDate => {
                const monthKey = format(monthDate, 'yyyy-MM');
                const monthStart = startOfMonth(monthDate);
                const monthEnd = endOfMonth(monthDate);

                const overlapStart = start > monthStart ? start : monthStart;
                const overlapEnd = end < monthEnd ? end : monthEnd;

                if (overlapStart <= overlapEnd) {
                    const overlapDays = eachDayOfInterval({ start: overlapStart, end: overlapEnd }).length;

                    if (cost.contractType === 'Diária') {
                        const rate = cost.realDailyRate || cost.plannedDailyRate || 0;
                        getMonthData(monthKey).labor += overlapDays * rate;
                    } else {
                        const total = cost.realDailyRate || cost.plannedDailyRate || 0;
                        const totalDays = eachDayOfInterval(interval).length;
                        if (totalDays > 0) {
                            const dailyRate = total / totalDays;
                            getMonthData(monthKey).labor += overlapDays * dailyRate;
                        }
                    }
                }
            });
        });

        // Calculate Material Costs (including hidden)
        materialCosts.forEach(cost => {
            if (!cost.date) return;

            const monthKey = format(parseISO(cost.date), 'yyyy-MM');
            const total = (cost.realQuantity || 0) * (cost.realUnitPrice || 0);
            getMonthData(monthKey).materials += total;
        });

        return Object.values(data).sort((a, b) => a.month.localeCompare(b.month));
    }, [laborCosts, materialCosts]);

    const currentMonthData = monthlyData.find(d => d.month === selectedMonth) || { month: selectedMonth, labor: 0, materials: 0 };

    const filteredLabor = laborCosts.filter(cost =>
        !cost.isHidden &&
        cost.startDate &&
        cost.endDate &&
        (eachMonthOfInterval({ start: parseISO(cost.startDate), end: parseISO(cost.endDate) })
            .some(m => format(m, 'yyyy-MM') === selectedMonth))
    );

    const filteredMaterials = materialCosts.filter(cost =>
        !cost.isHidden &&
        cost.date &&
        format(parseISO(cost.date), 'yyyy-MM') === selectedMonth
    );

    const getStageName = (id: string) => stages.find(s => s.id === id)?.name || 'Desconhecida';

    return (
        <div className="space-y-6">
            <PageHeader
                title="Resumo Mensal"
                description="Visão consolidada de gastos por mês."
                action={
                    <div className="flex gap-2 no-print">
                        <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-3 py-1">
                            <Calendar size={16} className="text-stone-400" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="text-sm border-none focus:ring-0 cursor-pointer"
                            />
                        </div>
                        <Button
                            onClick={() => window.print()}
                            variant="outline"
                            className="bg-white"
                        >
                            <Printer size={16} />
                            Gerar Relatório
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Mão de Obra (Mês)</div>
                        <div className="text-2xl font-bold text-stone-900">{formatCurrency(currentMonthData.labor)}</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                        <Users size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Materiais (Mês)</div>
                        <div className="text-2xl font-bold text-stone-900">{formatCurrency(currentMonthData.materials)}</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-2xl text-orange-600">
                        <Hammer size={24} />
                    </div>
                </div>

                <div className="bg-stone-900 p-6 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1 text-white/70">Total do Mês</div>
                        <div className="text-2xl font-bold text-white">{formatCurrency(currentMonthData.labor + currentMonthData.materials)}</div>
                    </div>
                    <div className="bg-emerald-500 p-4 rounded-2xl text-white">
                        <TrendingUp size={24} />
                    </div>
                </div>
            </div>

            <div className="space-y-8 mt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
                        <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                            <Users size={18} className="text-stone-400" />
                            Detalhamento: Mão de Obra
                        </h3>
                        <span className="text-xs font-medium text-stone-500 uppercase">Itens Ativos</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-200">
                                    <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Profissional / Etapa</th>
                                    <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Valor no Mês</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filteredLabor.length === 0 ? (
                                    <tr><td colSpan={2} className="p-4 text-center text-stone-400 text-sm">Nenhum gasto ativo este mês</td></tr>
                                ) : (
                                    filteredLabor.map(cost => {
                                        const costStart = parseISO(cost.startDate!);
                                        const costEnd = parseISO(cost.endDate!);
                                        const monthStart = startOfMonth(parseISO(selectedMonth + "-01"));
                                        const monthEnd = endOfMonth(monthStart);
                                        const overlapStart = costStart > monthStart ? costStart : monthStart;
                                        const overlapEnd = costEnd < monthEnd ? costEnd : monthEnd;
                                        const overlapDays = eachDayOfInterval({ start: overlapStart, end: overlapEnd }).length;

                                        let val = 0;
                                        if (cost.contractType === 'Diária') {
                                            val = overlapDays * (cost.realDailyRate || cost.plannedDailyRate || 0);
                                        } else {
                                            const total = cost.realDailyRate || cost.plannedDailyRate || 0;
                                            const totalDays = eachDayOfInterval({ start: costStart, end: costEnd }).length;
                                            val = (total / totalDays) * overlapDays;
                                        }

                                        return (
                                            <tr key={cost.id}>
                                                <td className="p-4">
                                                    <div className="font-medium text-stone-900">{cost.workerName || cost.role}</div>
                                                    <div className="text-xs text-stone-500">{getStageName(cost.stageId)}</div>
                                                </td>
                                                <td className="p-4 text-right font-mono text-stone-900">{formatCurrency(val)}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
                        <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                            <Hammer size={18} className="text-stone-400" />
                            Detalhamento: Materiais
                        </h3>
                        <span className="text-xs font-medium text-stone-500 uppercase">Itens Ativos</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-stone-50 border-b border-stone-200">
                                    <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Insumo / Etapa</th>
                                    <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filteredMaterials.length === 0 ? (
                                    <tr><td colSpan={2} className="p-4 text-center text-stone-400 text-sm">Nenhum gasto ativo este mês</td></tr>
                                ) : (
                                    filteredMaterials.map(cost => (
                                        <tr key={cost.id}>
                                            <td className="p-4">
                                                <div className="font-medium text-stone-900">{cost.description}</div>
                                                <div className="text-xs text-stone-500">{getStageName(cost.stageId)}</div>
                                            </td>
                                            <td className="p-4 text-right font-mono text-stone-900">
                                                {formatCurrency((cost.realQuantity || 0) * (cost.realUnitPrice || 0))}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
