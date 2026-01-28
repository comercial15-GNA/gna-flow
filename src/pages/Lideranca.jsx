import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LayoutDashboard, 
  Search,
  FileSpreadsheet,
  Filter,
  Package,
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  Eye,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import EtapaChart from '@/components/lideranca/EtapaChart';
import OPDetailPanel from '@/components/lideranca/OPDetailPanel';
import ItemOPActions from '@/components/producao/ItemOPActions';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'coleta', label: 'Coleta' },
  { value: 'finalizado', label: 'Finalizado' },
];

const ETAPA_OPTIONS = [
  { value: 'all', label: 'Todas as Etapas' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'engenharia', label: 'Engenharia' },
  { value: 'modelagem', label: 'Modelagem' },
  { value: 'suprimentos', label: 'Suprimentos' },
  { value: 'fundicao', label: 'Fundição' },
  { value: 'acabamento', label: 'Acabamento' },
  { value: 'usinagem', label: 'Usinagem' },
  { value: 'liberacao', label: 'Liberação' },
  { value: 'expedicao', label: 'Expedição' },
  { value: 'suporte_industrial', label: 'Suporte Industrial' },
  { value: 'coleta', label: 'Coleta' },
  { value: 'finalizado', label: 'Finalizado' },
];

const ETAPA_COLORS = {
  comercial: 'bg-blue-100 text-blue-800',
  engenharia: 'bg-green-100 text-green-800',
  modelagem: 'bg-yellow-100 text-yellow-800',
  suprimentos: 'bg-orange-100 text-orange-800',
  fundicao: 'bg-red-100 text-red-800',
  acabamento: 'bg-pink-100 text-pink-800',
  usinagem: 'bg-cyan-100 text-cyan-800',
  liberacao: 'bg-emerald-100 text-emerald-800',
  expedicao: 'bg-teal-100 text-teal-800',
  suporte_industrial: 'bg-indigo-100 text-indigo-800',
  coleta: 'bg-violet-100 text-violet-800',
  finalizado: 'bg-purple-100 text-purple-800'
};

const ETAPA_LABELS = {
  comercial: 'Comercial',
  engenharia: 'Engenharia',
  modelagem: 'Modelagem',
  suprimentos: 'Suprimentos',
  fundicao: 'Fundição',
  acabamento: 'Acabamento',
  usinagem: 'Usinagem',
  liberacao: 'Liberação',
  expedicao: 'Expedição',
  suporte_industrial: 'Suporte Industrial',
  coleta: 'Coleta',
  finalizado: 'Finalizado'
};

