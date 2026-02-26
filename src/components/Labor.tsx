import { useState, FormEvent, MouseEvent, useEffect } from 'react';
import { useStore } from '../store';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import { Plus, Users, Edit2, Trash2, Printer, Briefcase, AlertTriangle, Copy, Calendar as CalendarIcon } from 'lucide-react';
import { startOfWeek, endOfWeek, parseISO, eachDayOfInterval, format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMemo } from 'react';
import { LaborRole, ContractType, LaborCost } from '../types';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { PageHeader } from './ui/PageHeader';
import { Modal } from './ui/Modal';
import { ConfirmationModal } from './ui/ConfirmationModal';

export function Labor() {
  const { laborCosts, stages, laborRoles, addLaborCost, updateLaborCost, deleteLaborCost, addLaborRole, updateLaborRole, deleteLaborRole } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedWeekDate, setSelectedWeekDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekInfo = useMemo(() => {
    const start = startOfWeek(parseISO(selectedWeekDate), { weekStartsOn: 1 });
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return { start, end };
  }, [selectedWeekDate]);

  const weeklyTotal = useMemo(() => {
    const { start, end } = weekInfo;

    return laborCosts.reduce((acc, cost) => {
      if (!cost.startDate || !cost.endDate || cost.isHidden) return acc;

      const costStart = parseISO(cost.startDate);
      const costEnd = parseISO(cost.endDate);

      let overlapDays = 0;
      const daysInWeek = eachDayOfInterval({ start, end });

      daysInWeek.forEach(day => {
        if (day >= costStart && day <= costEnd) {
          overlapDays++;
        }
      });

      if (overlapDays === 0) return acc;

      if (cost.contractType === 'Diária') {
        const rate = cost.realDailyRate || cost.plannedDailyRate || 0;
        return acc + (overlapDays * rate);
      } else {
        // Empreitada: Distribute total over total days
        const total = cost.realDailyRate || cost.plannedDailyRate || 0;
        const totalProjectDays = eachDayOfInterval({ start: costStart, end: costEnd }).length;
        if (totalProjectDays === 0) return acc;
        return acc + (total / totalProjectDays) * overlapDays;
      }
    }, 0);
  }, [laborCosts, weekInfo]);

  const [formData, setFormData] = useState({
    stageId: stages[0]?.id || '',
    role: (laborRoles[0] || 'Pedreiro') as LaborRole,
    workerName: '',
    contractType: 'Diária' as ContractType,
    plannedDays: 0,
    plannedDailyRate: 0,
    realDays: 0,
    realDailyRate: 0,
    startDate: '',
    endDate: '',
    isHidden: false
  });

  // Ensure stageId and role are set when data is loaded
  useEffect(() => {
    if (!formData.stageId && stages.length > 0) {
      setFormData(prev => ({ ...prev, stageId: stages[0].id }));
    }
    if (!formData.role && laborRoles.length > 0) {
      setFormData(prev => ({ ...prev, role: laborRoles[0] as LaborRole }));
    }
  }, [stages, laborRoles, formData.stageId, formData.role]);

  const handleOpenModal = (cost?: LaborCost) => {
    setError(null);
    if (cost) {
      setEditingId(cost.id);
      setFormData({
        stageId: cost.stageId,
        role: cost.role,
        workerName: cost.workerName || '',
        contractType: cost.contractType,
        plannedDays: cost.plannedDays,
        plannedDailyRate: cost.plannedDailyRate,
        realDays: cost.realDays,
        realDailyRate: cost.realDailyRate,
        startDate: cost.startDate || '',
        endDate: cost.endDate || '',
        isHidden: cost.isHidden || false
      });
    } else {
      setEditingId(null);
      setFormData({
        stageId: stages[0]?.id || '',
        role: (laborRoles[0] || 'Pedreiro') as LaborRole,
        workerName: '',
        contractType: 'Diária',
        plannedDays: 0,
        plannedDailyRate: 0,
        realDays: 0,
        realDailyRate: 0,
        startDate: '',
        endDate: '',
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
        ? await updateLaborCost(editingId, formData)
        : await addLaborCost(formData);

      if (result.error) {
        setError('Erro ao salvar contrato. Tente novamente.');
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

  const handleCopy = (cost: LaborCost, e: MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setFormData({
      stageId: cost.stageId,
      role: cost.role,
      workerName: cost.workerName ? `${cost.workerName} (Cópia)` : '',
      contractType: cost.contractType,
      plannedDays: cost.plannedDays,
      plannedDailyRate: cost.plannedDailyRate,
      realDays: cost.realDays,
      realDailyRate: cost.realDailyRate,
      startDate: cost.startDate || '',
      endDate: cost.endDate || '',
      isHidden: cost.isHidden || false
    });
    setIsModalOpen(true);
  };

  const handleAddRole = (e: FormEvent) => {
    e.preventDefault();
    if (newRoleName.trim()) {
      addLaborRole(newRoleName.trim());
      setNewRoleName('');
    }
  };

  const handleUpdateRole = (oldRole: string) => {
    const newName = prompt('Novo nome para o profissional:', oldRole);
    if (newName && newName.trim() && newName !== oldRole) {
      updateLaborRole(oldRole, newName.trim());
    }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      setIsSubmitting(true);
      setError(null);
      const { error } = await deleteLaborCost(itemToDelete);
      setIsSubmitting(false);
      if (!error) {
        setItemToDelete(null);
      } else {
        setError('Erro ao excluir contrato.');
      }
    }
  };

  const getStageName = (id: string) => stages.find(s => s.id === id)?.name || 'Desconhecida';

  const roleOptions = laborRoles.map(role => ({ value: role, label: role }));

  const contractOptions = [
    { value: 'Diária', label: 'Diária' },
    { value: 'Empreitada', label: 'Empreitada' },
  ];

  const stageOptions = stages.map(s => ({ value: s.id, label: s.isHidden ? `${s.name} (Oculta)` : s.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mão de Obra"
        description="Gestão de contratos e pagamentos da equipe."
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
            <Button onClick={() => setIsRolesModalOpen(true)} variant="outline">
              <Users size={16} />
              Profissionais
            </Button>
            <Button onClick={() => handleOpenModal()} variant="primary">
              <Plus size={16} />
              Nova Mão de Obra
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 no-print">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block font-sans">Selecionar Semana</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="date"
              value={selectedWeekDate}
              onChange={(e) => setSelectedWeekDate(e.target.value)}
              className="w-full border border-stone-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow bg-stone-50/50"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 md:col-span-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
              Total na Semana ({format(weekInfo.start, 'dd/MM')} a {format(weekInfo.end, 'dd/MM')})
            </div>
            <div className="text-2xl font-bold text-stone-900">{formatCurrency(weeklyTotal)}</div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
            <Briefcase size={28} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Profissional / Etapa</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Contrato</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Planejado</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Realizado</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Desvio</th>
                <th className="p-4 w-10 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {laborCosts.filter(cost => showHidden || !cost.isHidden).map((cost) => {
                const plannedTotal = cost.plannedDays * cost.plannedDailyRate;
                const realTotal = cost.realDays * cost.realDailyRate;
                const deviation = plannedTotal - realTotal;
                const isOverBudget = deviation < 0;

                return (
                  <tr key={cost.id} className={cn("hover:bg-stone-50/50 transition-colors group", cost.isHidden && "print:hidden")}>
                    <td className="p-4">
                      <div className="font-medium text-stone-900 flex items-center gap-2">
                        <Users size={16} className={cn("text-stone-400", cost.isHidden && "text-stone-300")} />
                        <span className={cn(cost.isHidden && "text-stone-400 line-through")}>
                          {cost.workerName ? cost.workerName : cost.role}
                        </span>
                        {cost.isHidden && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded ml-2">OCULTO</span>}
                      </div>
                      <div className="text-xs text-stone-500 mt-1">
                        {cost.workerName ? `${cost.role} • ` : ''}{getStageName(cost.stageId)}
                        {(cost.startDate || cost.endDate) && (
                          <>
                            <span className="mx-1">•</span>
                            <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                              {cost.startDate ? formatDate(cost.startDate) : '...'} - {cost.endDate ? formatDate(cost.endDate) : '...'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-stone-400" />
                        <span className="text-sm font-medium text-stone-700">{cost.contractType}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono text-stone-900">{formatCurrency(plannedTotal)}</div>
                      <div className="text-xs text-stone-500 mt-1 font-mono">
                        {cost.plannedDays}d × {formatCurrency(cost.plannedDailyRate)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono font-medium text-stone-900">{formatCurrency(realTotal)}</div>
                      <div className="text-xs text-stone-500 mt-1 font-mono">
                        {cost.realDays}d × {formatCurrency(cost.realDailyRate)}
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
                      {/* Actions */}
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Contrato' : 'Novo Contrato'}
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
            <Input
              label="Nome do Funcionário"
              placeholder="Ex: João Silva"
              value={formData.workerName}
              onChange={e => setFormData({ ...formData, workerName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Profissional"
              value={formData.role}
              options={roleOptions}
              onChange={e => setFormData({ ...formData, role: e.target.value as LaborRole })}
            />
            <Select
              label="Tipo de Contrato"
              value={formData.contractType}
              options={contractOptions}
              onChange={e => setFormData({ ...formData, contractType: e.target.value as ContractType })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data de Início"
              type="date"
              value={formData.startDate}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="Data de Fim"
              type="date"
              value={formData.endDate}
              onChange={e => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dias Planejados"
              type="number"
              min="0"
              required
              value={formData.plannedDays}
              onChange={e => setFormData({ ...formData, plannedDays: Number(e.target.value) })}
            />
            <Input
              label="Valor/Dia Planejado"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.plannedDailyRate}
              onChange={e => setFormData({ ...formData, plannedDailyRate: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Dias Reais"
              type="number"
              min="0"
              required
              value={formData.realDays}
              onChange={e => setFormData({ ...formData, realDays: Number(e.target.value) })}
            />
            <Input
              label="Valor/Dia Real"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.realDailyRate}
              onChange={e => setFormData({ ...formData, realDailyRate: Number(e.target.value) })}
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
              Ocultar este contrato (Novo Contratado ocultado)
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="secondary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Salvar Contrato')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRolesModalOpen}
        onClose={() => setIsRolesModalOpen(false)}
        title="Gerenciar Profissionais"
      >
        <div className="space-y-4">
          <form onSubmit={handleAddRole} className="flex gap-2">
            <Input
              placeholder="Novo profissional (ex: Pintor)"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="secondary">Adicionar</Button>
          </form>

          <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto border rounded-xl">
            {laborRoles.map(role => (
              <div key={role} className="p-3 flex items-center justify-between group hover:bg-stone-50">
                <span className="text-sm font-medium text-stone-700">{role}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => handleUpdateRole(role)}>
                    <Edit2 size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteLaborRole(role)}>
                    <Trash2 size={14} className="text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => !isSubmitting && setItemToDelete(null)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este contrato de mão de obra?"
        isLoading={isSubmitting}
        error={error}
      />
    </div>
  );
}
