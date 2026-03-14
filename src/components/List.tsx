import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { ListItem, ListSubitem } from '../types';
import { Plus, Trash2, Pencil, Save, X, ChevronDown, ChevronRight, ChevronUp, LayoutDashboard, ListPlus, FileText, DollarSign, ArrowUp, ArrowDown, PenTool as Tool, Download, Eye } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function List() {
    const {
        listItems, addListItem, updateListItem, deleteListItem, reorderListItems,
        listSubitems, addListSubitem, updateListSubitem, deleteListSubitem, reorderListSubitems
    } = useStore();

    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingSubitemId, setEditingSubitemId] = useState<string | null>(null);
    const [newServiceItemName, setNewServiceItemName] = useState('');
    const [isAddingService, setIsAddingService] = useState(false);
    const [isPreviewingPDF, setIsPreviewingPDF] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // Filter subitems for a specific item
    const getSubitems = (itemId: string) => listSubitems.filter(s => s.itemId === itemId);

    // Calculate totals for dashboard
    const serviceTotals = useMemo(() => {
        return listItems.map(item => {
            const totalValue = getSubitems(item.id).reduce((sum, s) => sum + (s.value * s.quantity), 0);
            return { ...item, totalValue };
        });
    }, [listItems, listSubitems]);

    const grandTotal = useMemo(() => {
        return serviceTotals.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    }, [serviceTotals]);

    const toggleExpand = (itemId: string) => {
        setExpandedItems(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    const handleAddService = async () => {
        if (!newServiceItemName.trim()) return;
        await addListItem({ name: newServiceItemName.trim() });
        setNewServiceItemName('');
        setIsAddingService(false);
    };

    const handleMoveItem = async (id: string, direction: 'up' | 'down') => {
        const index = listItems.findIndex(i => i.id === id);
        if (direction === 'up' && index > 0) {
            await reorderListItems(id, listItems[index - 1].id);
        } else if (direction === 'down' && index < listItems.length - 1) {
            await reorderListItems(id, listItems[index + 1].id);
        }
    };

    const handleMoveSubitem = async (id: string, itemId: string, direction: 'up' | 'down') => {
        const itemSubitems = getSubitems(itemId);
        const index = itemSubitems.findIndex(s => s.id === id);
        if (direction === 'up' && index > 0) {
            await reorderListSubitems(id, itemSubitems[index - 1].id);
        } else if (direction === 'down' && index < itemSubitems.length - 1) {
            await reorderListSubitems(id, itemSubitems[index + 1].id);
        }
    };

    const handleAddSubitem = async (itemId: string) => {
        await addListSubitem({
            itemId,
            description: 'Novo item',
            value: 0,
            quantity: 1,
            paymentMethod: 'PIX',
            observation: ''
        });
        if (!expandedItems.includes(itemId)) {
            toggleExpand(itemId);
        }
    };

    const handleGeneratePDF = (mode: 'save' | 'preview' = 'preview') => {
        try {
            const doc = new jsPDF();
            let currentCursorY = 0;

            // Title and Header
            doc.setFontSize(22);
            doc.setTextColor(40);
            doc.text('Relatório de Lista de Serviços', 14, 22);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);

            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text(`VALOR TOTAL GERAL: ${formatCurrency(grandTotal)}`, 14, 40);
            doc.setFont('helvetica', 'normal');

            // Summary Section
            doc.setFontSize(12);
            doc.text('Resumo por Categoria', 14, 50);

            const summaryBody = serviceTotals.map(s => [s.name, formatCurrency(s.totalValue || 0)]);

            let finalY = 55;
            autoTable(doc, {
                startY: 55,
                head: [['Categoria', 'Total']],
                body: summaryBody,
                theme: 'grid',
                headStyles: { fillColor: [82, 82, 82] }, // Stone-700
                styles: { fontSize: 10 },
                margin: { left: 14, right: 14 },
                didDrawPage: (data) => {
                    finalY = data.cursor ? data.cursor.y : finalY;
                }
            });

            currentCursorY = finalY + 15;

            // Detailed Items Section
            doc.setFontSize(16);
            doc.text('Detalhes dos Itens', 14, currentCursorY);
            currentCursorY += 8;

            listItems.forEach((item, index) => {
                const subitems = getSubitems(item.id);
                if (subitems.length === 0) return;

                if (currentCursorY > 250) {
                    doc.addPage();
                    currentCursorY = 20;
                }

                doc.setFontSize(13);
                doc.setTextColor(30);
                doc.text(`${index + 1}. ${item.name.toUpperCase()}`, 14, currentCursorY);
                currentCursorY += 5;

                const body = subitems.map((s, sIndex) => [
                    `${index + 1}.${sIndex + 1}`,
                    s.description,
                    s.paymentMethod,
                    s.quantity.toString(),
                    formatCurrency(s.value),
                    formatCurrency(s.value * s.quantity),
                    s.observation || '-'
                ]);

                autoTable(doc, {
                    startY: currentCursorY,
                    head: [['#', 'Descrição', 'Pagto', 'Qtd', 'Unit.', 'Total', 'Obs']],
                    body: body,
                    theme: 'striped',
                    headStyles: { fillColor: [41, 37, 36] }, // Stone-900
                    columnStyles: {
                        0: { cellWidth: 10 },
                        1: { cellWidth: 'auto' },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 12, halign: 'center' },
                        4: { cellWidth: 25, halign: 'right' },
                        5: { cellWidth: 25, halign: 'right' },
                        6: { cellWidth: 40 }
                    },
                    margin: { left: 14, right: 14 },
                    didDrawPage: (data) => {
                        finalY = data.cursor ? data.cursor.y : currentCursorY;
                    }
                });

                currentCursorY = finalY + 12;
            });

            // Final Total
            if (currentCursorY > 270) {
                doc.addPage();
                currentCursorY = 20;
            }
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text(`VALOR TOTAL GERAL: ${formatCurrency(grandTotal)}`, 14, currentCursorY);

            // Footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(9);
                doc.setTextColor(150);
                doc.text(
                    `Página ${i} de ${pageCount}`,
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

            if (mode === 'save') {
                doc.save(`Lista_Servicos_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
            } else {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
                setIsPreviewingPDF(true);
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Ocorreu um erro ao gerar o relatório PDF. Por favor, tente novamente.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-stone-900">Lista de Serviços</h2>
                    <p className="text-stone-500">Dashboard e planilha detalhada de serviços e sub-itens</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handleGeneratePDF('preview')}
                        className="flex items-center space-x-2 bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-xl hover:bg-stone-50 transition-all shadow-sm text-sm"
                    >
                        <FileText size={18} />
                        <span>Visualizar PDF</span>
                    </button>
                    <button
                        onClick={() => setIsAddingService(true)}
                        className="flex items-center space-x-2 bg-stone-900 text-white px-4 py-2 rounded-xl hover:bg-stone-800 transition-all shadow-sm text-sm"
                    >
                        <Plus size={18} />
                        <span>Novo Serviço</span>
                    </button>
                </div>
            </div>

            {/* Dashboard */}
            <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
                <div className="min-w-[250px] flex-shrink-0">
                    <SummaryCard
                        title="Total Geral"
                        value={grandTotal}
                        icon={<LayoutDashboard className="text-emerald-600" size={20} />}
                        className="bg-emerald-50 border-emerald-100 h-full"
                    />
                </div>
                {serviceTotals.map(service => (
                    <div key={service.id} className="min-w-[250px] flex-shrink-0">
                        <SummaryCard
                            title={service.name}
                            value={service.totalValue || 0}
                            icon={<Tool className="text-blue-600" size={20} />}
                            className="bg-blue-50 border-blue-100 h-full"
                        />
                    </div>
                ))}
            </div>

            {/* Editable Spreadsheet */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-stone-50 text-stone-500 text-xs font-semibold uppercase tracking-wider">
                                <th className="px-6 py-4 w-10"></th>
                                <th className="px-6 py-4">Serviço / Item</th>
                                <th className="px-6 py-4 text-center">Forma Pagto</th>
                                <th className="px-6 py-4 text-center">Qtd</th>
                                <th className="px-6 py-4 text-right">Valor Unit.</th>
                                <th className="px-6 py-4 text-right">Total</th>
                                <th className="px-6 py-4">Observação</th>
                                <th className="px-6 py-4 w-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">

                            {listItems.length === 0 && !isAddingService ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-stone-400">
                                        Nenhum serviço cadastrado.
                                    </td>
                                </tr>
                            ) : (
                                listItems.map((item, itemIdx) => (
                                    <React.Fragment key={item.id}>
                                        {/* Main Item Row */}
                                        <tr className="group bg-stone-50/30 hover:bg-stone-100/50 transition-colors">
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => toggleExpand(item.id)}
                                                    className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
                                                >
                                                    {expandedItems.includes(item.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                {editingItemId === item.id ? (
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={item.name}
                                                            onChange={e => updateListItem(item.id, { name: e.target.value })}
                                                            className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                            onBlur={() => {
                                                                if (!item.name.trim()) deleteListItem(item.id);
                                                                setEditingItemId(null);
                                                            }}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    if (!item.name.trim()) deleteListItem(item.id);
                                                                    setEditingItemId(null);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-stone-400 font-mono text-sm">{itemIdx + 1}.</span>
                                                        <span className="font-bold text-stone-900 text-lg uppercase tracking-tight">{item.name}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td colSpan={3}></td>
                                            <td className="px-6 py-4 text-right font-bold text-stone-900">
                                                {formatCurrency(getSubitems(item.id).reduce((sum, s) => sum + (s.value * s.quantity), 0))}
                                            </td>
                                            <td></td>
                                            <td className="px-6 py-4 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                <button onClick={() => handleMoveItem(item.id, 'up')} className="p-1.5 text-stone-400 hover:text-stone-600 disabled:opacity-30" disabled={listItems.indexOf(item) === 0} title="Subir">
                                                    <ArrowUp size={16} />
                                                </button>
                                                <button onClick={() => handleMoveItem(item.id, 'down')} className="p-1.5 text-stone-400 hover:text-stone-600 disabled:opacity-30" disabled={listItems.indexOf(item) === listItems.length - 1} title="Descer">
                                                    <ArrowDown size={16} />
                                                </button>
                                                <button onClick={() => handleAddSubitem(item.id)} className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Adicionar sub-item">
                                                    <ListPlus size={16} />
                                                </button>
                                                <button onClick={() => setEditingItemId(item.id)} className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Renomear">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => deleteListItem(item.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Sub-items */}
                                        {expandedItems.includes(item.id) && (
                                            <>
                                                {getSubitems(item.id).map((subitem, subitemIdx) => (
                                                    <tr key={subitem.id} className="group hover:bg-stone-50 transition-colors animate-in slide-in-from-top-1 duration-200">
                                                        <td></td>
                                                        <td className="px-6 py-3">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-stone-300 font-mono text-xs w-8 flex-shrink-0">{itemIdx + 1}.{subitemIdx + 1}</span>
                                                                <input
                                                                    type="text"
                                                                    value={subitem.description}
                                                                    onChange={e => updateListSubitem(subitem.id, { description: e.target.value })}
                                                                    className="w-full bg-transparent border-none focus:ring-1 focus:ring-stone-200 rounded px-2 py-1 text-sm text-stone-700"
                                                                    placeholder="Descreva o item..."
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <select
                                                                value={subitem.paymentMethod}
                                                                onChange={e => updateListSubitem(subitem.id, { paymentMethod: e.target.value })}
                                                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-stone-200 rounded px-2 py-1 text-sm text-stone-600 text-center"
                                                            >
                                                                <option value="Dinheiro">Dinheiro</option>
                                                                <option value="PIX">PIX</option>
                                                                <option value="Cartão">Cartão</option>
                                                                <option value="Boleto">Boleto</option>
                                                                <option value="Transferência">Transferência</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            <input
                                                                type="number"
                                                                value={subitem.quantity}
                                                                onChange={e => updateListSubitem(subitem.id, { quantity: Math.max(0, Number(e.target.value)) })}
                                                                className="w-16 bg-transparent border-none focus:ring-1 focus:ring-stone-200 rounded px-2 py-1 text-sm text-stone-600 text-center"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <div className="flex items-center justify-end space-x-1">
                                                                <span className="text-stone-400 text-xs">R$</span>
                                                                <input
                                                                    type="number"
                                                                    value={subitem.value}
                                                                    onChange={e => updateListSubitem(subitem.id, { value: Math.max(0, Number(e.target.value)) })}
                                                                    className="w-24 bg-transparent border-none focus:ring-1 focus:ring-stone-200 rounded px-2 py-1 text-sm text-stone-600 text-right"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 text-right font-medium text-stone-700">
                                                            {formatCurrency(subitem.value * subitem.quantity)}
                                                        </td>
                                                        <td className="px-6 py-3 min-w-[200px]">
                                                            <textarea
                                                                rows={2}
                                                                value={subitem.observation}
                                                                onChange={e => updateListSubitem(subitem.id, { observation: e.target.value })}
                                                                className="w-full bg-transparent border-none focus:ring-1 focus:ring-stone-200 rounded px-2 py-1 text-sm text-stone-500 italic whitespace-pre-wrap break-words overflow-hidden"
                                                                placeholder="Observações..."
                                                                onInput={(e) => {
                                                                    const target = e.target as HTMLTextAreaElement;
                                                                    target.style.height = 'auto';
                                                                    target.style.height = `${target.scrollHeight}px`;
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3 text-center opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center space-x-1">
                                                            <button
                                                                onClick={() => handleMoveSubitem(subitem.id, item.id, 'up')}
                                                                disabled={getSubitems(item.id).indexOf(subitem) === 0}
                                                                className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-20"
                                                            >
                                                                <ArrowUp size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleMoveSubitem(subitem.id, item.id, 'down')}
                                                                disabled={getSubitems(item.id).indexOf(subitem) === getSubitems(item.id).length - 1}
                                                                className="p-1 text-stone-300 hover:text-stone-600 disabled:opacity-20"
                                                            >
                                                                <ArrowDown size={14} />
                                                            </button>
                                                            <button onClick={() => deleteListSubitem(subitem.id)} className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Add Subitem Button in table footer style */}
                                                <tr>
                                                    <td></td>
                                                    <td colSpan={7} className="px-6 py-2">
                                                        <button
                                                            onClick={() => handleAddSubitem(item.id)}
                                                            className="text-xs text-stone-400 hover:text-emerald-600 flex items-center space-x-1 transition-colors group"
                                                        >
                                                            <Plus size={12} className="group-hover:scale-125 transition-transform" />
                                                            <span>Adicionar sub-item ao serviço {item.name}</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                    </React.Fragment>
                                ))
                            )}

                            {isAddingService && (
                                <tr className="bg-emerald-50/30 animate-in slide-in-from-bottom-2 duration-300">
                                    <td className="px-6 py-4"></td>
                                    <td className="px-6 py-4" colSpan={6}>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="Nome do novo serviço..."
                                                value={newServiceItemName}
                                                onChange={e => setNewServiceItemName(e.target.value)}
                                                className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none flex-1"
                                                onKeyDown={e => e.key === 'Enter' && handleAddService()}
                                            />
                                            <button onClick={handleAddService} className="text-emerald-600 p-1.5 hover:bg-emerald-100 rounded-lg transition-colors">
                                                <Save size={18} />
                                            </button>
                                            <button onClick={() => setIsAddingService(false)} className="text-stone-400 p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"></td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PDF Preview Modal */}
            {isPreviewingPDF && pdfUrl && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
                        <div className="p-4 border-b bg-stone-50 rounded-t-2xl flex items-center justify-between">
                            <h3 className="text-lg font-bold text-stone-900 flex items-center space-x-2">
                                <FileText className="text-stone-500" size={20} />
                                <span>Prévia do Relatório</span>
                            </h3>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleGeneratePDF('save')}
                                    className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all text-sm font-medium shadow-sm active:scale-95"
                                >
                                    <Download size={18} />
                                    <span>Baixar PDF</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
                                        setIsPreviewingPDF(false);
                                        setPdfUrl(null);
                                    }}
                                    className="p-2 hover:bg-stone-200 text-stone-500 hover:text-stone-700 rounded-lg transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-stone-100 p-4 relative overflow-hidden">
                            <iframe
                                src={pdfUrl}
                                className="w-full h-full rounded-lg shadow-inner bg-white"
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
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider truncate">{title}</p>
                <div className="flex items-baseline space-x-1">
                    <p className="text-xl font-bold text-stone-900 truncate">
                        {formatCurrency(value)}
                    </p>
                </div>
            </div>
        </div>
    );
}
