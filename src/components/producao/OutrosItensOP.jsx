import React from 'react';
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { AlertTriangle, Weight, Box } from 'lucide-react';

const ETAPA_CONFIG = {
  comercial: { label: 'Comercial', className: 'bg-slate-200 text-slate-700' },
  engenharia: { label: 'Engenharia', className: 'bg-green-100 text-green-800' },
  modelagem: { label: 'Modelagem', className: 'bg-yellow-100 text-yellow-800' },
  suprimentos: { label: 'Suprimentos', className: 'bg-orange-100 text-orange-800' },
  fundicao: { label: 'Fundição', className: 'bg-red-100 text-red-800' },
  acabamento: { label: 'Acabamento', className: 'bg-rose-100 text-rose-800' },
  usinagem: { label: 'Usinagem', className: 'bg-cyan-100 text-cyan-800' },
  caldeiraria: { label: 'Caldeiraria', className: 'bg-amber-100 text-amber-800' },
  montagem: { label: 'Montagem', className: 'bg-violet-100 text-violet-800' },
  suporte_industrial: { label: 'Suporte Industrial', className: 'bg-stone-100 text-stone-800' },
  liberacao: { label: 'Liberação', className: 'bg-emerald-100 text-emerald-800' },
  expedicao: { label: 'Expedição', className: 'bg-teal-100 text-teal-800' },
  coleta: { label: 'Coleta', className: 'bg-purple-100 text-purple-800' },
  finalizado: { label: 'Finalizado', className: 'bg-green-600 text-white' },
  cancelado: { label: 'Cancelado', className: 'bg-red-900 text-white' },
};

/**
 * Seção "Outros Itens da OP" — exibe itens da mesma OP que estão em outras etapas,
 * com badge colorida por etapa e detalhes de expedição (peso, volume, entrega).
 *
 * @param {Array} itens - itens da OP que NÃO estão na etapa atual
 * @param {string} etapaAtual - etapa atual da página (para título/contagem)
 */
export default function OutrosItensOP({ itens, etapaAtual }) {
  if (!itens || itens.length === 0) return null;

  const ordenados = [...itens].sort((a, b) => {
    const ordem = ['liberacao', 'expedicao', 'coleta', 'finalizado', 'montagem', 'cancelado'];
    const ia = ordem.indexOf(a.etapa_atual);
    const ib = ordem.indexOf(b.etapa_atual);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <h4 className="text-sm font-medium text-slate-600 mb-2">
        Outros Itens ({ordenados.length})
      </h4>
      <div className="space-y-2">
        {ordenados.map(item => {
          const config = ETAPA_CONFIG[item.etapa_atual] || { label: item.etapa_atual, className: 'bg-slate-200 text-slate-700' };
          const isAtrasado = item.data_entrega && new Date(item.data_entrega) < new Date()
            && !['finalizado', 'cancelado'].includes(item.etapa_atual);
          const temExpedicao = item.peso_expedicao || item.volume_expedicao;

          return (
            <div key={item.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{item.descricao}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                    {item.codigo_ga && <span>GA: {item.codigo_ga}</span>}
                    <span>Qtd: {item.quantidade}</span>
                    {item.peso ? <span>Peso: {item.peso} kg</span> : null}
                    {item.data_entrega && (
                      <span className={isAtrasado ? 'text-red-600 font-semibold flex items-center gap-1' : ''}>
                        Entrega: {format(parseISO(item.data_entrega), 'dd/MM/yy')}
                        {isAtrasado && <AlertTriangle className="w-3 h-3 inline" />}
                      </span>
                    )}
                    {temExpedicao && (
                      <span className="flex items-center gap-2 text-teal-700">
                        {item.peso_expedicao && (
                          <span className="flex items-center gap-1">
                            <Weight className="w-3 h-3" />{item.peso_expedicao} kg
                          </span>
                        )}
                        {item.volume_expedicao && (
                          <span className="flex items-center gap-1">
                            <Box className="w-3 h-3" />{item.volume_expedicao}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={`text-xs whitespace-nowrap ${config.className}`}>
                  {config.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}