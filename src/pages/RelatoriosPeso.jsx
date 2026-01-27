import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, TrendingUp, Package, Calendar, Filter } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const ETAPAS_PRODUCAO = [
  { value: 'engenharia', label: 'Engenharia', color: 'bg-green-100 text-green-800' },
  { value: 'modelagem', label: 'Modelagem', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'suprimentos', label: 'Suprimentos', color: 'bg-orange-100 text-orange-800' },
  { value: 'fundicao', label: 'Fundição', color: 'bg-red-100 text-red-800' },
  { value: 'acabamento', label: 'Acabamento', color: 'bg-pink-100 text-pink-800' },
  { value: 'usinagem', label: 'Usinagem', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'liberacao', label: 'Liberação', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'expedicao', label: 'Expedição', color: 'bg-teal-100 text-teal-800' },
  { value: 'suporte_industrial', label: 'Suporte Industrial', color: 'bg-purple-100 text-purple-800' },
  { value: 'coleta', label: 'Coleta', color: 'bg-indigo-100 text-indigo-800' },
];

export default function RelatoriosPeso() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

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

  // Verifica permissão de acesso
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

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  // Cálculos de peso
  const { pesoTotalAnual, pesoTotalMensal, pesoPorEtapa } = useMemo(() => {
    const itensComPeso = allItems.filter(item => item.peso && item.peso > 0 && item.etapa_atual !== 'finalizado');

    // Peso total anual
    const pesoAnual = itensComPeso
      .filter(item => {
        const opCorrespondente = allOPs.find(op => op.id === item.op_id);
        if (!opCorrespondente) return false;
        const dataLancamento = new Date(opCorrespondente.data_lancamento);
        return dataLancamento.getFullYear() === selectedYear;
      })
      .reduce((acc, item) => acc + (item.peso * (item.quantidade || 1)), 0);

    // Peso total mensal
    const pesoMensal = itensComPeso
      .filter(item => {
        const opCorrespondente = allOPs.find(op => op.id === item.op_id);
        if (!opCorrespondente) return false;
        const dataLancamento = new Date(opCorrespondente.data_lancamento);
        return dataLancamento.getFullYear() === selectedYear && 
               dataLancamento.getMonth() + 1 === selectedMonth;
      })
      .reduce((acc, item) => acc + (item.peso * (item.quantidade || 1)), 0);

    // Peso por etapa (itens em andamento)
    const pesoEtapas = {};
    ETAPAS_PRODUCAO.forEach(etapa => {
      const itensNaEtapa = itensComPeso.filter(item => item.etapa_atual === etapa.value);
      pesoEtapas[etapa.value] = itensNaEtapa.reduce((acc, item) => acc + (item.peso * (item.quantidade || 1)), 0);
    });

    return {
      pesoTotalAnual: pesoAnual,
      pesoTotalMensal: pesoMensal,
      pesoPorEtapa: pesoEtapas,
    };
  }, [allItems, allOPs, selectedYear, selectedMonth]);

  const formatPeso = (peso) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(peso);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Scale className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Relatório de Peso</h1>
              <p className="text-slate-500">Acompanhamento de peso por período e etapa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm text-slate-600 mb-1 block">Ano</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-slate-600 mb-1 block">Mês</label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-slate-600">
              <Calendar className="w-4 h-4" />
              Peso Total Anual ({selectedYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-800">{formatPeso(pesoTotalAnual)}</span>
              <span className="text-lg text-slate-500">kg</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-slate-600">
              <TrendingUp className="w-4 h-4" />
              Peso Total Mensal ({months.find(m => m.value === selectedMonth)?.label})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-800">{formatPeso(pesoTotalMensal)}</span>
              <span className="text-lg text-slate-500">kg</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peso por Etapa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Peso em Andamento por Etapa de Produção
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {ETAPAS_PRODUCAO.map(etapa => {
                const peso = pesoPorEtapa[etapa.value] || 0;
                const percentual = pesoTotalAnual > 0 ? (peso / pesoTotalAnual) * 100 : 0;
                
                return (
                  <div key={etapa.value} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={etapa.color}>{etapa.label}</Badge>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-slate-800">{formatPeso(peso)}</span>
                        <span className="text-sm text-slate-500">kg</span>
                        {percentual > 0 && (
                          <span className="text-sm text-slate-400">({percentual.toFixed(1)}%)</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(percentual, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}