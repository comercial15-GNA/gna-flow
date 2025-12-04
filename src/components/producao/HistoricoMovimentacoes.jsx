import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  ArrowRight, 
  RotateCcw,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ETAPA_LABELS = {
  comercial: 'Comercial',
  engenharia: 'Engenharia',
  modelagem: 'Modelagem',
  suprimentos: 'Suprimentos',
  fundicao: 'Fundição',
  usinagem: 'Usinagem',
  liberacao: 'Liberação',
  expedicao: 'Expedição',
  finalizado: 'Finalizado'
};

const ETAPA_COLORS = {
  comercial: 'bg-blue-100 text-blue-800',
  engenharia: 'bg-green-100 text-green-800',
  modelagem: 'bg-yellow-100 text-yellow-800',
  suprimentos: 'bg-orange-100 text-orange-800',
  fundicao: 'bg-red-100 text-red-800',
  usinagem: 'bg-cyan-100 text-cyan-800',
  liberacao: 'bg-emerald-100 text-emerald-800',
  expedicao: 'bg-teal-100 text-teal-800',
  finalizado: 'bg-purple-100 text-purple-800'
};

export default function HistoricoMovimentacoes({ itemId }) {
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['historico', itemId],
    queryFn: () => base44.entities.HistoricoMovimentacao.filter({ item_id: itemId }, 'data_movimentacao'),
    enabled: !!itemId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="text-center py-4 text-slate-500 text-sm">
        Nenhuma movimentação registrada
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <History className="w-4 h-4" />
        <span>Histórico de Movimentações</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {historico.map((mov, index) => {
          const isRetorno = mov.justificativa;
          return (
            <div 
              key={mov.id || index} 
              className={`rounded-lg p-3 text-sm ${isRetorno ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isRetorno ? (
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                )}
                <Badge className={ETAPA_COLORS[mov.setor_origem]}>
                  {ETAPA_LABELS[mov.setor_origem] || mov.setor_origem}
                </Badge>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <Badge className={ETAPA_COLORS[mov.setor_destino]}>
                  {ETAPA_LABELS[mov.setor_destino] || mov.setor_destino}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {mov.data_movimentacao 
                    ? format(new Date(mov.data_movimentacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : '-'}
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {mov.usuario_nome || mov.usuario_email || '-'}
                </div>
              </div>
              {mov.justificativa && (
                <div className="mt-2 p-2 bg-white rounded border border-amber-200">
                  <p className="text-xs text-amber-800">
                    <strong>Motivo do retorno:</strong> {mov.justificativa}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}