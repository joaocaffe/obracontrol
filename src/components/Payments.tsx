import { useState, FormEvent, MouseEvent } from 'react';
import { useStore } from '../store';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Plus, DollarSign, Edit2, Trash2, Printer, AlertTriangle, Copy, Eye, EyeOff } from 'lucide-react';
import { Payment } from '../types';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { PageHeader } from './ui/PageHeader';
import { Modal } from './ui/Modal';
import { ConfirmationModal } from './ui/ConfirmationModal';

export function Payments() {
    const { payments, creditCards, addPayment, updatePayment, deletePayment } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        recipient: '',
        description: '',
        amount: 0,
        paymentMethod: 'PIX',
        isHidden: false
    });

    const filteredPayments = payments
        .filter(p => p.date.startsWith(selectedMonth))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthlyTotal = filteredPayments.reduce((acc, p) => acc + p.amount, 0);

    const handleOpenModal = (payment?: Payment) => {
        setError(null);
        if (payment) {
            setEditingId(payment.id);
            setFormData({
                date: payment.date,
                recipient: payment.recipient,
                description: payment.description,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                isHidden: payment.isHidden || false
            });
        } else {
            setEditingId(null);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                recipient: '',
                description: '',
                amount: 0,
                paymentMethod: 'PIX',
                isHidden: false
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const result = editingId
                ? await updatePayment(editingId, formData)
                : await addPayment(formData);

            if (result.error) {
                setError('Erro ao salvar pagamento. Tente novamente.');
            } else {
                setIsModalOpen(false);
            }
        } catch (err) {
            setError('Ocorreu um erro inesperado.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = (payment: Payment, e: MouseEvent) => {
        e.stopPropagation();
        setEditingId(null);
        setFormData({
            date: payment.date,
            recipient: `${payment.recipient} (Cópia)`,
            description: payment.description,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            isHidden: false
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string, e: MouseEvent) => {
        e.stopPropagation();
        setItemToDelete(id);
    };

    const confirmDelete = async () => {
        if (itemToDelete) {
            setIsSubmitting(true);
            setError(null);
            const { error } = await deletePayment(itemToDelete);
            setIsSubmitting(false);
            if (!error) {
                setItemToDelete(null);
            } else {
                setError('Erro ao excluir pagamento.');
            }
        }
    };

    const paymentOptions = [
        { value: 'PIX', label: 'PIX' },
        { value: 'Dinheiro', label: 'Dinheiro' },
        ...creditCards.map(card => ({ value: card.name, label: `Cartão: ${card.name}` })),
        { value: 'Cartão de Débito', label: 'Cartão de Débito' },
        { value: 'Boleto', label: 'Boleto' },
        { value: 'Transferência', label: 'Transferência' },
    ];

    const [showHidden, setShowHidden] = useState(false);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Pagamentos"
                description="Controle detalhado de saídas e pagamentos realizados."
                action={
                    <div className="flex gap-2">
                        <Button
                            onClick={() => window.print()}
                            variant="outline"
                            className="bg-white"
                        >
                            <Printer size={16} />
                            Gerar Relatório
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowHidden(!showHidden)}
                            className={cn(showHidden && "bg-stone-100")}
                        >
                            {showHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                            {showHidden ? "Ocultar Ocultos" : "Mostrar Ocultos"}
                        </Button>
                        <Button onClick={() => handleOpenModal()} variant="primary">
                            <Plus size={16} />
                            Novo Pagamento
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col justify-between">
                    <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Filtrar por Mês</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                    />
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 md:col-span-2 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Total no Período</div>
                        <div className="text-2xl font-bold text-stone-900">{formatCurrency(monthlyTotal)}</div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                        <DollarSign size={24} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 border-b border-stone-200">
                                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Data</th>
                                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Destinatário</th>
                                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Descrição</th>
                                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Valor</th>
                                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Forma</th>
                                <th className="p-4 w-10 print:hidden"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {filteredPayments.filter(p => showHidden || !p.isHidden).length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-stone-500 text-sm">
                                        Nenhum pagamento registrado para este período.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.filter(p => showHidden || !p.isHidden).map((payment) => (
                                    <tr key={payment.id} className={cn("hover:bg-stone-50/50 transition-colors group", payment.isHidden && "print:hidden")}>
                                        <td className="p-4 text-sm font-mono text-stone-600">
                                            {formatDate(payment.date)}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-stone-900">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(payment.isHidden && "text-stone-400 line-through")}>
                                                    {payment.recipient}
                                                </span>
                                                {payment.isHidden && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded ml-2 uppercase">Oculto</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-stone-600">
                                            {payment.description}
                                        </td>
                                        <td className="p-4 text-right font-mono font-medium text-stone-900">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="p-4 text-sm text-stone-600">
                                            {payment.paymentMethod}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                                <button
                                                    onClick={(e) => handleCopy(payment, e)}
                                                    className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                    title="Duplicar"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(payment); }}
                                                    className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(payment.id, e)}
                                                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Editar Pagamento' : 'Novo Pagamento'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
                            <AlertTriangle size={16} />
                            {error}
                        </div>
                    )}
                    <Input
                        label="Data"
                        type="date"
                        required
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                    <Input
                        label="Destinatário"
                        placeholder="Ex: Madeireira Silva"
                        required
                        value={formData.recipient}
                        onChange={e => setFormData({ ...formData, recipient: e.target.value })}
                    />
                    <Input
                        label="Descrição"
                        placeholder="Ex: Pagamento de vigas e pilares"
                        required
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Valor"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                        />
                        <Select
                            label="Forma de Pagamento"
                            value={formData.paymentMethod}
                            options={paymentOptions}
                            onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center gap-2 py-2">
                        <input
                            type="checkbox"
                            id="isHidden"
                            className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                            checked={formData.isHidden}
                            onChange={e => setFormData({ ...formData, isHidden: e.target.checked })}
                        />
                        <label htmlFor="isHidden" className="text-sm font-medium text-stone-700">
                            Ocultar este pagamento (Novo Pagamento ocultado)
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button variant="secondary" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Salvar Pagamento')}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => !isSubmitting && setItemToDelete(null)}
                onConfirm={confirmDelete}
                title="Confirmar Exclusão"
                message="Tem certeza que deseja excluir este pagamento?"
                isLoading={isSubmitting}
                error={error}
            />
        </div>
    );
}
