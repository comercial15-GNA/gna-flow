import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Calendar, Weight, TrendingUp, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ETAPAS = [
  { key: 'engenharia', label: 'Engenharia', color: 'bg-green-500' },
  { key: 'modelagem', label: 'Modelagem', color: 'bg-yellow-500' },
  { key: 'suprimentos', label: 'Suprimentos', color: 'bg-orange-500' },
  { key: 'fundicao', label: 'Fundição', color: 'bg-red-500' },
  { key: 'acabamento', label: 'Acabamento', color: 'bg-pink-500' },
  { key: 'usinagem', label: 'Usinagem', color: 'bg-cyan-500' },
  { key: 'liberacao', label: 'Liberação', color: 'bg-emerald-500' },
  { key: 'expedicao', label: 'Expedição', color: 'bg-teal-500' },
  { key: 'coleta', label: 'Coleta', color: 'bg-amber-500' },
  { key: 'suporte_industrial', label: 'Suporte Industrial', color: 'bg-slate-500' }
];

export default function RelatoriosPeso() {
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;
  
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual.toString());
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual.toString());

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['todos-itens-peso'],
    queryFn: () => base44.entities.ItemOP.list()
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-all'],
    queryFn: () => base44.entities.OrdemProducao.list()
  });

  // Verificar acesso
  if (user && user.setor !== 'administrador' && user.setor !== 'comercial') {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Card className="p-8">
          <Package className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600">
            Esta página está disponível apenas para Comercial e Administradores.
          </p>
        </Card>
      </div>
    );
  }

  // Filtrar itens NÃO finalizados (em andamento na produção)
  const itensEmAndamento = itens.filter(i => i.etapa_atual !== 'finalizado');

  // Calcular peso total por mês/ano (baseado na data de lançamento da OP)
  const calcularPeso = (ano, mes = null) => {
    return itensEmAndamento.reduce((total, item) => {
      const op = ops.find(o => o.id === item.op_id);
      if (!op || !op.data_lancamento) return total;
      
      const dataOP = new Date(op.data_lancamento);
      const anoOP = dataOP.getFullYear();
      const mesOP = dataOP.getMonth() + 1;
      
      if (mes) {
        if (anoOP === parseInt(ano) && mesOP === parseInt(mes)) {
          return total + (item.peso || 0);
        }
      } else {
        if (anoOP === parseInt(ano)) {
          return total + (item.peso || 0);
        }
      }
      return total;
    }, 0);
  };

  const pesoTotalAnual = calcularPeso(anoSelecionado);
  const pesoTotalMensal = calcularPeso(anoSelecionado, mesSelecionado);

  // Calcular peso por etapa (em andamento)
  const pesoPorEtapa = ETAPAS.map(etapa => {
    const itensEtapa = itensEmAndamento.filter(i => i.etapa_atual === etapa.key);
    const peso = itensEtapa.reduce((total, item) => total + (item.peso || 0), 0);
    return {
      ...etapa,
      peso,
      quantidade: itensEtapa.length
    };
  }).filter(e => e.quantidade > 0);

  const pesoTotalEmAndamento = pesoPorEtapa.reduce((total, e) => total + e.peso, 0);

  const anos = [2024, 2025, 2026];
  const meses = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Relatórios de Peso</h1>
            <p className="text-slate-600">Acompanhamento de peso por período e etapa</p>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">Filtros de Período</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Ano</label>
              <Select value={anoSelecionado} onValueChange={setAnoSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map(ano => (
                    <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mês</label>
              <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(mes => (
                    <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Cards de Totais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium mb-1">Peso Total Anual ({anoSelecionado})</p>
                <p className="text-4xl font-bold text-blue-900">{pesoTotalAnual.toFixed(2)}</p>
                <p className="text-sm text-blue-700">quilogramas</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center">
                <Weight className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-700 font-medium mb-1">
                  Peso Total Mensal ({meses.find(m => m.value === mesSelecionado)?.label})
                </p>
                <p className="text-4xl font-bold text-purple-900">{pesoTotalMensal.toFixed(2)}</p>
                <p className="text-sm text-purple-700">quilogramas</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Peso em Andamento por Etapa */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800 text-lg">Peso em Andamento por Etapa</h3>
          </div>

          <div className="space-y-4">
            {pesoPorEtapa.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nenhum item em andamento
              </div>
            ) : (
              pesoPorEtapa.map(etapa => {
                const percentual = pesoTotalEmAndamento > 0 ? (etapa.peso / pesoTotalEmAndamento) * 100 : 0;
                return (
                  <div key={etapa.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${etapa.color}`}></div>
                        <span className="font-medium text-slate-700">{etapa.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {etapa.quantidade} {etapa.quantidade === 1 ? 'item' : 'itens'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">{percentual.toFixed(1)}%</span>
                        <span className="font-bold text-slate-800">{etapa.peso.toFixed(2)} kg</span>
                      </div>
                    </div>
                    <Progress value={percentual} className="h-2" />
                  </div>
                );
              })
            )}
          </div>

          {pesoPorEtapa.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Total em Andamento</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-800 text-white">
                    {itensEmAndamento.length} itens
                  </Badge>
                  <span className="text-2xl font-bold text-slate-800">{pesoTotalEmAndamento.toFixed(2)} kg</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}