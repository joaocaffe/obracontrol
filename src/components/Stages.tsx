import { useState, FormEvent, MouseEvent } from 'react';
import { useStore } from '../store';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import { Plus, AlertTriangle, Edit2, Trash2, Copy, Eye, EyeOff, Printer } from 'lucide-react';
import { Status, Stage } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { PageHeader } from './ui/PageHeader';
import { Modal } from './ui/Modal';
import { ConfirmationModal } from './ui/ConfirmationModal';

export function Stages() {
  const { stages, laborCosts, materialCosts, addStage, updateStage, deleteStage } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    status: 'A iniciar' as Status,
    startDate: '',
    endDate: '',
    progress: 0,
    dependencies: [] as string[],
    isHidden: false
  });

  const [showHidden, setShowHidden] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = (stage?: Stage) => {
    setError(null);
    if (stage) {
      setEditingId(stage.id);
      setFormData({
        name: stage.name,
        status: stage.status,
        startDate: stage.startDate,
        endDate: stage.endDate,
        progress: stage.progress,
        dependencies: stage.dependencies,
        isHidden: stage.isHidden || false
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        status: 'A iniciar',
        startDate: '',
        endDate: '',
        progress: 0,
        dependencies: [],
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
        ? await updateStage(editingId, formData)
        : await addStage(formData);

      if (result.error) {
        setError('Erro ao salvar etapa. Tente novamente.');
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

  const handleCopy = (stage: Stage, e: MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setFormData({
      name: `${stage.name} (Cópia)`,
      status: stage.status,
      startDate: stage.startDate,
      endDate: stage.endDate,
      progress: stage.progress,
      dependencies: stage.dependencies,
      isHidden: false
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      setIsSubmitting(true);
      setError(null);
      const { error } = await deleteStage(itemToDelete);
      setIsSubmitting(false);
      if (!error) {
        setItemToDelete(null);
      } else {
        setError('Erro ao excluir etapa. Verifique se existem custos vinculados.');
      }
    }
  };

  const getStageCosts = (stageId: string) => {
    const stageLabor = laborCosts.filter(l => l.stageId === stageId);
    const stageMaterial = materialCosts.filter(m => m.stageId === stageId);

    const plannedLabor = stageLabor.reduce((acc, cost) => acc + (cost.plannedDays * cost.plannedDailyRate), 0);
    const realLabor = stageLabor.reduce((acc, cost) => acc + (cost.realDays * cost.realDailyRate), 0);

    const plannedMaterial = stageMaterial.reduce((acc, cost) => acc + (cost.plannedQuantity * cost.plannedUnitPrice), 0);
    const realMaterial = stageMaterial.reduce((acc, cost) => acc + (cost.realQuantity * cost.realUnitPrice), 0);

    return {
      planned: plannedLabor + plannedMaterial,
      real: realLabor + realMaterial
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Concluída':
        return <Badge variant="success">Concluída</Badge>;
      case 'Em andamento':
        return <Badge variant="warning">Em andamento</Badge>;
      case 'Atrasada':
        return <Badge variant="error">Atrasada</Badge>;
      default:
        return <Badge variant="neutral">A iniciar</Badge>;
    }
  };

  const statusOptions = [
    { value: 'A iniciar', label: 'A iniciar' },
    { value: 'Em andamento', label: 'Em andamento' },
    { value: 'Concluída', label: 'Concluída' },
    { value: 'Atrasada', label: 'Atrasada' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Etapas da Obra"
        description="Estrutura analítica do projeto e consolidação de custos."
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
              {showHidden ? "Ocultar Ocultas" : "Mostrar Ocultas"}
            </Button>
            <Button onClick={() => handleOpenModal()} variant="primary">
              <Plus size={16} />
              Nova Etapa
            </Button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Etapa</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Progresso</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Custo Planejado</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Custo Real</th>
                <th className="p-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Desvio</th>
                <th className="p-4 w-10 print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {stages
                .filter(s => showHidden || !s.isHidden)
                .map((stage) => {
                  const costs = getStageCosts(stage.id);
                  const deviation = costs.planned - costs.real;
                  const isOverBudget = deviation < 0;

                  return (
                    <tr
                      key={stage.id}
                      className={cn(
                        "hover:bg-stone-50/50 transition-colors group cursor-pointer",
                        stage.isHidden && "opacity-50 grayscale-[0.5] print:hidden"
                      )}
                    >
                      <td className="p-4">
                        <div className="font-medium text-stone-900 flex items-center gap-2">
                          {stage.name}
                          {stage.isHidden && <EyeOff size={14} className="text-stone-400" />}
                        </div>
                        <div className="text-xs text-stone-500 mt-1 font-mono">{formatDate(stage.startDate)} a {formatDate(stage.endDate)}</div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(stage.status)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-stone-100 rounded-full h-2">
                            <div
                              className={cn("h-2 rounded-full", stage.progress === 100 ? "bg-emerald-500" : "bg-blue-500")}
                              style={{ width: `${stage.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-mono text-stone-600">{stage.progress}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-mono text-stone-600">
                        {formatCurrency(costs.planned)}
                      </td>
                      <td className="p-4 text-right font-mono font-medium text-stone-900">
                        {formatCurrency(costs.real)}
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
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleCopy(stage, e)}
                            className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Duplicar"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(stage); }}
                            className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(stage.id, e)}
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
        title={editingId ? 'Editar Etapa' : 'Nova Etapa'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
          <Input
            label="Nome da Etapa"
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data de Início"
              type="date"
              required
              value={formData.startDate}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="Data de Fim"
              type="date"
              required
              value={formData.endDate}
              onChange={e => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              options={statusOptions}
              onChange={e => setFormData({ ...formData, status: e.target.value as Status })}
            />
            <Input
              label="Progresso (%)"
              type="number"
              min="0" max="100"
              required
              value={formData.progress}
              onChange={e => setFormData({ ...formData, progress: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="isHidden"
              checked={formData.isHidden}
              onChange={e => setFormData({ ...formData, isHidden: e.target.checked })}
              className="w-4 h-4 text-emerald-600 border-stone-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="isHidden" className="text-sm font-medium text-stone-700 cursor-pointer">
              Ocultar esta etapa (continuará no somatório do projeto)
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="secondary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Salvar Etapa')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => !isSubmitting && setItemToDelete(null)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta etapa? Todos os custos vinculados também serão excluídos."
        isLoading={isSubmitting}
        error={error}
      />
    </div >
  );
}
