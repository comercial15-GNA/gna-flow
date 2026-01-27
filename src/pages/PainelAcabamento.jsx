import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Package } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PainelAcabamento() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-painel-acabamento'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'acabamento' });
      return items.sort((a, b) => {
        if (!a.data_entrega) return 1;
        if (!b.data_entrega) return -1;
        return new Date(a.data_entrega) - new Date(b.data_entrega);
      }).slice(0, 30);
    },
    refetchInterval: 120000
  });

  const isAtrasado = (dataEntrega) => {
    if (!dataEntrega) return false;
    return isBefore(startOfDay(new Date(dataEntrega)), startOfDay(new Date()));
  };

  const proximosSeteDias = itens.filter(item => {
    if (!item.data_entrega) return false;
    const dataEntrega = new Date(item.data_entrega);
    const hoje = new Date();
    const seteDias = new Date();
    seteDias.setDate(hoje.getDate() + 7);
    return dataEntrega >= hoje && dataEntrega <= seteDias;
  }).length;

  const atrasados = itens.filter(item => isAtrasado(item.data_entrega)).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border-b-4 border-pink-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-pink-500 rounded-xl flex items-center justify-center">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold tracking-tight">ACABAMENTO</h1>
                <p className="text-pink-400 text-lg">Próximas 30 Ordens de Produção</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white text-2xl font-mono">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="text-slate-400 text-sm">
                {format(currentTime, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4 border-l-4 border-pink-500">
            <div className="text-slate-400 text-sm">Total de Itens</div>
            <div className="text-white text-3xl font-bold">{itens.length}</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border-l-4 border-yellow-500">
            <div className="text-slate-400 text-sm">Entregas Próximas (7 dias)</div>
            <div className="text-white text-3xl font-bold">{proximosSeteDias}</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border-l-4 border-red-500">
            <div className="text-slate-400 text-sm">Atrasados</div>
            <div className="text-white text-3xl font-bold">{atrasados}</div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr className="text-left text-slate-300 text-sm font-semibold uppercase tracking-wider">
                <th className="px-6 py-4 text-left font-bold">OP</th>
                <th className="px-6 py-4 text-left font-bold">DESCRIÇÃO</th>
                <th className="px-6 py-4 text-left font-bold">CLIENTE</th>
                <th className="px-6 py-4 text-left font-bold">RESPONSÁVEL</th>
                <th className="px-6 py-4 text-left font-bold">QTDE</th>
                <th className="px-6 py-4 text-left font-bold">PESO</th>
                <th className="px-6 py-4 text-left font-bold">ENTREGA</th>
                <th className="px-6 py-4 text-left font-bold">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {itens.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    Nenhum item na fila
                  </td>
                </tr>
              ) : (
                itens.map((item, idx) => {
                  const atrasado = isAtrasado(item.data_entrega);
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-700 transition-colors ${
                        atrasado ? 'bg-red-900/20' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-mono text-pink-400 font-bold text-lg">
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
                      <td className="px-4 py-4 text-slate-300">{item.responsavel_op || '-'}</td>
                      <td className="px-4 py-4 font-bold text-white">{item.quantidade}</td>
                      <td className="px-4 py-4 text-slate-300">{item.peso ? `${item.peso} kg` : '-'}</td>
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
                          <Badge className="bg-pink-600 text-white">
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

        {itens.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-20 h-20 mx-auto mb-4 opacity-50" />
            <p className="text-2xl font-medium opacity-90">Nenhum item em acabamento</p>
          </div>
        )}
      </div>
    </div>
  );
}