import React from 'react';
import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ETAPA_LABELS = {
  comercial: 'Comercial',
  engenharia: 'Engenharia',
  modelagem: 'Modelagem',
  suprimentos: 'Suprimentos',
  fundicao: 'Fundição',
  acabamento: 'Acabamento',
  usinagem: 'Usinagem',
  caldeiraria: 'Caldeiraria',
  liberacao: 'Liberação',
  expedicao: 'Expedição',
  coleta: 'Coleta',
  suporte_industrial: 'Suporte',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

const ETAPAS_ORDER = [
  'comercial', 'engenharia', 'modelagem', 'suprimentos', 'fundicao',
  'acabamento', 'usinagem', 'caldeiraria', 'liberacao', 'expedicao',
  'coleta', 'suporte_industrial', 'finalizado', 'cancelado',
];

const formatPeso = (peso) => (peso ? `${Number(peso).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : '-');

/**
 * DistribuicaoEtapa — exibe a distribuição de todos os itens da OP por etapa,
 * com quantidade e peso total, além da lista de "Outros Itens" (fora da etapa atual).
 *
 * Props:
 *  - todosItensOP: array de ItemOP pertencentes à OP
 *  - etapaAtual: chave da etapa atual (para filtrar "Outros Itens")
 */
export default function DistribuicaoEtapa({ todosItensOP = [], etapaAtual }) {
  const outrosItens = todosItensOP.filter(i => i.etapa_atual !== etapaAtual);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <Package className="w-4 h-4" />
        Distribuição por Etapa - Todos os Itens da OP
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {ETAPAS_ORDER.map(etapa => {
          const itensEtapa = todosItensOP.filter(i => i.etapa_atual === etapa);
          if (itensEtapa.length === 0) return null;
          const pesoTotal = itensEtapa.reduce((s, i) => s + (i.peso || 0), 0);
          return (
            <div key={etapa} className="bg-slate-100 rounded-lg p-2 text-center">
              <p className="text-xs text-slate-600 mb-1">{ETAPA_LABELS[etapa]}</p>
              <p className="text-lg font-bold text-slate-800">{itensEtapa.length}</p>
              <p className="text-xs text-slate-500">{formatPeso(pesoTotal)}</p>
            </div>
          );
        })}
      </div>

      {outrosItens.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-2">Outros Itens ({outrosItens.length})</h4>
          <div className="space-y-2">
            {outrosItens.map(item => (
              <div key={item.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{item.descricao}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs text-slate-500">Código GA: {item.codigo_ga || '-'}</p>
                      <p className="text-xs text-slate-500">Qtd: {item.quantidade}</p>
                      <p className="text-xs text-slate-500">Peso: {formatPeso(item.peso)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {ETAPA_LABELS[item.etapa_atual] || item.etapa_atual}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}