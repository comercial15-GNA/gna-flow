import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, ChevronUp, Package, User, Calendar, CheckCircle, MapPin
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import NumeroOpColorido from '@/components/producao/NumeroOpColorido';
import TipoOrdemBadge from '@/components/producao/TipoOrdemBadge';

/**
 * Card read-only para OR/OF cujos todos os itens estão finalizados.
 */
export default function OrdemFinalizadaCard({ op, itens }) {
  const [expanded, setExpanded] = useState(false);
  const tipo = op.tipo_ordem;

  return (
    <Card className="overflow-hidden border-emerald-200">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 border-b border-emerald-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <NumeroOpColorido numero_op={op.numero_op} tipo_ordem={op.tipo_ordem} />
                <TipoOrdemBadge tipo_ordem={op.tipo_ordem} numero_op={op.numero_op} />
                <Badge className="bg-emerald-600 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Finalizada
                </Badge>
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
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Items */}
        {expanded && (
          <div className="p-4">
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div key={item.id} className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-500">#{idx + 1}</span>
                        {item.categoria_suporte && (
                          <Badge variant="outline" className="text-xs">{item.categoria_suporte}</Badge>
                        )}
                      </div>
                      <p className="font-medium text-slate-800 text-sm">{item.descricao}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                        {item.codigo_ga && <span>GA: {item.codigo_ga}</span>}
                        <span>Qtd: {item.quantidade}</span>
                        {item.peso && <span>{item.peso} kg</span>}
                        {item.data_entrega && (
                          <span>Entrega: {format(parseISO(item.data_entrega), 'dd/MM/yyyy')}</span>
                        )}
                        {item.data_entrada_etapa && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Finalizado em {format(new Date(item.data_entrada_etapa), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-xs whitespace-nowrap">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Finalizado
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}