export default function Lideranca() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [etapaFilter, setEtapaFilter] = useState('all');
  const [responsavelFilter, setResponsavelFilter] = useState('all');
  const [clienteFilter, setClienteFilter] = useState('all');
  const [filtroData, setFiltroData] = useState('todos');
  const [dataEspecifica, setDataEspecifica] = useState('');
  const [selectedOP, setSelectedOP] = useState(null);

  const { data: ops = [], isLoading: loadingOPs } = useQuery({
    queryKey: ['ops-lideranca'],
    queryFn: () => base44.entities.OrdemProducao.list('data_lancamento'),
  });

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: ['itens-lideranca'],
    queryFn: () => base44.entities.ItemOP.list('data_entrada_etapa'),
  });

  const responsaveisUnicos = [...new Set(ops.map(op => op.responsavel).filter(Boolean))];
  const clientesUnicos = [...new Set(ops.map(op => op.cliente).filter(Boolean))].sort();

  // Filtrar OPs
  const opsFiltradas = ops.filter(op => {
    const matchSearch = !searchTerm || 
      op.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.ordem_compra?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchResponsavel = responsavelFilter === 'all' || op.responsavel === responsavelFilter;
    const matchCliente = clienteFilter === 'all' || op.cliente === clienteFilter;
    const matchStatus = statusFilter === 'all' || op.status === statusFilter;
    
    // Filtrar por etapa: verificar se a OP tem pelo menos um item na etapa selecionada
    const itensOP = itens.filter(i => i.op_id === op.id);
    const matchEtapa = etapaFilter === 'all' || itensOP.some(i => i.etapa_atual === etapaFilter);
    
    // Filtro de data
    let matchData = true;
    if (filtroData === 'atrasados') {
      matchData = itensOP.some(item => {
        if (!item.data_entrega) return false;
        const dataEntrega = new Date(item.data_entrega);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return dataEntrega < hoje;
      });
    } else if (filtroData === 'data_especifica' && dataEspecifica) {
      matchData = itensOP.some(item => item.data_entrega === dataEspecifica);
    }
    
    return matchSearch && matchResponsavel && matchCliente && matchStatus && matchEtapa && matchData;
  });

  const gerarRelatorio = () => {
    const dados = [];
    opsFiltradas.forEach(op => {
      const itensOP = itens.filter(i => i.op_id === op.id);
      itensOP.forEach(item => {
        dados.push({
          'OP': item.numero_op,
          'O.C': op.ordem_compra || '-',
          'Equipamento': item.equipamento_principal || '-',
          'Descrição': item.descricao,
          'Observação': item.observacao || '-',
          'Código GA': item.codigo_ga || '-',
          'Peso (kg)': item.peso || '-',
          'Quantidade': item.quantidade,
          'Cliente': item.cliente,
          'Etapa Atual': ETAPA_LABELS[item.etapa_atual] || item.etapa_atual,
          'Responsável': op.responsavel || '-',
          'Status OP': op.status === 'em_andamento' ? 'Em Andamento' : 'Finalizada',
          'Data Entrega': item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yyyy') : '-',
          'Entrada Etapa': item.data_entrada_etapa ? format(new Date(item.data_entrada_etapa), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'
        });
      });
    });

    if (dados.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = Object.keys(dados[0]).join(';');
    const rows = dados.map(row => Object.values(row).join(';')).join('\n');
    const csv = `\uFEFF${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_lideranca_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  const stats = {
    totalOPs: ops.length,
    emAndamento: ops.filter(op => op.status === 'em_andamento').length,
    coleta: ops.filter(op => op.status === 'coleta').length,
    finalizado: ops.filter(op => op.status === 'finalizado').length,
    totalItens: itens.length,
    responsaveis: responsaveisUnicos.length
  };

  const handleEtapaClick = (etapa) => {
    setEtapaFilter(etapaFilter === etapa ? 'all' : etapa);
  };

  const selectedOPData = selectedOP ? ops.find(op => op.id === selectedOP) : null;
  const selectedOPItens = selectedOP ? itens.filter(i => i.op_id === selectedOP) : [];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel de Liderança</h1>
            <p className="text-slate-500">Visão geral completa da produção</p>
          </div>
        </div>
        <Button onClick={gerarRelatorio} className="bg-indigo-600 hover:bg-indigo-700">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalOPs}</p>
              <p className="text-xs text-slate-500">Total OPs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.emAndamento}</p>
              <p className="text-xs text-slate-500">Em Andamento</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.coleta}</p>
              <p className="text-xs text-slate-500">Coleta</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalItens}</p>
              <p className="text-xs text-slate-500">Total Itens</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.finalizado}</p>
              <p className="text-xs text-slate-500">Finalizadas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.responsaveis}</p>
              <p className="text-xs text-slate-500">Responsáveis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Gráfico de Etapas */}
        <div className="lg:col-span-1">
          <EtapaChart 
            itens={itens} 
            onEtapaClick={handleEtapaClick}
            etapaSelecionada={etapaFilter !== 'all' ? etapaFilter : null}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Filtros</span>
              {etapaFilter !== 'all' && (
                <Badge className="ml-2 bg-indigo-100 text-indigo-700">
                  Etapa: {ETAPA_LABELS[etapaFilter]}
                  <button onClick={() => setEtapaFilter('all')} className="ml-1 hover:text-indigo-900">×</button>
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar OP, cliente, O.C, equipamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clienteFilter} onValueChange={setClienteFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {clientesUnicos.map((cliente) => (
                    <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Responsáveis</SelectItem>
                  {responsaveisUnicos.map((resp) => (
                    <SelectItem key={resp} value={resp}>{resp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroData} onValueChange={setFiltroData}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Datas</SelectItem>
                  <SelectItem value="atrasados">Atrasados</SelectItem>
                  <SelectItem value="data_especifica">Data Específica</SelectItem>
                </SelectContent>
              </Select>
              {filtroData === 'data_especifica' && (
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="date"
                    value={dataEspecifica}
                    onChange={(e) => setDataEspecifica(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Lista de OPs ou Detalhe da OP */}
          {selectedOPData ? (
            <OPDetailPanel 
              op={selectedOPData} 
              itens={selectedOPItens} 
              onClose={() => setSelectedOP(null)} 
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Ordens de Produção ({opsFiltradas.length})</h2>
              </div>
              
              {loadingOPs ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div>
                </div>
              ) : opsFiltradas.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>Nenhuma OP encontrada</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {opsFiltradas.map((op) => {
                    const itensOP = itens.filter(i => i.op_id === op.id);
                    const itensFinalizados = itensOP.filter(i => i.etapa_atual === 'finalizado').length;
                    const progressPercent = itensOP.length > 0 ? Math.round((itensFinalizados / itensOP.length) * 100) : 0;
                    
                    // Distribuição por etapa
                    const etapas = itensOP.reduce((acc, item) => {
                      acc[item.etapa_atual] = (acc[item.etapa_atual] || 0) + 1;
                      return acc;
                    }, {});

                    return (
                      <div 
                        key={op.id} 
                        className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedOP(op.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-800">{op.numero_op}</h3>
                              {op.ordem_compra && (
                                <Badge variant="outline" className="text-blue-700 border-blue-300">
                                  O.C: {op.ordem_compra}
                                </Badge>
                              )}
                              <Badge className={
                                op.status === 'em_andamento' ? 'bg-amber-100 text-amber-800' : 
                                op.status === 'coleta' ? 'bg-purple-100 text-purple-800' :
                                'bg-emerald-100 text-emerald-800'
                              }>
                                {op.status === 'em_andamento' ? 'Em Andamento' : 
                                 op.status === 'coleta' ? 'Coleta' : 'Finalizado'}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">{op.equipamento_principal} • {op.cliente}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Responsável: {op.responsavel || '-'} • 
                              Lançamento: {op.data_lancamento ? format(new Date(op.data_lancamento), 'dd/MM/yyyy') : '-'}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </div>

                        {/* Mini Progress */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>{itensOP.length} itens</span>
                            <span>{progressPercent}% concluído</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-indigo-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Etapas */}
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(etapas).map(([etapa, count]) => (
                            <Badge key={etapa} variant="outline" className={`text-xs ${ETAPA_COLORS[etapa]}`}>
                              {ETAPA_LABELS[etapa]}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}