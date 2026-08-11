import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Package, ChevronDown, ChevronUp, Weight, Box, Calendar, AlertTriangle, Truck, CheckCircle, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NumeroOpColorido from '@/components/producao/NumeroOpColorido';
import TipoOrdemBadge from '@/components/producao/TipoOrdemBadge';

const STATUS_CONFIG = {
  expedicao: { label: 'Em Expedição', className: 'bg-teal-100 text-teal-800', icon: Truck },
  coleta: { label: 'Em Coleta', className: 'bg-purple-100 text-purple-800', icon: Package },
  finalizado: { label: 'Finalizado', className: 'bg-green-600 text-white', icon: CheckCircle },
  cancelado: { label: 'Cancelado', className: 'bg-red-900 text-white', icon: AlertTriangle },
};

/**
 * Aba de acompanhamento de itens enviados da Liberação para Expedição.
 * Usa HistoricoMovimentacao (setor_origem=liberacao, setor_destino=expedicao)
 * para identificar os itens, e mostra o status atual de cada um.
 */
export default function ItensEnviadosExpedicao({ ops, todosItens }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOPs, setExpandedOPs] = useState({});

  // Busca movimentações de liberação → expedição
  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ['historico-liberacao-expedicao'],
    queryFn: () => base44.entities.HistoricoMovimentacao.filter({
      setor_origem: 'liberacao',
      setor_destino: 'expedicao'
    }),
  });

  // IDs de itens enviados da liberação para expedição
  const itensEnviadosIds = useMemo(() => {
    const ids = new Set(movimentacoes.map(m => m.item_id).filter(Boolean));
    return ids;
  }, [movimentacoes]);

  // Filtra os itens atuais pelo histórico
  const itensEnviados = useMemo(() => {
    return todosItens.filter(i => itensEnviadosIds.has(i.id));
  }, [todosItens, itensEnviadosIds]);

  // Agrupa por OP
  const opsComItens = useMemo(() => {
    const grupos = ops
      .filter(op => itensEnviados.some(i => i.op_id === op.id))
      .map(op => {
        const itens = itensEnviados.filter(i => i.op_id === op.id);
        return { op, itens };
      });

    if (!searchTerm) return grupos;

    const term = searchTerm.toLowerCase();
    return grupos.filter(({ op, itens }) => {
      const matchOP = op.numero_op?.toLowerCase().includes(term) ||
        op.cliente?.toLowerCase().includes(term) ||
        op.equipamento_principal?.toLowerCase().includes(term) ||
        op.ordem_compra?.toLowerCase().includes(term);
      const matchItens = itens.some(item =>
        item.descricao?.toLowerCase().includes(term) ||
        item.codigo_ga?.toLowerCase().includes(term)
      );
      return matchOP || matchItens;
    });
  }, [ops, itensEnviados, searchTerm]);

  const toggleOP = (opId) => setExpandedOPs(prev => ({ ...prev, [opId]: !prev[opId] }));

  // Contagem por status
  const contagem = useMemo(() => {
    const c = { expedicao: 0, coleta: 0, finalizado: 0, cancelado: 0, outros: 0 };
    itensEnviados.forEach(i => {
      if (c[i.etapa_atual] !== undefined) c[i.etapa_atual]++;
      else c.outros++;
    });
    return c;
  }, [itensEnviados]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Resumo por status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-teal-700 mb-1">
            <Truck className="w-4 h-4" />
            <span className="text-xs font-medium">Em Expedição</span>
          </div>
          <p className="text-2xl font-bold text-teal-800">{contagem.expedicao}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-purple-700 mb-1">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium">Em Coleta</span>
          </div>
          <p className="text-2xl font-bold text-purple-800">{contagem.coleta}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Finalizado</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{contagem.finalizado}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-700 mb-1">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium">Total Enviado</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{itensEnviados.length}</p>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="OP, O.C, cliente, equipamento, item, código GA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {opsComItens.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum item enviado ainda</h3>
          <p className="text-slate-500">Itens enviados para Expedição aparecerão aqui para acompanhamento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opsComItens.map(({ op, itens }) => {
            const isExpanded = expandedOPs[op.id] ?? true;
            return (
              <div key={op.id} className="bg-white rounded-xl border-2 border-teal-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleOP(op.id)}
                  className="w-full bg-teal-50 border-b border-teal-200 p-4 hover:bg-teal-100 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <NumeroOpColorido numero_op={op.numero_op} tipo_ordem={op.tipo_ordem} className="text-sm" />
                        <TipoOrdemBadge tipo_ordem={op.tipo_ordem} numero_op={op.numero_op} />
                        <span className="text-sm text-slate-600">{op.equipamento_principal}</span>
                        {op.ordem_compra && (
                          <Badge variant="outline" className="text-blue-700 border-blue-300">O.C: {op.ordem_compra}</Badge>
                        )}
                        <Badge className="bg-teal-600 text-white">{itens.length} enviados</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-slate-600">
                        <div><strong>Cliente:</strong> {op.cliente}</div>
                        {op.responsavel && <div><strong>Responsável:</strong> {op.responsavel}</div>}
                      </div>
                    </div>
                    <div className="ml-4">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-2">
                    {itens.map(item => {
                      const status = STATUS_CONFIG[item.etapa_atual] || { label: item.etapa_atual, className: 'bg-slate-200 text-slate-700', icon: Package };
                      const StatusIcon = status.icon;
                      const isAtrasado = item.data_entrega && new Date(item.data_entrega) < new Date()
                        && !['finalizado', 'cancelado'].includes(item.etapa_atual);

                      return (
                        <div key={item.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 text-sm">{item.descricao}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                                {item.codigo_ga && <span>GA: {item.codigo_ga}</span>}
                                <span>Qtd: {item.quantidade}</span>
                                {item.peso && <span>Peso: {item.peso} kg</span>}
                                {item.peso_expedicao && (
                                  <span className="flex items-center gap-1 text-teal-700">
                                    <Weight className="w-3 h-3" />{item.peso_expedicao} kg
                                  </span>
                                )}
                                {item.volume_expedicao && (
                                  <span className="flex items-center gap-1 text-teal-700">
                                    <Box className="w-3 h-3" />{item.volume_expedicao}
                                  </span>
                                )}
                                {item.data_entrega && (
                                  <span className={`flex items-center gap-1 ${isAtrasado ? 'text-red-600 font-semibold' : ''}`}>
                                    <Calendar className="w-3 h-3" />
                                    {format(parseISO(item.data_entrega), 'dd/MM/yy')}
                                    {isAtrasado && <AlertTriangle className="w-3 h-3" />}
                                  </span>
                                )}
                                {item.data_entrada_etapa && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    Desde {format(new Date(item.data_entrada_etapa), 'dd/MM HH:mm', { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge className={`text-xs whitespace-nowrap flex items-center gap-1 ${status.className}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}