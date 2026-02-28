import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, TrendingUp, Package, Calendar, BarChart2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { parseISO } from 'date-fns';
import GraficoMensal from '../components/relatorios/GraficoMensal';
import DetalhesMes from '../components/relatorios/DetalhesMes';

const ETAPAS_PRODUCAO = [
  { value: 'engenharia', label: 'Engenharia', color: 'bg-green-100 text-green-800', bar: '#22c55e' },
  { value: 'modelagem', label: 'Modelagem', color: 'bg-yellow-100 text-yellow-800', bar: '#eab308' },
  { value: 'suprimentos', label: 'Suprimentos', color: 'bg-orange-100 text-orange-800', bar: '#f97316' },
  { value: 'fundicao', label: 'Fundição', color: 'bg-red-100 text-red-800', bar: '#ef4444' },
  { value: 'acabamento', label: 'Acabamento', color: 'bg-pink-100 text-pink-800', bar: '#ec4899' },
  { value: 'usinagem', label: 'Usinagem', color: 'bg-cyan-100 text-cyan-800', bar: '#06b6d4' },
  { value: 'caldeiraria', label: 'Caldeiraria', color: 'bg-amber-100 text-amber-800', bar: '#f59e0b' },
  { value: 'liberacao', label: 'Liberação', color: 'bg-emerald-100 text-emerald-800', bar: '#10b981' },
  { value: 'expedicao', label: 'Expedição', color: 'bg-teal-100 text-teal-800', bar: '#14b8a6' },
  { value: 'suporte_industrial', label: 'Suporte Industrial', color: 'bg-purple-100 text-purple-800', bar: '#a855f7' },
  { value: 'coleta', label: 'Coleta', color: 'bg-indigo-100 text-indigo-800', bar: '#6366f1' },
];

const formatPeso = (peso) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(peso || 0);

export default function RelatoriosPeso() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [mesSelecionado, setMesSelecionado] = useState(null); // null = visão geral
  const [modoData, setModoData] = useState('entrega'); // 'entrega' | 'lancamento'
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['all-items-peso'],
    queryFn: () => base44.entities.ItemOP.list(),
  });

  const { data: allOPs = [] } = useQuery({
    queryKey: ['all-ops-peso'],
    queryFn: () => base44.entities.OrdemProducao.list(),
  });

  if (currentUser && currentUser.setor !== 'comercial' && currentUser.setor !== 'administrador') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Scale className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-500">Esta área é exclusiva para Comercial e Administradores.</p>
        </div>
      </div>
    );
  }

  // Calcular peso por mês para o ano selecionado
  const dadosMensais = useMemo(() => {
    const meses = {};
    for (let m = 1; m <= 12; m++) meses[m] = 0;

    if (modoData === 'entrega') {
      allItems.forEach(item => {
        if (!item.data_entrega || !item.peso) return;
        const d = parseISO(item.data_entrega);
        if (d.getFullYear() !== selectedYear) return;
        meses[d.getMonth() + 1] += (item.peso || 0) * (item.quantidade || 1);
      });
    } else if (modoData === 'lancamento') {
      allItems.forEach(item => {
        if (!item.peso) return;
        const op = allOPs.find(o => o.id === item.op_id);
        if (!op?.data_lancamento) return;
        const d = new Date(op.data_lancamento);
        if (d.getFullYear() !== selectedYear) return;
        meses[d.getMonth() + 1] += (item.peso || 0) * (item.quantidade || 1);
      });
    } else {
      // A Entregar: itens com data de entrega no mês mas ainda em produção (não finalizados)
      allItems.forEach(item => {
        if (!item.data_entrega || !item.peso) return;
        if (item.etapa_atual === 'finalizado') return;
        const d = parseISO(item.data_entrega);
        if (d.getFullYear() !== selectedYear) return;
        meses[d.getMonth() + 1] += (item.peso || 0) * (item.quantidade || 1);
      });
    }

    return meses;
  }, [allItems, allOPs, selectedYear, modoData]);

  const pesoTotalAnual = useMemo(() =>
    Object.values(dadosMensais).reduce((s, v) => s + v, 0),
    [dadosMensais]
  );

  // Peso por etapa (itens em andamento, qualquer ano)
  const pesoPorEtapa = useMemo(() => {
    const etapas = {};
    ETAPAS_PRODUCAO.forEach(e => { etapas[e.value] = 0; });
    allItems.forEach(item => {
      if (!item.peso || item.etapa_atual === 'finalizado') return;
      if (etapas[item.etapa_atual] !== undefined) {
        etapas[item.etapa_atual] += (item.peso || 0) * (item.quantidade || 1);
      }
    });
    return etapas;
  }, [allItems]);

  const pesoTotalEmAndamento = useMemo(() =>
    Object.values(pesoPorEtapa).reduce((s, v) => s + v, 0),
    [pesoPorEtapa]
  );

  if (mesSelecionado) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <DetalhesMes
          mes={mesSelecionado}
          ano={selectedYear}
          itens={allItems}
          ops={allOPs}
          onVoltar={() => setMesSelecionado(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Scale className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Relatório de Peso</h1>
            <p className="text-slate-500 text-sm">Visão geral — clique em um mês para detalhar</p>
          </div>
        </div>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Total Anual {selectedYear}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold text-slate-800">{formatPeso(pesoTotalAnual)}</span>
                  <span className="text-slate-400">kg</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Em Andamento (todas as etapas)
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold text-slate-800">{formatPeso(pesoTotalEmAndamento)}</span>
                  <span className="text-slate-400">kg</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Scale className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras mensal */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="w-4 h-4" />
                Peso por Mês — {selectedYear}
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                {modoData === 'entrega' ? 'Data de entrega dos itens' : 'Data de lançamento da OP'} · Clique em um mês para ver detalhes
              </p>
            </div>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden text-sm">
              <button
                onClick={() => setModoData('entrega')}
                className={`px-3 py-1.5 transition-colors ${modoData === 'entrega' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Data Entrega
              </button>
              <button
                onClick={() => setModoData('lancamento')}
                className={`px-3 py-1.5 transition-colors ${modoData === 'lancamento' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Data Lançamento
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <GraficoMensal
              dadosMensais={dadosMensais}
              mesSelecionado={mesSelecionado}
              onSelecionarMes={setMesSelecionado}
            />
          )}
        </CardContent>
      </Card>

      {/* Peso por etapa em andamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4" />
            Peso em Andamento por Etapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ETAPAS_PRODUCAO.map(etapa => {
              const peso = pesoPorEtapa[etapa.value] || 0;
              const pct = pesoTotalEmAndamento > 0 ? (peso / pesoTotalEmAndamento) * 100 : 0;
              return (
                <div key={etapa.value}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={`${etapa.color} text-xs`}>{etapa.label}</Badge>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold text-slate-800">{formatPeso(peso)}</span>
                      <span className="text-xs text-slate-400">kg</span>
                      {pct > 0 && <span className="text-xs text-slate-400">({pct.toFixed(1)}%)</span>}
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: etapa.bar }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}