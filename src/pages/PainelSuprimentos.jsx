import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, Package } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PainelSuprimentos() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-painel-suprimentos'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'suprimentos' });
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-500 to-orange-700">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-orange-700 p-6 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-5xl font-bold tracking-tight">SUPRIMENTOS</h1>
            <div className="text-right">
              <p className="text-3xl font-bold">{format(currentTime, 'HH:mm:ss')}</p>
              <p className="text-lg opacity-90">{format(currentTime, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8" />
                <div>
                  <p className="text-3xl font-bold">{itens.length}</p>
                  <p className="text-sm opacity-90">Total de Itens</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8" />
                <div>
                  <p className="text-3xl font-bold">{proximosSeteDias}</p>
                  <p className="text-sm opacity-90">Próximos 7 Dias</p>
                </div>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8" />
                <div>
                  <p className="text-3xl font-bold">{atrasados}</p>
                  <p className="text-sm opacity-90">Atrasados</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-white/20 border-b border-white/20">
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
            <tbody>
              {itens.map((item, idx) => {
                const atrasado = isAtrasado(item.data_entrega);
                return (
                  <tr 
                    key={item.id} 
                    className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                      atrasado ? 'bg-red-500/30' : idx % 2 === 0 ? 'bg-white/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-mono font-bold">{item.numero_op}</td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="font-medium truncate">{item.descricao}</p>
                        {item.codigo_ga && <p className="text-sm opacity-75">Cód: {item.codigo_ga}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">{item.cliente}</td>
                    <td className="px-6 py-4">{item.responsavel_op || '-'}</td>
                    <td className="px-6 py-4 font-bold">{item.quantidade}</td>
                    <td className="px-6 py-4">{item.peso ? `${item.peso} kg` : '-'}</td>
                    <td className="px-6 py-4">
                      {item.data_entrega ? (
                        <span className={atrasado ? 'font-bold text-red-200' : 'font-medium'}>
                          {format(new Date(item.data_entrega), 'dd/MM/yyyy')}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {atrasado ? (
                        <div className="flex items-center gap-2 text-red-200 font-bold">
                          <AlertTriangle className="w-5 h-5 animate-pulse" />
                          ATRASADO
                        </div>
                      ) : (
                        <span className="text-green-200 font-medium">No Prazo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {itens.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-20 h-20 mx-auto mb-4 opacity-50" />
            <p className="text-2xl font-medium opacity-90">Nenhum item em suprimentos</p>
          </div>
        )}
      </div>
    </div>
  );
}