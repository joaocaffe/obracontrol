import { useStore } from '../store';
import { differenceInDays, parseISO, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from './ui/PageHeader';
import { Card } from './ui/Card';

export function Gantt() {
  const { stages, isLoading } = useStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-stone-500 font-medium">Carregando cronograma...</p>
        </div>
      </div>
    );
  }

  // Find min and max dates to define the timeline range
  const dates = stages.flatMap(s => [parseISO(s.startDate), parseISO(s.endDate)]);
  if (dates.length === 0) return (
    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-dotted border-stone-300">
      <p className="text-stone-500">Sem dados para o cronograma.</p>
    </div>
  );

  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  // Add some padding
  const startDate = addDays(minDate, -5);
  const endDate = addDays(maxDate, 15);
  const totalDays = differenceInDays(endDate, startDate);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cronograma"
        description="Gráfico de Gantt interativo para planejamento de tempo."
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px] p-6 text-stone-900">
            {/* Timeline Header */}
            <div className="flex border-b border-stone-200 pb-2 mb-4 relative">
              <div className="w-48 flex-shrink-0 font-semibold text-xs text-stone-500 uppercase tracking-wider">
                Etapa
              </div>
              <div className="flex-1 relative h-6">
                {/* Simplified timeline markers */}
                <div className="absolute left-0 text-xs text-stone-400 font-mono">
                  {format(startDate, 'dd/MM/yy')}
                </div>
                <div className="absolute right-0 text-xs text-stone-400 font-mono">
                  {format(endDate, 'dd/MM/yy')}
                </div>
              </div>
            </div>

            {/* Gantt Bars */}
            <div className="space-y-4 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 left-48 flex justify-between pointer-events-none opacity-10">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-full border-l border-stone-900"></div>
                ))}
              </div>

              {stages.filter(s => !s.isHidden).map((stage) => {
                const stageStart = parseISO(stage.startDate);
                const stageEnd = parseISO(stage.endDate);

                const leftOffset = (differenceInDays(stageStart, startDate) / totalDays) * 100;
                const width = (differenceInDays(stageEnd, stageStart) / totalDays) * 100;

                return (
                  <div key={stage.id} className="flex items-center relative group">
                    <div className="w-48 flex-shrink-0 pr-4">
                      <div className="font-medium text-sm text-stone-900 truncate" title={stage.name}>
                        {stage.name}
                      </div>
                      <div className="text-xs text-stone-400 font-mono">
                        {format(stageStart, 'dd/MM')} - {format(stageEnd, 'dd/MM')}
                      </div>
                    </div>

                    <div className="flex-1 relative h-8 bg-stone-50 rounded-md">
                      <div
                        className="absolute top-1 bottom-1 rounded-md bg-stone-800 shadow-sm cursor-col-resize hover:bg-stone-700 transition-colors flex items-center px-2 overflow-hidden"
                        style={{
                          left: `${Math.max(0, leftOffset)}%`,
                          width: `${Math.max(2, width)}%`
                        }}
                      >
                        {/* Progress fill */}
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-emerald-500/80"
                          style={{ width: `${stage.progress}%` }}
                        />
                        <span className="relative z-10 text-[10px] font-mono text-white/90 truncate">
                          {stage.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
