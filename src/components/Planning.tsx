import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { PlanningItem } from '../types';
import { Plus, Trash2, Calendar, Filter, Save, ChevronLeft, ChevronRight, TrendingUp, Wallet, Package, Users, Copy, Pencil, X, Settings, FileText } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameWeek, isSameMonth, parseISO, eachWeekOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Planning() {
    const {
        planningItems, addPlanningItem, updatePlanningItem, deletePlanningItem,
        planningTypes, addPlanningType, updatePlanningType, deletePlanningType
    } = useStore();
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [filterType, setFilterType] = useState<string>('all');
    const [isAdding, setIsAdding] = useState(false);
    const [isManagingTypes, setIsManagingTypes] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [editingType, setEditingType] = useState<{ oldName: string, newName: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<PlanningItem | null>(null);
    const [isPreviewingPDF, setIsPreviewingPDF] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const [newItem, setNewItem] = useState<Omit<PlanningItem, 'id' | 'totalValue'>>({
        weekStartDate: format(currentWeek, 'yyyy-MM-dd'),
        type: '',
        description: '',
        quantity: 1,
        unitValue: 0,
        paymentDate: ''
    });

    // Set default type when planningTypes load
    useEffect(() => {
        if (planningTypes.length > 0 && !newItem.type) {
            setNewItem(prev => ({ ...prev, type: planningTypes[0] }));
        }
    }, [planningTypes]);

    const filteredItems = useMemo(() => {
        return planningItems.filter(item => {
            const isSameDate = isSameWeek(parseISO(item.weekStartDate), currentWeek, { weekStartsOn: 1 });
            const matchesType = filterType === 'all' || item.type === filterType;
            return isSameDate && matchesType;
        });
    }, [planningItems, currentWeek, filterType]);

    const weekTotals = useMemo(() => {
        const totals = filteredItems.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + item.totalValue;
            acc.total = (acc.total || 0) + item.totalValue;
            return acc;
        }, { total: 0 } as Record<string, number>);

        const sortedTypes = Object.entries(totals)
            .filter(([key]) => key !== 'total')
            .sort((a, b) => b[1] - a[1]);

        return {
            total: totals.total,
            breakdown: sortedTypes
        };
    }, [filteredItems]);

    const monthTotal = useMemo(() => {
        return planningItems
            .filter(item => isSameMonth(parseISO(item.weekStartDate), currentWeek))
            .reduce((total, item) => total + item.totalValue, 0);
    }, [planningItems, currentWeek]);

    const handleAdd = async () => {
        if (!newItem.description || !newItem.type) return;
        await addPlanningItem({ ...newItem, weekStartDate: format(currentWeek, 'yyyy-MM-dd') });
        setNewItem({
            weekStartDate: format(currentWeek, 'yyyy-MM-dd'),
            type: planningTypes[0] || '',
            description: '',
            quantity: 1,
            unitValue: 0,
            paymentDate: ''
        });
        setIsAdding(false);
    };

    const handleStartEdit = (item: PlanningItem) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const handleSaveEdit = async () => {
        if (!editForm || !editingId) return;
        const { id, totalValue, ...updateData } = editForm;
        const { error } = await updatePlanningItem(editingId, updateData);
        if (error) {
            console.error('Error updating planning item:', error);
            alert('Falha ao salvar as alterações. Por favor, tente novamente.');
            return;
        }
        setEditingId(null);
        setEditForm(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleCopyItem = async (item: PlanningItem) => {
        const { id, totalValue, ...itemData } = item;
        await addPlanningItem(itemData);
    };

    const handleCopyPreviousWeek = async () => {
        const prevWeek = subWeeks(currentWeek, 1);
        const prevWeekItems = planningItems.filter(item =>
            isSameWeek(parseISO(item.weekStartDate), prevWeek, { weekStartsOn: 1 })
        );
        if (prevWeekItems.length === 0) return;
        for (const item of prevWeekItems) {
            const { id, totalValue, ...itemData } = item;
            await addPlanningItem({
                ...itemData,
                weekStartDate: format(currentWeek, 'yyyy-MM-dd')
            });
        }
    };

    const handleAddType = async () => {
        if (!newTypeName.trim()) return;
        const { error } = await addPlanningType(newTypeName.trim());
        if (error) {
            alert('Erro ao adicionar categoria. Pode ser que ela já exista.');
        } else {
            setNewTypeName('');
        }
    };

    const handleUpdateType = async () => {
        if (!editingType || !editingType.newName.trim()) return;
        const { error } = await updatePlanningType(editingType.oldName, editingType.newName.trim());
        if (error) {
            alert('Erro ao atualizar categoria.');
        } else {
            setEditingType(null);
        }
    };

    const handleGeneratePDF = (mode: 'save' | 'preview' = 'preview') => {
        const doc = new jsPDF();
        const monthStart = startOfMonth(currentWeek);
        const monthEnd = endOfMonth(currentWeek);
        const monthName = format(monthStart, 'MMMM yyyy', { locale: ptBR });
        const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

        // Title
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text(`Relatório de Planejamento - ${monthName}`, 14, 22);

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`Valor Total do Mês: ${formatCurrency(monthTotal)}`, 14, 40);

        let currentY = 50;

        weeks.forEach((weekStart, index) => {
            const weekEnd = addWeeks(weekStart, 1);
            const weekItems = planningItems.filter(item =>
                isSameWeek(parseISO(item.weekStartDate), weekStart, { weekStartsOn: 1 })
            );

            if (weekItems.length === 0) return;

            const weekTotalValue = weekItems.reduce((sum, item) => sum + item.totalValue, 0);

            // Week Header
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(0, 100, 0); // Emerald green
            doc.text(`${index + 1}. Semana: ${format(weekStart, 'dd/MM')} a ${format(weekEnd, 'dd/MM')}`, 14, currentY);
            currentY += 7;

            const tableData = weekItems.map(item => [
                item.description,
                item.type,
                item.quantity.toString(),
                formatCurrency(item.unitValue),
                formatCurrency(item.totalValue)
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Descrição', 'Tipo', 'Qtd', 'Val. Unit.', 'Total']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] },
                margin: { left: 14, right: 14 },
                didDrawPage: (data) => {
                    currentY = data.cursor ? data.cursor.y : currentY;
                }
            });

            currentY += 10;
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Total da Semana: ${formatCurrency(weekTotalValue)}`, 14, currentY);
            currentY += 15;
        });

        // Add Footer with page numbers
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(
                `Página ${i} de ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        if (mode === 'save') {
            doc.save(`Planejamento_${monthName.replace(' ', '_')}.pdf`);
        } else {
            const blob = doc.output('bloburl');
            setPdfUrl(blob.toString());
            setIsPreviewingPDF(true);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-stone-900">Planejamento Semanal</h2>
                    <p className="text-stone-500">Gerencie serviços, mão de obra e materiais por semana</p>
                </div>

                <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-stone-200 shadow-sm">
                    <button
                        onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                        className="p-2 hover:bg-stone-50 rounded-lg transition-colors text-stone-600"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="px-4 py-2 font-medium text-stone-900 flex items-center space-x-2 min-w-[200px] justify-center text-sm">
                        <Calendar size={16} className="text-emerald-500" />
                        <span>
                            {format(currentWeek, "dd 'de' MMM", { locale: ptBR })} - {format(addWeeks(currentWeek, 1), "dd 'de' MMM", { locale: ptBR })}
                        </span>
                    </div>
                    <button
                        onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                        className="p-2 hover:bg-stone-50 rounded-lg transition-colors text-stone-600"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard
                    title="Total da Semana"
                    value={weekTotals.total}
                    icon={<TrendingUp className="text-emerald-600" size={20} />}
                    className="bg-emerald-50 border-emerald-100"
                />
                <SummaryCard
                    title="Total do Mês"
                    value={monthTotal}
                    icon={<Calendar className="text-blue-600" size={20} />}
                    className="bg-blue-50 border-blue-100"
                />
                {weekTotals.breakdown.slice(0, 3).map(([type, value]) => (
                    <SummaryCard
                        key={type}
                        title={type}
                        value={value}
                        icon={
                            type === 'Serviço' ? <Package className="text-blue-600" size={20} /> :
                                type === 'Mão de Obra' ? <Users className="text-purple-600" size={20} /> :
                                    <Wallet className="text-amber-600" size={20} />
                        }
                        className={
                            type === 'Serviço' ? "bg-blue-50 border-blue-100" :
                                type === 'Mão de Obra' ? "bg-purple-50 border-purple-100" :
                                    "bg-amber-50 border-amber-100"
                        }
                    />
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Filter size={18} className="text-stone-400" />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                <option value="all">Todos os tipos</option>
                                {planningTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => setIsManagingTypes(true)}
                            className="text-stone-400 hover:text-stone-600 transition-colors p-1.5 hover:bg-stone-100 rounded-lg"
                            title="Gerenciar categorias"
                        >
                            <Settings size={18} />
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleGeneratePDF('preview')}
                            className="flex items-center space-x-2 bg-white text-stone-700 px-4 py-2 rounded-xl hover:bg-stone-50 transition-all border border-stone-200 shadow-sm text-sm"
                            title="Visualizar relatório PDF do mês"
                        >
                            <FileText size={18} className="text-blue-500" />
                            <span className="hidden md:inline">Relatório PDF</span>
                        </button>

                        <button
                            onClick={handleCopyPreviousWeek}
                            className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100 text-sm"
                            title="Copiar todos os itens da semana anterior"
                        >
                            <Copy size={18} />
                            <span className="hidden md:inline">Copiar semana anterior</span>
                        </button>

                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center space-x-2 bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-stone-800 transition-all shadow-sm text-sm"
                        >
                            <Plus size={18} />
                            <span>Novo Item</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4">Qtd</th>
                                <th className="px-6 py-4">Valor Unit.</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4 text-center">Data Pagto</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {isAdding && (
                                <tr className="bg-emerald-50/30 animate-in fade-in duration-300">
                                    <td className="px-6 py-3">
                                        <select
                                            value={newItem.type}
                                            onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                                            className="w-full bg-white border border-stone-200 rounded-lg p-2 text-sm"
                                        >
                                            {planningTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-3">
                                        <input
                                            type="text"
                                            placeholder="Descrição"
                                            value={newItem.description}
                                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            className="w-full bg-white border border-stone-200 rounded-lg p-2 text-sm"
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        <input
                                            type="number"
                                            value={newItem.quantity}
                                            onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                                            className="w-20 bg-white border border-stone-200 rounded-lg p-2 text-sm"
                                        />
                                    </td>
                                    <td className="px-6 py-3">
                                        <input
                                            type="number"
                                            value={newItem.unitValue}
                                            onChange={(e) => setNewItem({ ...newItem, unitValue: Number(e.target.value) })}
                                            className="w-28 bg-white border border-stone-200 rounded-lg p-2 text-sm"
                                        />
                                    </td>
                                    <td className="px-6 py-3 font-semibold text-emerald-700">
                                        {(newItem.quantity * newItem.unitValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-6 py-3">
                                        <input
                                            type="date"
                                            value={newItem.paymentDate || ''}
                                            onChange={(e) => setNewItem({ ...newItem, paymentDate: e.target.value })}
                                            className="w-full bg-white border border-stone-200 rounded-lg p-2 text-sm"
                                        />
                                    </td>
                                    <td className="px-6 py-3 flex items-center space-x-1">
                                        <button onClick={handleAdd} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors">
                                            <Save size={18} />
                                        </button>
                                        <button onClick={() => setIsAdding(false)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <X size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )}

                            {filteredItems.length === 0 && !isAdding ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-stone-400">
                                        Nenhum item planejado para esta semana.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const isEditing = editingId === item.id;
                                    const displayItem = isEditing ? editForm! : item;

                                    return (
                                        <tr key={item.id} className={cn(
                                            "hover:bg-stone-50 transition-colors group",
                                            isEditing && "bg-blue-50/30"
                                        )}>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <select
                                                        value={displayItem.type}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev!, type: e.target.value }))}
                                                        className="w-full bg-white border border-stone-200 rounded-lg p-1.5 text-sm"
                                                    >
                                                        {planningTypes.map(type => (
                                                            <option key={type} value={type}>{type}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                        item.type === 'Serviço' ? "bg-blue-100 text-blue-700" :
                                                            item.type === 'Mão de Obra' ? "bg-purple-100 text-purple-700" :
                                                                item.type === 'Material' ? "bg-amber-100 text-amber-700" :
                                                                    "bg-stone-100 text-stone-700"
                                                    )}>
                                                        {item.type}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={displayItem.description}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev!, description: e.target.value }))}
                                                        className="w-full bg-white border border-stone-200 rounded-lg p-1.5 text-sm"
                                                    />
                                                ) : (
                                                    <span className="text-stone-700 font-medium">{item.description}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={displayItem.quantity}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev!, quantity: Number(e.target.value) }))}
                                                        className="w-20 bg-white border border-stone-200 rounded-lg p-1.5 text-sm"
                                                    />
                                                ) : (
                                                    <span className="text-stone-700">{item.quantity}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={displayItem.unitValue}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev!, unitValue: Number(e.target.value) }))}
                                                        className="w-28 bg-white border border-stone-200 rounded-lg p-1.5 text-sm"
                                                    />
                                                ) : (
                                                    <span className="text-stone-700">
                                                        {item.unitValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-stone-900">
                                                {(isEditing ? displayItem.quantity * displayItem.unitValue : item.totalValue)
                                                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-6 py-4 text-center text-stone-600 text-sm">
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        value={displayItem.paymentDate || ''}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev!, paymentDate: e.target.value }))}
                                                        className="w-full bg-white border border-stone-200 rounded-lg p-1.5 text-sm"
                                                    />
                                                ) : (
                                                    item.paymentDate ? format(parseISO(item.paymentDate), 'dd/MM/yyyy') : '-'
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-1">
                                                    {isEditing ? (
                                                        <>
                                                            <button onClick={handleSaveEdit} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors">
                                                                <Save size={18} />
                                                            </button>
                                                            <button onClick={handleCancelEdit} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                                <X size={18} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleStartEdit(item)} className="p-2 text-stone-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => handleCopyItem(item)} className="p-2 text-stone-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                                <Copy size={16} />
                                                            </button>
                                                            <button onClick={() => deletePlanningItem(item.id)} className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manage Types Modal */}
            {isManagingTypes && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                            <h3 className="text-xl font-bold text-stone-900">Gerenciar Categorias</h3>
                            <button onClick={() => setIsManagingTypes(false)} className="text-stone-400 hover:text-stone-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    placeholder="Nova categoria"
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                                />
                                <button
                                    onClick={handleAddType}
                                    className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>

                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {planningTypes.map(type => (
                                    <div key={type} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200 group">
                                        {editingType?.oldName === type ? (
                                            <div className="flex-1 flex items-center space-x-2">
                                                <input
                                                    type="text"
                                                    value={editingType.newName}
                                                    onChange={(e) => setEditingType({ ...editingType, newName: e.target.value })}
                                                    className="flex-1 bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={handleUpdateType} className="text-emerald-600 hover:text-emerald-700">
                                                    <Save size={18} />
                                                </button>
                                                <button onClick={() => setEditingType(null)} className="text-red-500 hover:text-red-600">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium text-stone-700">{type}</span>
                                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingType({ oldName: type, newName: type })}
                                                        className="p-1.5 text-stone-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Tem certeza que deseja excluir "${type}"? Isso não afetará itens existentes, mas você não poderá mais selecionar esta categoria.`)) {
                                                                deletePlanningType(type);
                                                            }
                                                        }}
                                                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PDF Preview Modal */}
            {isPreviewingPDF && pdfUrl && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-300">
                        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
                            <div>
                                <h3 className="text-lg font-bold text-stone-900">Pré-visualização do Relatório</h3>
                                <p className="text-xs text-stone-500">Revise o relatório antes de exportar</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleGeneratePDF('save')}
                                    className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all shadow-sm text-sm font-semibold"
                                >
                                    <Save size={18} />
                                    <span>Baixar PDF</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsPreviewingPDF(false);
                                        setPdfUrl(null);
                                    }}
                                    className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-stone-100 p-4">
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full rounded-lg shadow-inner border border-stone-200"
                                title="PDF Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ title, value, icon, className }: { title: string, value: number, icon: React.ReactNode, className?: string }) {
    return (
        <div className={cn("p-5 rounded-2xl border flex items-center space-x-4 shadow-sm transition-all hover:shadow-md", className)}>
            <div className="w-12 h-12 rounded-xl bg-white/50 flex items-center justify-center shadow-sm">
                {icon}
            </div>
            <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{title}</p>
                <p className="text-xl font-bold text-stone-900">
                    {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
            </div>
        </div>
    );
}
