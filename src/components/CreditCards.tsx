import { useState, FormEvent, MouseEvent, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import { Plus, CreditCard as CardIcon, Edit2, Trash2, Copy, Settings, Calendar, Info, ArrowUpAz, ArrowDownAz, Printer, AlertTriangle } from 'lucide-react';
import { CreditCardExpense, CreditCard as CreditCardType } from '../types';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { PageHeader } from './ui/PageHeader';
import { Modal } from './ui/Modal';
import { Card as CardComponent } from './ui/Card';
import { Badge } from './ui/Badge';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { addMonths, parseISO, format } from 'date-fns';

export function CreditCards() {
  const {
    creditCards,
    creditCardExpenses,
    addCreditCardExpense,
    updateCreditCardExpense,
    deleteCreditCardExpense,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard
  } = useStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<'purchaseDate' | 'invoiceDate' | 'description' | 'totalValue'>('purchaseDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showHidden, setShowHidden] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    creditCardId: creditCards[0]?.id || '',
    purchaseDate: new Date().toISOString().split('T')[0],
    invoiceDate: '',
    location: '',
    description: '',
    totalValue: 0,
    installments: '1',
    isHidden: false
  });

  const [cardFormData, setCardFormData] = useState({
    name: ''
  });

  // Ensure creditCardId is set when cards are loaded
  useEffect(() => {
    if (!formData.creditCardId && creditCards.length > 0) {
      setFormData(prev => ({ ...prev, creditCardId: creditCards[0].id }));
    }
  }, [creditCards, formData.creditCardId]);

  const installmentDetails = useMemo(() => {
    const total = formData.totalValue || 0;
    const installments = parseInt(formData.installments) || 1;
    const value = total / installments;

    let lastDateStr = '';
    if (formData.invoiceDate) {
      try {
        const firstInvoiceDate = parseISO(formData.invoiceDate);
        const lastInvoiceDate = addMonths(firstInvoiceDate, installments - 1);
        lastDateStr = format(lastInvoiceDate, 'yyyy-MM-dd');
      } catch (e) {
        console.error("Error calculating last installment date:", e);
      }
    }

    return {
      value,
      lastDate: lastDateStr
    };
  }, [formData.totalValue, formData.installments, formData.invoiceDate]);

  const sortedExpenses = useMemo(() => {
    return [...creditCardExpenses].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'totalValue') {
        comparison = a[sortBy] - b[sortBy];
      } else {
        comparison = (a[sortBy] || '').localeCompare(b[sortBy] || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [creditCardExpenses, sortBy, sortOrder]);

  const filteredSortedExpenses = useMemo(() => {
    return sortedExpenses.filter(e => showHidden || !e.isHidden);
  }, [sortedExpenses, showHidden]);

  const cardTotalsForMonth = useMemo(() => {
    const totals: Record<string, number> = {};
    const [year, month] = selectedMonth.split('-').map(Number);
    const targetDate = new Date(year, month - 1, 1);

    creditCardExpenses.forEach(expense => {
      if (!expense.invoiceDate || !expense.installments) return;

      const installments = parseInt(expense.installments) || 1;
      const installmentValue = expense.totalValue / installments;
      const firstInvoiceDate = parseISO(expense.invoiceDate);

      // Each installment's month
      for (let i = 0; i < installments; i++) {
        const currentInstallmentDate = addMonths(firstInvoiceDate, i);
        if (
          currentInstallmentDate.getFullYear() === year &&
          (currentInstallmentDate.getMonth() + 1) === month
        ) {
          totals[expense.creditCardId] = (totals[expense.creditCardId] || 0) + installmentValue;
        }
      }
    });

    return totals;
  }, [creditCardExpenses, selectedMonth]);

  const handleOpenModal = (expense?: CreditCardExpense) => {
    setError(null);
    if (expense) {
      setEditingId(expense.id);
      setFormData({
        creditCardId: expense.creditCardId,
        purchaseDate: expense.purchaseDate,
        invoiceDate: expense.invoiceDate,
        location: expense.location,
        description: expense.description,
        totalValue: expense.totalValue,
        installments: expense.installments,
        isHidden: expense.isHidden || false
      });
    } else {
      setEditingId(null);
      setFormData({
        creditCardId: creditCards[0]?.id || '',
        purchaseDate: new Date().toISOString().split('T')[0],
        invoiceDate: '',
        location: '',
        description: '',
        totalValue: 0,
        installments: '1',
        isHidden: false
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenCardModal = () => {
    setEditingCardId(null);
    setCardFormData({ name: '' });
    setIsCardModalOpen(true);
  };

  const handleEditCard = (card: CreditCardType) => {
    setEditingCardId(card.id);
    setCardFormData({ name: card.name });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = editingId
        ? await updateCreditCardExpense(editingId, formData)
        : await addCreditCardExpense(formData);

      if (result.error) {
        setError('Erro ao salvar despesa. Tente novamente.');
      } else {
        setIsModalOpen(false);
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = editingCardId
        ? await updateCreditCard(editingCardId, cardFormData)
        : await addCreditCard(cardFormData);

      if (result.error) {
        setError('Erro ao salvar cartão.');
      } else {
        setEditingCardId(null);
        setCardFormData({ name: '' });
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(id);
  };

  const handleDeleteCard = (id: string) => {
    setCardToDelete(id);
  };

  const handleCopy = (expense: CreditCardExpense, e: MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setFormData({
      creditCardId: expense.creditCardId,
      purchaseDate: expense.purchaseDate,
      invoiceDate: expense.invoiceDate,
      location: expense.location,
      description: `${expense.description} (Cópia)`,
      totalValue: expense.totalValue,
      installments: expense.installments,
      isHidden: expense.isHidden || false
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      setIsSubmitting(true);
      const { error } = await deleteCreditCardExpense(itemToDelete);
      setIsSubmitting(false);
      if (!error) {
        setItemToDelete(null);
      } else {
        alert('Erro ao excluir despesa.');
      }
    }
  };

  const confirmDeleteCard = async () => {
    if (cardToDelete) {
      setIsSubmitting(true);
      const { error } = await deleteCreditCard(cardToDelete);
      setIsSubmitting(false);
      if (!error) {
        setCardToDelete(null);
      } else {
        alert('Erro ao excluir cartão.');
      }
    }
  };

  const getCardName = (id: string) => creditCards.find(c => c.id === id)?.name || 'Cartão Excluído';

  const cardOptions = creditCards.map(c => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartões de Crédito"
        description="Controle de despesas e faturas de cartão."
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
            <Button onClick={() => setShowHidden(!showHidden)} variant="ghost">
              {showHidden ? 'Ocultar Inativos' : 'Mostrar Ocultos'}
            </Button>
            <Button variant="outline" onClick={handleOpenCardModal}>
              <Settings size={16} />
              Gerenciar Cartões
            </Button>
            <Button variant="primary" onClick={() => handleOpenModal()}>
              <Plus size={16} />
              Nova Despesa
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">Mês da Fatura</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
          />
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 md:col-span-3">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 block text-center md:text-left">
            Total da Fatura por Cartão ({format(parseISO(`${selectedMonth}-01`), 'MMMM/yyyy')})
          </label>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            {creditCards.length === 0 ? (
              <span className="text-sm text-stone-400 italic">Nenhum cartão cadastrado.</span>
            ) : creditCards.map(card => (
              <div key={card.id} className="bg-stone-50 px-4 py-3 rounded-xl border border-stone-100 flex flex-col min-w-[140px]">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-none mb-1">{card.name}</span>
                <span className="text-lg font-bold text-stone-900 leading-none">
                  {formatCurrency(cardTotalsForMonth[card.id] || 0)}
                </span>
              </div>
            ))}
            <div className="bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100 flex flex-col min-w-[140px]">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider leading-none mb-1">TOTAL GERAL</span>
              <span className="text-lg font-bold text-emerald-700 leading-none">
                {formatCurrency(Object.values(cardTotalsForMonth).reduce((a, b) => a + b, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Ordenar por:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm bg-transparent border-none focus:ring-0 font-medium text-stone-900 cursor-pointer"
          >
            <option value="purchaseDate">Data de Compra</option>
            <option value="invoiceDate">Data de Fatura</option>
            <option value="description">Descrição</option>
            <option value="totalValue">Valor Total</option>
          </select>
        </div>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-md transition-colors"
          title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
        >
          {sortOrder === 'asc' ? <ArrowUpAz size={16} /> : <ArrowDownAz size={16} />}
        </button>
      </div>

      <CardComponent className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Descrição / Local</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Data Compra</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Data Fatura</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-center">Parcela</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Vlr. Parcela</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-center">Últ. Parcela</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Valor Total</th>
                <th className="p-4 w-10 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-stone-500">
                    Nenhuma despesa de cartão cadastrada.
                  </td>
                </tr>
              ) : (
                filteredSortedExpenses.map((expense) => (
                  <tr key={expense.id} className={cn("hover:bg-stone-50/50 transition-colors group cursor-pointer", expense.isHidden && "print:hidden")}>
                    <td className="p-4">
                      <div className="font-medium text-stone-900 flex items-center gap-2">
                        <CardIcon size={16} className={cn("text-stone-400", expense.isHidden && "text-stone-300")} />
                        <span className={cn(expense.isHidden && "text-stone-400 line-through")}>
                          {expense.description}
                        </span>
                        {expense.isHidden && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded ml-2">OCULTO</span>}
                      </div>
                      <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                        <span>{expense.location}</span>
                        <span>•</span>
                        <span className="font-medium">{getCardName(expense.creditCardId)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-stone-900 font-mono">{formatDate(expense.purchaseDate)}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-stone-900 font-mono">{formatDate(expense.invoiceDate)}</div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant="neutral" className="font-mono">
                        {expense.installments}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-sm font-mono text-stone-600">
                        {formatCurrency(expense.totalValue / (parseInt(expense.installments) || 1))}
                      </div>
                    </td>
                    <td className="p-4 text-center text-sm font-mono text-stone-600">
                      {expense.invoiceDate && expense.installments ? (
                        formatDate(format(addMonths(parseISO(expense.invoiceDate), (parseInt(expense.installments) || 1) - 1), 'yyyy-MM-dd'))
                      ) : '-'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono font-medium text-stone-900">{formatCurrency(expense.totalValue)}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                        <button
                          onClick={(e) => handleCopy(expense, e)}
                          className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Duplicar"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(expense); }}
                          className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(expense.id, e)}
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
      </CardComponent>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? 'Editar Despesa' : 'Nova Despesa'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
            <Select
              label="Cartão de Crédito"
              required
              options={cardOptions}
              value={formData.creditCardId}
              onChange={e => setFormData({ ...formData, creditCardId: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Data da Compra"
                type="date"
                required
                value={formData.purchaseDate}
                onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
              <Input
                label="Data da Fatura (1ª Parcela)"
                type="date"
                required
                value={formData.invoiceDate}
                onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })}
              />
            </div>

            <Input
              label="Local / Estabelecimento"
              placeholder="Ex: Leroy Merlin"
              required
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            />

            <Input
              label="Descrição"
              placeholder="Ex: Materiais elétricos"
              required
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Valor Total"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.totalValue}
                onChange={e => setFormData({ ...formData, totalValue: Number(e.target.value) })}
              />
              <Input
                label="Nº Parcelas"
                type="number"
                min="1"
                required
                value={formData.installments}
                onChange={e => setFormData({ ...formData, installments: e.target.value })}
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
                Ocultar esta despesa (Nova Despesa ocultada)
              </label>
            </div>

            {(formData.totalValue > 0 || formData.invoiceDate) && (
              <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-stone-500 uppercase tracking-tighter flex items-center gap-1 mb-1">
                    <Info size={10} /> Valor da Parcela
                  </div>
                  <div className="text-lg font-bold text-stone-900 leading-none">
                    {formatCurrency(installmentDetails.value)}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1 uppercase">
                    em {formData.installments}x
                  </div>
                </div>
                {installmentDetails.lastDate && (
                  <div>
                    <div className="text-[10px] font-bold text-stone-500 uppercase tracking-tighter flex items-center gap-1 mb-1">
                      <Calendar size={10} /> Última Parcela
                    </div>
                    <div className="text-lg font-bold text-stone-900 leading-none">
                      {formatDate(installmentDetails.lastDate)}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-1 uppercase">
                      Final do parcelamento
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button variant="secondary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Salvar Despesa')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <Modal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title="Gerenciar Cartões"
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
          <form onSubmit={handleCardSubmit} className="flex gap-2 mb-6">
            <Input
              placeholder="Nome do Cartão (ex: Nubank)"
              required
              className="flex-1"
              value={cardFormData.name}
              onChange={e => setCardFormData({ name: e.target.value })}
            />
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? '...' : (editingCardId ? 'Atualizar' : 'Adicionar')}
            </Button>
            {editingCardId && (
              <Button
                variant="ghost"
                type="button"
                disabled={isSubmitting}
                onClick={() => { setEditingCardId(null); setCardFormData({ name: '' }); setError(null); }}
              >
                Cancelar
              </Button>
            )}
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {creditCards.length === 0 ? (
              <p className="text-center text-sm text-stone-500 py-4">Nenhum cartão cadastrado.</p>
            ) : (
              creditCards.map(card => (
                <div key={card.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="flex items-center gap-2 font-medium text-stone-900">
                    <CardIcon size={16} className="text-stone-400" />
                    {card.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditCard(card)}
                      className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta despesa de cartão?"
      />

      <ConfirmationModal
        isOpen={!!cardToDelete}
        onClose={() => setCardToDelete(null)}
        onConfirm={confirmDeleteCard}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este cartão? As despesas vinculadas a ele ficarão sem cartão associado."
      />
    </div>
  );
}
