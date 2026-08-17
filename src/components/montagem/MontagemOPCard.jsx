import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown, ChevronUp, ArrowRight, RotateCcw, AlertTriangle,
  FileText, ExternalLink, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import NumeroOpColorido from '@/components/producao/NumeroOpColorido';
import TipoOrdemBadge from '@/components/producao/TipoOrdemBadge';
import ItemOPActions from '@/components/producao/ItemOPActions';
import OutrosItensOP from '@/components/producao/OutrosItensOP';

const ETAPAS_RETORNO = [
  { value: 'engenharia', label: 'Engenharia' },
  { value: 'fundicao', label: 'Fundição' },
  { value: 'usinagem', label: 'Usinagem' },
  { value: 'caldeiraria', label: 'Caldeiraria' },
  { value: 'acabamento', label: 'Acabamento' },
];

export default function MontagemOPCard({
  op, itens: itensOP, isExpanded, onToggle, loadingItem,
  onEnviar, onRetornar, todosItens, onItemUpdate,
  dragHandleProps, isDragging
}) {
  const arquivos = op.arquivos || [];

  const toggleIniciado = async (item) => {
    try {
      await base44.entities.ItemOP.update(item.id, {
        iniciado: !item.iniciado
      });
      onItemUpdate();
      toast.success(item.iniciado ? 'Item desmarcado' : 'Item marcado como iniciado');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className={`bg-white rounded-xl border-2 border-violet-200 shadow-sm overflow-hidden flex ${isDragging ? 'shadow-xl ring-2 ring-blue-400' : ''}`}>
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 flex items-center justify-center px-2 bg-violet-50 border-r border-violet-200"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <button
          onClick={onToggle}
          className="w-full bg-violet-50 border-b border-violet-200 p-4 hover:bg-violet-100 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <NumeroOpColorido numero_op={op.numero_op} tipo_ordem={op.tipo_ordem} className="text-sm" />
                  <TipoOrdemBadge tipo_ordem={op.tipo_ordem} numero_op={op.numero_op} />
                  <span className="text-sm text-slate-600">{op.equipamento_principal}</span>
                </div>
                {op.ordem_compra && (
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    O.C: {op.ordem_compra}
                  </Badge>
                )}
                <Badge className="bg-violet-600 text-white">
                  {itensOP.length} {itensOP.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-slate-600">
                <div><strong>Cliente:</strong> {op.cliente}</div>
                {op.responsavel && <div><strong>Responsável:</strong> {op.responsavel}</div>}
                {op.data_lancamento && (
                  <div><strong>Lançamento:</strong> {format(new Date(op.data_lancamento), 'dd/MM/yyyy')}</div>
                )}
              </div>
            </div>
            <div className="ml-4">
              {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="p-4">
            {arquivos.length > 0 && (
              <div className="mb-4 pb-4 border-b border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">Arquivos da OP:</p>
                <div className="flex flex-wrap gap-2">
                  {arquivos.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded text-sm text-blue-600 hover:bg-slate-200"
                    >
                      <FileText className="w-4 h-4" />
                      Arquivo {idx + 1}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {itensOP.map((item) => {
                const isAtrasado = item.data_entrega && new Date(item.data_entrega) < new Date();
                return (
                  <div key={item.id} className={`bg-violet-50 rounded-lg border-2 border-violet-300 p-4 ${item.iniciado ? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-slate-800 ${item.iniciado ? 'font-bold' : 'font-semibold'}`}>{item.descricao}</p>
                          {item.retornado && <Badge variant="destructive">Retornado</Badge>}
                          {item.iniciado && <Badge className="bg-blue-600 text-white">Iniciado</Badge>}
                        </div>
                        <p className="text-xs text-slate-500">Código GA: {item.codigo_ga || '-'}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={item.iniciado ? "default" : "outline"}
                        onClick={() => toggleIniciado(item)}
                        className={item.iniciado ? "bg-blue-600 hover:bg-blue-700" : ""}
                      >
                        {item.iniciado ? '✓ Iniciado' : 'Iniciar'}
                      </Button>
                    </div>

                    <ItemOPActions item={item} onUpdate={onItemUpdate} />

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3 text-sm">
                      <div className="text-slate-600">
                        <span className="font-medium">Peso:</span> {item.peso ? `${item.peso} kg` : '-'}
                      </div>
                      <div className="text-slate-600">
                        <span className="font-medium">Qtd:</span> {item.quantidade}
                      </div>
                      <div className="text-slate-600">
                        <span className="font-medium">Entrega:</span>{' '}
                        {item.data_entrega ? (
                          <span className={isAtrasado ? 'text-red-600 font-semibold' : ''}>
                            {format(parseISO(item.data_entrega), 'dd/MM/yy')}
                            {isAtrasado && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                          </span>
                        ) : '-'}
                      </div>
                      <div className="text-slate-600">
                        <span className="font-medium">Entrada:</span>{' '}
                        {item.data_entrada_etapa ? format(new Date(item.data_entrada_etapa), 'dd/MM HH:mm') : '-'}
                      </div>
                      <div className="text-slate-600">
                        <span className="font-medium">Responsável:</span> {item.responsavel_op || '-'}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => onEnviar(item, 'liberacao')}
                        disabled={loadingItem === item.id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Enviar p/ Liberação
                      </Button>
                      {ETAPAS_RETORNO.map((etapa) => (
                        <Button
                          key={etapa.value}
                          size="sm"
                          variant="outline"
                          onClick={() => onRetornar(item, etapa.value)}
                          disabled={loadingItem === item.id}
                          className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Retornar p/ {etapa.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <OutrosItensOP
              itens={todosItens.filter(i => i.op_id === op.id && i.etapa_atual !== 'montagem')}
              etapaAtual="montagem"
            />
          </div>
        )}
      </div>
    </div>
  );
}