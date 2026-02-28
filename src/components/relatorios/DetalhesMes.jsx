import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowLeft, Package, Scale } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseISO, format } from 'date-fns';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const ETAPA_LABELS = {
  comercial: 'Comercial', engenharia: 'Engenharia', modelagem: 'Modelagem',
  suprimentos: 'Suprimentos', fundicao: 'Fundição', acabamento: 'Acabamento',
  usinagem: 'Usinagem', caldeiraria: 'Caldeiraria', liberacao: 'Liberação',
  expedicao: 'Expedição', coleta: 'Coleta', suporte_industrial: 'Suporte Industrial',
  finalizado: 'Finalizado',
};

const formatPeso = (peso) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(peso || 0);

const MODO_LABELS = {
  entrega: 'Data de Entrega',
  lancamento: 'Data de Lançamento',
  a_entregar: 'A Entregar',
};

export default function DetalhesMes({ mes, ano, itens, ops, modoData = 'entrega', onVoltar }) {
  const [expandedOPs, setExpandedOPs] = useState({});

  const toggleOP = (opId) => setExpandedOPs(prev => ({ ...prev, [opId]: !prev[opId] }));

  // Filtrar itens do mês de acordo com o modo
  const itensMes = itens.filter(item => {
    if (!item.peso) return false;

    if (modoData === 'entrega') {
      if (!item.data_entrega) return false;
      const d = parseISO(item.data_entrega);
      return d.getFullYear() === ano && d.getMonth() + 1 === mes;
    }

    if (modoData === 'lancamento') {
      const op = ops.find(o => o.id === item.op_id);
      if (!op?.data_lancamento) return false;
      const d = new Date(op.data_lancamento);
      return d.getFullYear() === ano && d.getMonth() + 1 === mes;
    }

    if (modoData === 'a_entregar') {
      if (!item.data_entrega || item.etapa_atual === 'finalizado') return false;
      const d = parseISO(item.data_entrega);
      return d.getFullYear() === ano && d.getMonth() + 1 === mes;
    }

    return false;
  });

  // Agrupar por OP
  const gruposOP = {};
  itensMes.forEach(item => {
    const op = ops.find(o => o.id === item.op_id);
    if (!op) return;
    if (!gruposOP[op.id]) gruposOP[op.id] = { op, itens: [] };
    gruposOP[op.id].itens.push(item);
  });

  const grupos = Object.values(gruposOP).sort((a, b) => {
    const pesoA = a.itens.reduce((s, i) => s + (i.peso || 0) * (i.quantidade || 1), 0);
    const pesoB = b.itens.reduce((s, i) => s + (i.peso || 0) * (i.quantidade || 1), 0);
    return pesoB - pesoA;
  });

  const pesoTotal = itensMes.reduce((s, i) => s + (i.peso || 0) * (i.quantidade || 1), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={onVoltar}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Visão Geral
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{MESES[mes - 1]} {ano}</h2>
          <p className="text-slate-500 text-sm">
            {MODO_LABELS[modoData]} · {grupos.length} OPs · {formatPeso(pesoTotal)} kg
          </p>
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum item com data de entrega neste mês.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(({ op, itens: itensOp }) => {
            const pesoOP = itensOp.reduce((s, i) => s + (i.peso || 0) * (i.quantidade || 1), 0);
            const expanded = expandedOPs[op.id];
            return (
              <div key={op.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => toggleOP(op.id)}
                >
                  <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{op.numero_op}</span>
                        <Badge variant="outline" className="text-xs">{op.cliente}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{op.equipamento_principal}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-800">{formatPeso(pesoOP)} kg</div>
                    <div className="text-xs text-slate-400">{itensOp.length} {itensOp.length === 1 ? 'item' : 'itens'}</div>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {itensOp.map(item => (
                      <div key={item.id} className="px-6 py-3 flex items-center justify-between bg-slate-50/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{item.descricao}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {item.codigo_ga && <span className="text-xs text-slate-400">GA: {item.codigo_ga}</span>}
                            <span className="text-xs text-slate-400">Qtd: {item.quantidade || 1}</span>
                            <Badge className="text-[10px] px-1.5 py-0 bg-slate-200 text-slate-600 border-0">
                              {ETAPA_LABELS[item.etapa_atual] || item.etapa_atual}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          {item.peso ? (
                            <>
                              <div className="font-bold text-slate-800 text-sm">
                                {formatPeso(item.peso * (item.quantidade || 1))} kg
                              </div>
                              {(item.quantidade || 1) > 1 && (
                                <div className="text-xs text-slate-400">{formatPeso(item.peso)} kg/un</div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">sem peso</span>
                          )}
                        </div>
                      </div>
                    ))}
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