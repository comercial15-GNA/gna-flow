import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Flame, AlertTriangle, Calendar, Package, User } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PainelFundicao() {
  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-painel-fundicao'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'fundicao' });
      // Ordenar por data de entrega (mais próxima primeiro)
      return items.sort((a, b) => {
        if (!a.data_entrega) return 1;
        if (!b.data_entrega) return -1;
        return new Date(a.data_entrega) - new Date(b.data_entrega);
      }).slice(0, 30);
    },
    refetchInterval: 120000 // Atualiza a cada 2 minutos
  });

  const isAtrasado = (dataEntrega) => {
    if (!dataEntrega) return false;
    return isBefore(startOfDay(new Date(dataEntrega)), startOfDay(new Date()));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header estilo aeroporto */}
      <div className="bg-slate-800 rounded-xl p-6 mb-6 border-b-4 border-red-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-500 rounded-xl flex items-center justify-center">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">FUNDIÇÃO</h1>
              <p className="text-red-400 text-lg">Próximas 30 Ordens de Produção</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white text-2xl font-mono">
              {format(new Date(), 'HH:mm:ss')}
            </div>
            <div className="text-slate-400 text-sm">
              {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-4 border-l-4 border-red-500">
          <div className="text-slate-400 text-sm">Total de Itens</div>
          <div className="text-white text-3xl font-bold">{itens.length}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border-l-4 border-yellow-500">
          <div className="text-slate-400 text-sm">Entregas Próximas (7 dias)</div>
          <div className="text-white text-3xl font-bold">
            {itens.filter(i => {
              if (!i.data_entrega) return false;
              const diff = new Date(i.data_entrega) - new Date();
              return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
            }).length}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border-l-4 border-red-500">
          <div className="text-slate-400 text-sm">Atrasados</div>
          <div className="text-white text-3xl font-bold">
            {itens.filter(i => isAtrasado(i.data_entrega)).length}
          </div>
        </div>
      </div>

      {/* Tabela estilo aeroporto */}
      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr className="text-left text-slate-300 text-sm font-semibold uppercase tracking-wider">
                <th className="px-4 py-4">OP</th>
                <th className="px-4 py-4">Item</th>
                <th className="px-4 py-4">Cliente</th>
                <th className="px-4 py-4">Equipamento</th>
                <th className="px-4 py-4">Qtd</th>
                <th className="px-4 py-4">Peso</th>
                <th className="px-4 py-4">Responsável</th>
                <th className="px-4 py-4">Entrega</th>
                <th className="px-4 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {itens.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-400">
                    Nenhum item na fila
                  </td>
                </tr>
              ) : (
                itens.map((item, index) => {
                  const atrasado = isAtrasado(item.data_entrega);
                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-slate-700 transition-colors ${
                        atrasado ? 'bg-red-900/20' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-mono text-red-400 font-bold text-lg">
                          {item.numero_op}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className={`text-white ${atrasado ? 'font-bold' : ''}`}>
                          {item.descricao}
                        </div>
                        {item.codigo_ga && (
                          <div className="text-slate-400 text-sm">
                            Cód: {item.codigo_ga}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-white">{item.cliente}</td>
                      <td className="px-4 py-4 text-slate-300">{item.equipamento_principal}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="text-white border-slate-600">
                          {item.quantidade}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {item.peso ? `${item.peso} kg` : '-'}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {item.responsavel_op || '-'}
                      </td>
                      <td className="px-4 py-4">
                        {item.data_entrega ? (
                          <div className={atrasado ? 'text-red-400 font-bold' : 'text-white'}>
                            <div className="flex items-center gap-2">
                              {atrasado && <AlertTriangle className="w-4 h-4" />}
                              {format(new Date(item.data_entrega), 'dd/MM/yyyy')}
                            </div>
                            <div className="text-xs text-slate-400">
                              {format(new Date(item.data_entrega), 'EEEE', { locale: ptBR })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {atrasado ? (
                          <Badge className="bg-red-600 text-white font-bold animate-pulse">
                            ATRASADO
                          </Badge>
                        ) : (
                          <Badge className="bg-red-600 text-white">
                            NO PRAZO
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}