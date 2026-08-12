import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown, ChevronUp, Plus, Pencil, Trash2, Send, Package, User, Calendar
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import NumeroOpColorido from '@/components/producao/NumeroOpColorido';
import TipoOrdemBadge from '@/components/producao/TipoOrdemBadge';

const ETAPA_LABEL = {
  suporte_industrial: 'Suporte Industrial',
  engenharia: 'Engenharia',
  modelagem: 'Modelagem',
  suprimentos: 'Suprimentos',
  fundicao: 'Fundição',
  acabamento: 'Acabamento',
  usinagem: 'Usinagem',
  caldeiraria: 'Caldeiraria',
  montagem: 'Montagem',
  liberacao: 'Liberação',
  expedicao: 'Expedição',
  coleta: 'Coleta',
  finalizado: 'Finalizado'
};

export default function OrdemOROFCard({ op, itens, onAdicionar, onEditar, onExcluir, onMover, loadingItem }) {
  const [expanded, setExpanded] = useState(false);
  const tipo = op.tipo_ordem;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className={`bg-gradient-to-r ${tipo === 'or' ? 'from-orange-50 to-orange-100' : 'from-blue-50 to-blue-100'} p-4 border-b`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <NumeroOpColorido numero_op={op.numero_op} tipo_ordem={op.tipo_ordem} />
                <TipoOrdemBadge tipo_ordem={op.tipo_ordem} numero_op={op.numero_op} />
                <Badge variant="outline" className="text-xs">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="flex items-center gap-1"><Package className="w-4 h-4" />{op.equipamento_principal}</span>
                <span className="flex items-center gap-1"><User className="w-4 h-4" />{op.cliente}</span>
                {op.responsavel && (
                  <span className="flex items-center gap-1"><User className="w-4 h-4" />{op.responsavel}</span>
                )}
                {op.data_lancamento && (
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{format(new Date(op.data_lancamento), 'dd/MM/yyyy')}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onAdicionar(op)}
                className={tipo === 'or' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Items */}
        {expanded && (
          <div className="p-4">
            {itens.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm">Nenhum item. Clique em "Adicionar" para criar itens.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {itens.map((item, idx) => {
                  const isAtrasado = item.data_entrega && new Date(item.data_entrega) < new Date();
                  return (
                    <div key={item.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-500">#{idx + 1}</span>
                            {item.etapa_atual !== 'suporte_industrial' && (
                              <Badge variant="outline" className="text-xs">
                                {ETAPA_LABEL[item.etapa_atual] || item.etapa_atual}
                              </Badge>
                            )}
                            {item.categoria_suporte && (
                              <Badge variant="outline" className="text-xs">
                                {item.categoria_suporte}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-slate-800 text-sm">{item.descricao}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                            {item.codigo_ga && <span>GA: {item.codigo_ga}</span>}
                            <span>Qtd: {item.quantidade}</span>
                            {item.peso && <span>{item.peso} kg</span>}
                            {item.data_entrega && (
                              <span className={isAtrasado ? 'text-red-600 font-semibold' : ''}>
                                Entrega: {format(parseISO(item.data_entrega), 'dd/MM/yyyy')}
                                {isAtrasado && ' ⚠'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => onEditar(item, op)} className="h-8 w-8 p-0">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => onExcluir(item)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onMover(item)}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs h-8"
                            disabled={loadingItem === item.id}
                          >
                            <Send className="w-3 h-3 mr-1" /> Mover
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}