import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  X, 
  FileText, 
  User, 
  Calendar, 
  Package, 
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import ItemOPActions from '@/components/producao/ItemOPActions';

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

const STATUS_CONFIG = {
  em_andamento: { label: 'Em Andamento', color: 'bg-amber-100 text-amber-800', icon: Clock },
  coleta: { label: 'Coleta', color: 'bg-purple-100 text-purple-800', icon: Package },
  finalizado: { label: 'Finalizado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: AlertCircle }
};

export default function OPDetailPanel({ op, itens, onClose }) {
  const queryClient = useQueryClient();
  
  if (!op) return null;

  const statusConfig = STATUS_CONFIG[op.status] || STATUS_CONFIG.em_andamento;
  const StatusIcon = statusConfig.icon;

  const itensFinalizados = itens.filter(i => i.etapa_atual === 'finalizado').length;
  const progressPercent = itens.length > 0 ? Math.round((itensFinalizados / itens.length) * 100) : 0;

  // Agrupar itens por etapa
  const itensPorEtapa = itens.reduce((acc, item) => {
    acc[item.etapa_atual] = (acc[item.etapa_atual] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <FileText className="w-5 h-5" />
              <h2 className="text-lg font-bold">{op.numero_op}</h2>
              {op.ordem_compra && (
                <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                  O.C: {op.ordem_compra}
                </Badge>
              )}
            </div>
            <p className="text-indigo-200 text-sm">{op.equipamento_principal}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="p-4 border-b border-slate-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <User className="w-3 h-3" />
              Cliente
            </div>
            <p className="font-medium text-slate-800 text-sm">{op.cliente}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <User className="w-3 h-3" />
              Responsável
            </div>
            <p className="font-medium text-slate-800 text-sm">{op.responsavel || '-'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Calendar className="w-3 h-3" />
              Lançamento
            </div>
            <p className="font-medium text-slate-800 text-sm">
              {op.data_lancamento ? format(new Date(op.data_lancamento), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <StatusIcon className="w-3 h-3" />
              Status
            </div>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Progresso da OP</span>
          <span className="text-sm text-slate-500">{itensFinalizados}/{itens.length} itens finalizados</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-right text-xs text-slate-500 mt-1">{progressPercent}% concluído</p>
      </div>

      {/* Distribuição por Etapa */}
      <div className="p-4 border-b border-slate-100">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Distribuição por Etapa</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(itensPorEtapa).map(([etapa, count]) => (
            <div key={etapa} className="flex items-center gap-1">
              <Badge className={ETAPA_COLORS[etapa]}>
                {ETAPA_LABELS[etapa]}: {count}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Arquivos */}
      {op.arquivos && op.arquivos.length > 0 && (
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Arquivos Anexos</h3>
          <div className="flex flex-wrap gap-2">
            {op.arquivos.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg text-sm text-blue-600 hover:bg-slate-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Arquivo {idx + 1}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Itens */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Itens da OP ({itens.length})</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {itens.map((item) => (
            <div key={item.id} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Package className="w-4 h-4 text-slate-400" />
                  <p className="font-medium text-slate-800 text-sm truncate">{item.descricao}</p>
                </div>
                <Badge className={ETAPA_COLORS[item.etapa_atual]}>
                  {ETAPA_LABELS[item.etapa_atual]}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                <span>Cód: {item.codigo_ga || '-'}</span>
                <span>Qtd: {item.quantidade}</span>
                <span>Peso: {item.peso ? `${item.peso}kg` : '-'}</span>
                {item.data_entrega && (
                  <span>Entrega: {format(parseISO(item.data_entrega), 'dd/MM/yy')}</span>
                )}
              </div>
              <ItemOPActions item={item} onUpdate={() => queryClient.invalidateQueries()} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}