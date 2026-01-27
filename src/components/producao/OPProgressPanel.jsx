import React from 'react';
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  CheckCircle, 
  Clock,
  TrendingUp
} from 'lucide-react';
import { cn } from "@/lib/utils";

const ETAPA_COLORS = {
  comercial: 'bg-blue-100 text-blue-800',
  engenharia: 'bg-green-100 text-green-800',
  modelagem: 'bg-yellow-100 text-yellow-800',
  suprimentos: 'bg-orange-100 text-orange-800',
  fundicao: 'bg-red-100 text-red-800',
  acabamento: 'bg-pink-100 text-pink-800',
  usinagem: 'bg-cyan-100 text-cyan-800',
  liberacao: 'bg-emerald-100 text-emerald-800',
  expedicao: 'bg-teal-100 text-teal-800',
  coleta: 'bg-amber-100 text-amber-800',
  suporte_industrial: 'bg-slate-100 text-slate-800',
  finalizado: 'bg-purple-100 text-purple-800'
};

const ETAPA_LABELS = {
  comercial: 'Comercial',
  engenharia: 'Engenharia',
  modelagem: 'Modelagem',
  suprimentos: 'Suprimentos',
  fundicao: 'Fundição',
  acabamento: 'Acabamento',
  usinagem: 'Usinagem',
  liberacao: 'Liberação',
  expedicao: 'Expedição',
  coleta: 'Coleta',
  suporte_industrial: 'Suporte Industrial',
  finalizado: 'Finalizado'
};

const ETAPAS_ORDEM = [
  'comercial',
  'engenharia',
  'modelagem',
  'suprimentos',
  'fundicao',
  'acabamento',
  'usinagem',
  'liberacao',
  'expedicao',
  'coleta',
  'suporte_industrial',
  'finalizado'
];

export default function OPProgressPanel({ op, itens }) {
  if (!op || !itens || itens.length === 0) return null;

  // Calcular distribuição por etapa
  const distribuicaoPorEtapa = itens.reduce((acc, item) => {
    acc[item.etapa_atual] = (acc[item.etapa_atual] || 0) + 1;
    return acc;
  }, {});

  // Calcular progresso geral
  const totalItens = itens.length;
  const etapasMaisAvancadas = ['liberacao', 'expedicao', 'coleta', 'finalizado'];
  const itensAvancados = itens.filter(i => etapasMaisAvancadas.includes(i.etapa_atual)).length;
  const progressoGeral = Math.round((itensAvancados / totalItens) * 100);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 border-slate-200 p-6 mb-6">
      {/* Cabeçalho da OP */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{op.numero_op}</h2>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <span><strong>Cliente:</strong> {op.cliente}</span>
            <span><strong>Equipamento:</strong> {op.equipamento_principal}</span>
            {op.responsavel && <span><strong>Responsável:</strong> {op.responsavel}</span>}
          </div>
        </div>
        <div className="text-right">
          <Badge className={cn(
            "mb-2",
            op.status === 'em_andamento' ? 'bg-blue-500 text-white' : 
            op.status === 'coleta' ? 'bg-amber-500 text-white' :
            op.status === 'finalizado' ? 'bg-purple-500 text-white' : 'bg-slate-500 text-white'
          )}>
            {op.status === 'em_andamento' ? 'Em Andamento' : 
             op.status === 'coleta' ? 'Coleta' :
             op.status === 'finalizado' ? 'Finalizado' : op.status}
          </Badge>
          <div className="text-sm text-slate-500">
            <Package className="w-4 h-4 inline mr-1" />
            {totalItens} {totalItens === 1 ? 'item' : 'itens'}
          </div>
        </div>
      </div>

      {/* Barra de Progresso Geral */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Progresso Geral da OP
          </span>
          <span className="text-sm font-bold text-slate-800">{progressoGeral}%</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-teal-500 transition-all duration-500"
            style={{ width: `${progressoGeral}%` }}
          />
        </div>
      </div>

      {/* Distribuição por Etapa */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Distribuição dos Itens por Etapa</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ETAPAS_ORDEM.map((etapa) => {
            const quantidade = distribuicaoPorEtapa[etapa] || 0;
            const percentual = Math.round((quantidade / totalItens) * 100);
            
            return (
              <div
                key={etapa}
                className={cn(
                  "rounded-lg p-3 border-2 transition-all",
                  quantidade > 0 ? "border-slate-300 bg-white shadow-sm" : "border-slate-100 bg-slate-50 opacity-60"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={cn(ETAPA_COLORS[etapa], "text-xs")}>
                    {ETAPA_LABELS[etapa]}
                  </Badge>
                  {quantidade > 0 && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-800">{quantidade}</span>
                  <span className="text-xs text-slate-500">
                    {quantidade === 1 ? 'item' : 'itens'} ({percentual}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tempo na Etapa Atual */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <Clock className="w-4 h-4" />
          <span>
            <strong>{itens.filter(i => i.etapa_atual === itens[0].etapa_atual).length}</strong> {itens.filter(i => i.etapa_atual === itens[0].etapa_atual).length === 1 ? 'item está' : 'itens estão'} na etapa de <strong>{ETAPA_LABELS[itens[0].etapa_atual]}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}