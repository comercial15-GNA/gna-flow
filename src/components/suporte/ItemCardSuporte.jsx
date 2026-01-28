import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  User,
  FileText,
  Hash,
  Weight,
  AlertTriangle,
  Clock,
  RotateCcw,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HistoricoMovimentacoes from '@/components/producao/HistoricoMovimentacoes';

export default function ItemCardSuporte({ 
  item, 
  op,
  onCategorizar, 
  onRetornar 
}) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const isAtrasado = item.data_entrega && new Date(item.data_entrega) < new Date();

  const getCategoriaLabel = (categoria) => {
    const labels = {
      bronze: 'Bronze',
      caldeiraria: 'Caldeiraria',
      montagem: 'Montagem',
      materia_prima: 'Matéria Prima',
      reforma: 'Reforma'
    };
    return labels[categoria] || categoria;
  };

  const getCategoriaColor = (categoria) => {
    const colors = {
      bronze: 'bg-amber-100 text-amber-800',
      caldeiraria: 'bg-orange-100 text-orange-800',
      montagem: 'bg-blue-100 text-blue-800',
      materia_prima: 'bg-green-100 text-green-800',
      reforma: 'bg-purple-100 text-purple-800'
    };
    return colors[categoria] || 'bg-slate-100 text-slate-800';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Header Principal */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {item.numero_op}
                </Badge>
                {item.categoria_suporte ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCategorizar(item)}
                    className="h-6 px-2"
                  >
                    <Badge className={getCategoriaColor(item.categoria_suporte)}>
                      <Tag className="w-3 h-3 mr-1" />
                      {getCategoriaLabel(item.categoria_suporte)}
                    </Badge>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCategorizar(item)}
                    className="h-6 text-xs"
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    Categorizar
                  </Button>
                )}
                {item.retornado && (
                  <Badge variant="destructive" className="text-xs">
                    Retornado
                  </Badge>
                )}
              </div>
              
              <h3 className="font-semibold text-slate-800 mb-1">
                {item.descricao}
              </h3>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {item.equipamento_principal}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {item.cliente}
                </span>
                {item.data_entrega && (
                  <span className={`flex items-center gap-1 ${isAtrasado ? 'text-red-600 font-semibold' : ''}`}>
                    <Calendar className="w-4 h-4" />
                    {format(new Date(item.data_entrega), "dd/MM/yyyy")}
                    {isAtrasado && <AlertTriangle className="w-4 h-4" />}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetornar(item)}
                className="text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Retornar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Informações Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500 mb-1">Código GA</p>
            <p className="font-medium text-slate-800">{item.codigo_ga || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Quantidade</p>
            <p className="font-medium text-slate-800">{item.quantidade} un</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Peso</p>
            <p className="font-medium text-slate-800">
              {item.peso ? `${item.peso} kg` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Responsável OP</p>
            <p className="font-medium text-slate-800">{item.responsavel_op || '-'}</p>
          </div>
        </div>

        {/* Detalhes Expandidos */}
        {expanded && (
          <div className="p-4 space-y-4 bg-slate-50">
            {/* Informações da OP */}
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Informações da OP
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Ordem de Compra:</span>
                  <p className="font-medium text-slate-800">{op?.ordem_compra || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Data Lançamento:</span>
                  <p className="font-medium text-slate-800">
                    {op?.data_lancamento 
                      ? format(new Date(op.data_lancamento), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Status OP:</span>
                  <p className="font-medium text-slate-800">
                    {op?.status === 'em_andamento' ? 'Em Andamento' :
                     op?.status === 'coleta' ? 'Coleta' :
                     op?.status === 'finalizado' ? 'Finalizado' :
                     op?.status === 'cancelada' ? 'Cancelada' : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Responsável OP:</span>
                  <p className="font-medium text-slate-800">{op?.responsavel || '-'}</p>
                </div>
              </div>
            </div>

            {/* Informações do Item */}
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Detalhes do Item
              </h4>
              <div className="space-y-3 text-sm">
                {item.observacao && (
                  <div>
                    <span className="text-slate-500">Observação:</span>
                    <p className="font-medium text-slate-800 mt-1">{item.observacao}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500">Entrada na Etapa:</span>
                    <p className="font-medium text-slate-800">
                      {item.data_entrada_etapa 
                        ? format(new Date(item.data_entrada_etapa), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Categoria:</span>
                    <p className="font-medium text-slate-800">
                      {item.categoria_suporte ? getCategoriaLabel(item.categoria_suporte) : 'Não categorizado'}
                    </p>
                  </div>
                </div>
                {item.peso_expedicao && (
                  <div>
                    <span className="text-slate-500">Peso Expedição:</span>
                    <p className="font-medium text-slate-800">{item.peso_expedicao} kg</p>
                  </div>
                )}
                {item.volume_expedicao && (
                  <div>
                    <span className="text-slate-500">Volume Expedição:</span>
                    <p className="font-medium text-slate-800">{item.volume_expedicao}</p>
                  </div>
                )}
                {item.informacoes_expedicao && (
                  <div>
                    <span className="text-slate-500">Informações Expedição:</span>
                    <p className="font-medium text-slate-800 mt-1">{item.informacoes_expedicao}</p>
                  </div>
                )}
                {item.retornado && item.justificativa_retorno && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <span className="text-red-700 font-medium">Justificativa do Retorno:</span>
                    <p className="text-red-800 mt-1">{item.justificativa_retorno}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Arquivos da OP */}
            {op?.arquivos && op.arquivos.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Arquivos Anexos ({op.arquivos.length})
                </h4>
                <div className="space-y-2">
                  {op.arquivos.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      Arquivo {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Histórico de Movimentações */}
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Histórico de Movimentações
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>
              {showHistory && (
                <HistoricoMovimentacoes itemId={item.id} />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}