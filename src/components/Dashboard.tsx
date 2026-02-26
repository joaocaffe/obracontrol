import { useStore } from '../store';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardTitle } from './ui/Card';
import { PageHeader } from './ui/PageHeader';

export function Dashboard() {
  const { stages, laborCosts, materialCosts, isLoading } = useStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-stone-500 font-medium">Carregando dados da obra...</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const plannedLabor = laborCosts.reduce((acc, cost) => acc + (cost.plannedDays * cost.plannedDailyRate), 0);
  const realLabor = laborCosts.reduce((acc, cost) => acc + (cost.realDays * cost.realDailyRate), 0);

  const plannedMaterial = materialCosts.reduce((acc, cost) => acc + (cost.plannedQuantity * cost.plannedUnitPrice), 0);
  const realMaterial = materialCosts.reduce((acc, cost) => acc + (cost.realQuantity * cost.realUnitPrice), 0);

  const totalPlanned = plannedLabor + plannedMaterial;
  const totalReal = realLabor + realMaterial;
  const deviation = totalPlanned - totalReal;
  const isOverBudget = deviation < 0;

  // Calculate overall progress (weighted average based on planned cost)
  const totalPlannedCost = stages.reduce((acc, stage) => {
    const stageLabor = laborCosts.filter(l => l.stageId === stage.id);
    const stageMaterial = materialCosts.filter(m => m.stageId === stage.id);
    const plannedLabor = stageLabor.reduce((sum, l) => sum + (l.plannedDays * l.plannedDailyRate), 0);
    const plannedMaterial = stageMaterial.reduce((sum, m) => sum + (m.plannedQuantity * m.plannedUnitPrice), 0);
    return acc + plannedLabor + plannedMaterial;
  }, 0);

  const weightedProgress = totalPlannedCost > 0
    ? stages.reduce((acc, stage) => {
      const stageLabor = laborCosts.filter(l => l.stageId === stage.id);
      const stageMaterial = materialCosts.filter(m => m.stageId === stage.id);
      const plannedLabor = stageLabor.reduce((sum, l) => sum + (l.plannedDays * l.plannedDailyRate), 0);
      const plannedMaterial = stageMaterial.reduce((sum, m) => sum + (m.plannedQuantity * m.plannedUnitPrice), 0);
      const stagePlannedTotal = plannedLabor + plannedMaterial;
      return acc + (stage.progress * (stagePlannedTotal / totalPlannedCost));
    }, 0)
    : 0;

  const completedStages = stages.filter(s => s.status === 'Concluída').length;
  const delayedStages = stages.filter(s => s.status === 'Atrasada').length;
  const inProgressStages = stages.filter(s => s.status === 'Em andamento').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão executiva da obra em tempo real."
      />

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Orçado */}
        <Card>
          <div className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Valor Total Orçado</div>
          <div className="text-3xl font-light text-stone-900">{formatCurrency(totalPlanned)}</div>
          <div className="mt-2 text-xs text-stone-400 font-mono">Linha de base inicial</div>
        </Card>

        {/* Gasto */}
        <Card>
          <div className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Valor Total Gasto</div>
          <div className="text-3xl font-light text-stone-900">{formatCurrency(totalReal)}</div>
          <div className="mt-2 text-xs text-stone-400 font-mono">Despesas executadas</div>
        </Card>

        {/* Desvio */}
        <Card className={cn(isOverBudget ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100")}>
          <div className={cn("text-sm font-medium uppercase tracking-wider mb-2", isOverBudget ? "text-red-700" : "text-emerald-700")}>
            Desvio Financeiro
          </div>
          <div className={cn("text-3xl font-light flex items-center gap-2", isOverBudget ? "text-red-900" : "text-emerald-900")}>
            {isOverBudget ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            {formatCurrency(Math.abs(deviation))}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isOverBudget ? "text-red-600" : "text-emerald-600")}>
            {isOverBudget ? "Estouro de orçamento" : "Economia no orçamento"}
          </div>
        </Card>

        {/* Progresso */}
        <Card className="bg-stone-900 border-stone-800 text-white">
          <div className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-2">Progresso Físico</div>
          <div className="text-3xl font-light">{formatPercent(weightedProgress * 100)}</div>
          <div className="mt-4 w-full bg-stone-800 rounded-full h-1.5">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${weightedProgress}%` }}></div>
          </div>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status das Etapas */}
        <Card className="lg:col-span-1">
          <CardTitle>Status das Etapas</CardTitle>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-600">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span>Concluídas</span>
              </div>
              <span className="font-mono font-medium">{completedStages}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-600">
                <Clock size={18} className="text-blue-500" />
                <span>Em andamento</span>
              </div>
              <span className="font-mono font-medium">{inProgressStages}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-600">
                <AlertCircle size={18} className="text-red-500" />
                <span>Atrasadas</span>
              </div>
              <span className="font-mono font-medium">{delayedStages}</span>
            </div>
          </div>
        </Card>

        {/* Breakdown de Custos */}
        <Card className="lg:col-span-2">
          <CardTitle>Composição de Custos (Realizado)</CardTitle>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-stone-700">Materiais</span>
                <span className="font-mono text-stone-900">{formatCurrency(realMaterial)}</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-3">
                <div
                  className="bg-indigo-500 h-3 rounded-full"
                  style={{ width: `${(realMaterial / totalReal) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-stone-700">Mão de Obra</span>
                <span className="font-mono text-stone-900">{formatCurrency(realLabor)}</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-3">
                <div
                  className="bg-amber-500 h-3 rounded-full"
                  style={{ width: `${(realLabor / totalReal) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
