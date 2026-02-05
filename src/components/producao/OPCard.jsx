import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Calendar, 
  User, 
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Package,
  Edit2,
  History,
  Settings,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createPageUrl } from '../../utils';
import EditObservacaoDialog from './EditObservacaoDialog';
import HistoricoMovimentacoes from './HistoricoMovimentacoes';

const STATUS_CONFIG = {
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  coleta: { label: 'Coleta', color: 'bg-yellow-100 text-yellow-800' },
  finalizado: { label: 'Finalizado', color: 'bg-green-100 text-green-800' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800' }
};

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

export default function OPCard({ op, itens = [], showItens = false, onItemUpdate, isAdmin = false, onAdminEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [editingObservacao, setEditingObservacao] = useState(null);
  const [expandedHistorico, setExpandedHistorico] = useState({});
  const statusConfig = STATUS_CONFIG[op.status] || STATUS_CONFIG.em_andamento;

  const itensOP = itens.filter(item => item.op_id === op.id);

  const toggleHistorico = (itemId) => {
    setExpandedHistorico(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div 
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-800">{op.numero_op}</h3>
                {op.ordem_compra && (
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    O.C: {op.ordem_compra}
                  </Badge>
                )}
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
              <p className="text-sm text-slate-500">{op.equipamento_principal}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a 
              href={createPageUrl('EspelhoImpressao') + '?opId=' + op.id}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center h-9 w-9 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title="Imprimir OP"
            >
              <Printer className="w-4 h-4" />
            </a>
            {isAdmin && onAdminEdit && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdminEdit(op);
                }}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>{op.cliente}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <User className="w-4 h-4 text-slate-400" />
            <span>{op.responsavel || '-'}</span>
          </div>
          {op.data_lancamento && (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{format(new Date(op.data_lancamento), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-600">
            <Package className="w-4 h-4 text-slate-400" />
            <span>{itensOP.length} itens</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          {op.arquivos && op.arquivos.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Arquivos Anexos</p>
              <div className="flex flex-wrap gap-2">
                {op.arquivos.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Arquivo {index + 1}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {showItens && itensOP.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Itens da OP</p>
              <div className="space-y-2">
                {itensOP.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg p-4 border border-slate-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Package className="w-4 h-4 text-slate-400 mt-1" />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 mb-1">{item.descricao}</p>
                          {item.observacao && (
                            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded flex items-start justify-between">
                              <p className="text-xs text-blue-900 flex-1">
                                <strong>Observação:</strong> {item.observacao}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingObservacao(item)}
                                className="h-6 px-2 ml-2"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          {!item.observacao && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingObservacao(item)}
                              className="h-7 px-2 text-xs text-slate-500"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Adicionar Observação
                            </Button>
                          )}
                        </div>
                      </div>
                      <Badge className={ETAPA_COLORS[item.etapa_atual] || 'bg-slate-100 text-slate-800'}>
                        {item.etapa_atual}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                      <div className="text-slate-600">
                        <span className="text-slate-400">Código GA:</span> {item.codigo_ga || '-'}
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Peso:</span> {item.peso ? `${item.peso} kg` : '-'}
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Quantidade:</span> {item.quantidade}
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Entrega:</span> {item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yyyy') : '-'}
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Cliente:</span> {item.cliente || '-'}
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Responsável:</span> {item.responsavel_op || '-'}
                      </div>
                      <div className="text-slate-600">
                        <span className="text-slate-400">Entrada Etapa:</span> {item.data_entrada_etapa ? format(new Date(item.data_entrada_etapa), 'dd/MM/yy HH:mm') : '-'}
                      </div>
                      {item.peso_expedicao && (
                        <div className="text-slate-600">
                          <span className="text-slate-400">Peso Exp.:</span> {item.peso_expedicao} kg
                        </div>
                      )}
                      {item.volume_expedicao && (
                        <div className="text-slate-600">
                          <span className="text-slate-400">Volume:</span> {item.volume_expedicao}
                        </div>
                      )}
                    </div>

                    {/* Histórico de Movimentações */}
                    <div className="border-t border-slate-200 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleHistorico(item.id)}
                        className="text-slate-600 hover:text-slate-800 p-0 h-auto text-xs"
                      >
                        <History className="w-3 h-3 mr-1" />
                        {expandedHistorico[item.id] ? 'Ocultar' : 'Ver'} Histórico
                        {expandedHistorico[item.id] ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                      </Button>
                      {expandedHistorico[item.id] && (
                        <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                          <HistoricoMovimentacoes itemId={item.id} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <EditObservacaoDialog
        item={editingObservacao}
        open={!!editingObservacao}
        onOpenChange={(open) => !open && setEditingObservacao(null)}
        onSuccess={onItemUpdate}
      />
    </div>
  );
}