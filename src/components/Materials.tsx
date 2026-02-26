import { useState, FormEvent, MouseEvent, useEffect } from 'react';
import { useStore } from '../store';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Hammer, AlertTriangle, ArrowDown, ArrowUp, CreditCard, Copy, Edit2, Trash2, Settings, Printer } from 'lucide-react';
import { MaterialCost, PaymentMethod } from '../types';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { PageHeader } from './ui/PageHeader';
import { Modal } from './ui/Modal';
import { ConfirmationModal } from './ui/ConfirmationModal';

export function Materials() {
  const { materialCosts, stages, creditCards, addMaterialCost, updateMaterialCost, deleteMaterialCost } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    stageId: '',
    description: '',
    unit: 'un',
    paymentMethod: 'PIX' as PaymentMethod,
    plannedQuantity: 0,
    plannedUnitPrice: 0,
    realQuantity: 0,
    realUnitPrice: 0,
    date: new Date().toISOString().split('T')[0],
    isHidden: false
  });

  // Ensure stageId is set when stages are loaded
  useEffect(() => {
    if (!formData.stageId && stages.length > 0 && !editingId) {
      setFormData(prev => ({ ...prev, stageId: stages[0].id }));
    }
  }, [stages, formData.stageId, editingId]);

  const handleOpenModal = (cost?: MaterialCost) => {
    setError(null);
    if (cost) {
      setEditingId(cost.id);
      setFormData({
        stageId: cost.stageId,
        description: cost.description,
        unit: cost.unit,
        paymentMethod: cost.paymentMethod || 'PIX',
        plannedQuantity: cost.plannedQuantity,
        plannedUnitPrice: cost.plannedUnitPrice,
        realQuantity: cost.realQuantity,
        realUnitPrice: cost.realUnitPrice,
        date: cost.date || new Date().toISOString().split('T')[0],
        isHidden: cost.isHidden || false
      });
    } else {
      setEditingId(null);
      setFormData({
        stageId: stages[0]?.id || '',
        description: '',
        unit: 'un',
        paymentMethod: 'PIX',
        plannedQuantity: 0,
        plannedUnitPrice: 0,
        realQuantity: 0,
        realUnitPrice: 0,
        date: new Date().toISOString().split('T')[0],
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
        ? await updateMaterialCost(editingId, formData)
        : await addMaterialCost(formData);

      if (result.error) {
        setError('Erro ao salvar material. Tente novamente.');
      } else {
        setIsModalOpen(false);
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

  const handleCopy = (cost: MaterialCost, e: MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setFormData({
      stageId: cost.stageId,
      description: `${cost.description} (Cópia)`,
      unit: cost.unit,
      paymentMethod: cost.paymentMethod || 'PIX',
      plannedQuantity: cost.plannedQuantity,
      plannedUnitPrice: cost.plannedUnitPrice,
      realQuantity: cost.realQuantity,
      realUnitPrice: cost.realUnitPrice,
      date: cost.date || new Date().toISOString().split('T')[0],
      isHidden: cost.isHidden || false
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      setIsSubmitting(true);
      setError(null);
      const { error } = await deleteMaterialCost(itemToDelete);
      setIsSubmitting(false);
      if (!error) {
        setItemToDelete(null);
      } else {
        setError('Erro ao excluir material.');
      }
    }
  };

  const getStageName = (id: string) => stages.find(s => s.id === id)?.name || 'Desconhecida';

  const unitOptions = [
    { value: 'un', label: 'un' },
    { value: 'm²', label: 'm²' },
    { value: 'm³', label: 'm³' },
    { value: 'kg', label: 'kg' },
    { value: 'saco', label: 'saco' },
    { value: 'litro', label: 'litro' },
    { value: 'milheiro', label: 'milheiro' },
  ];

  const paymentOptions = [
    { value: 'PIX', label: 'PIX' },
    { value: 'Dinheiro', label: 'Dinheiro' },
    ...creditCards.map(card => ({ value: card.name, label: `Cartão: ${card.name}` })),
    { value: 'Cartão de Débito', label: 'Cartão de Débito' },
    { value: 'Boleto', label: 'Boleto' },
    { value: 'Transferência', label: 'Transferência' },
  ];

  const stageOptions = stages.map(s => ({ value: s.id, label: s.isHidden ? `${s.name} (Oculta)` : s.name }));

  const [showHidden, setShowHidden] = useState(false);



  const filteredMaterials = materialCosts.filter(cost => showHidden || !cost.isHidden);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materiais"
        description="Controle de insumos e variação de preços."
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

            <Button onClick={() => handleOpenModal()} variant="primary">
              <Plus size={16} />
              Novo Material
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Insumo / Etapa</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Planejado</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Realizado</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-center">Variação Unit.</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Desvio Total</th>
                <th className="p-4 w-10 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-500">
                    Nenhum material cadastrado nesta etapa.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((cost) => {
                  const plannedTotal = cost.plannedQuantity * cost.plannedUnitPrice;
                  const realTotal = cost.realQuantity * cost.realUnitPrice;
                  const deviation = plannedTotal - realTotal;
                  const isOverBudget = deviation < 0;

                  const unitPriceDiff = cost.realUnitPrice - cost.plannedUnitPrice;
                  const isPriceUp = unitPriceDiff > 0;

                  return (
                    <tr key={cost.id} className={cn("hover:bg-stone-50/50 transition-colors group cursor-pointer", cost.isHidden && "print:hidden")}>
                      <td className="p-4">
                        <div className="font-medium text-stone-900 flex items-center gap-2">
                          <Hammer size={16} className={cn("text-stone-400", cost.isHidden && "text-stone-300")} />
                          <span className={cn(cost.isHidden && "text-stone-400 line-through")}>
                            {cost.description}
                          </span>
                          {cost.isHidden && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded ml-2">OCULTO</span>}
                        </div>
                        <div className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                          <span>{getStageName(cost.stageId)}</span>
                          {cost.date && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                                {new Date(cost.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            </>
                          )}
                          {cost.paymentMethod && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <CreditCard size={12} />
                                {cost.paymentMethod}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-mono text-stone-900">{formatCurrency(plannedTotal)}</div>
                        <div className="text-xs text-stone-500 mt-1 font-mono">
                          {cost.plannedQuantity} {cost.unit} × {formatCurrency(cost.plannedUnitPrice)}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-mono font-medium text-stone-900">{formatCurrency(realTotal)}</div>
                        <div className="text-xs text-stone-500 mt-1 font-mono">
                          {cost.realQuantity} {cost.unit} × {formatCurrency(cost.realUnitPrice)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium font-mono",
                          isPriceUp ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                        )}>
                          {isPriceUp ? <ArrowDown size={12} className="rotate-180" /> : <ArrowDown size={12} />}
                          {formatCurrency(Math.abs(unitPriceDiff))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className={cn(
                          "font-mono text-sm flex items-center justify-end gap-1",
                          isOverBudget ? "text-red-600" : "text-emerald-600"
                        )}>
                          {isOverBudget && <AlertTriangle size={14} />}
                          {formatCurrency(deviation)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                          <button
                            onClick={(e) => handleCopy(cost, e)}
                            className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Duplicar"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(cost); }}
                            className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(cost.id, e)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div >

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Material' : 'Novo Material'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Etapa da Obra"
              required
              value={formData.stageId}
              options={stageOptions}
              onChange={e => setFormData({ ...formData, stageId: e.target.value })}
            />
            <Select
              label="Forma de Pagamento"
              value={formData.paymentMethod}
              options={paymentOptions}
              onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Descrição"
              required
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
            <Select
              label="Unidade"
              value={formData.unit}
              options={unitOptions}
              onChange={e => setFormData({ ...formData, unit: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data da Compra"
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Qtd. Planejada"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.plannedQuantity}
              onChange={e => setFormData({ ...formData, plannedQuantity: Number(e.target.value) })}
            />
            <Input
              label="Preço Unit. Planejado"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.plannedUnitPrice}
              onChange={e => setFormData({ ...formData, plannedUnitPrice: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Qtd. Real"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.realQuantity}
              onChange={e => setFormData({ ...formData, realQuantity: Number(e.target.value) })}
            />
            <Input
              label="Preço Unit. Real"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.realUnitPrice}
              onChange={e => setFormData({ ...formData, realUnitPrice: Number(e.target.value) })}
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
              Ocultar este material (Novo Material ocultado)
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="secondary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Salvar Material')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => !isSubmitting && setItemToDelete(null)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este material?"
        isLoading={isSubmitting}
        error={error}
      />
    </div >
  );
}
