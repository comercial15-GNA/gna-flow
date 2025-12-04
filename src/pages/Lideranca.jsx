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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  LayoutDashboard, 
  Search,
  FileSpreadsheet,
  Filter,
  Package,
  FileText,
  Clock,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'finalizada', label: 'Finalizada' },
];

const ETAPA_OPTIONS = [
  { value: 'all', label: 'Todas as Etapas' },
  { value: 'engenharia', label: 'Engenharia' },
  { value: 'modelagem', label: 'Modelagem' },
  { value: 'suprimentos', label: 'Suprimentos' },
  { value: 'fundicao', label: 'Fundição' },
  { value: 'usinagem', label: 'Usinagem' },
  { value: 'liberacao', label: 'Liberação' },
  { value: 'finalizado', label: 'Finalizado' },
];

const ETAPA_COLORS = {
  engenharia: 'bg-green-100 text-green-800',
  modelagem: 'bg-yellow-100 text-yellow-800',
  suprimentos: 'bg-orange-100 text-orange-800',
  fundicao: 'bg-red-100 text-red-800',
  usinagem: 'bg-cyan-100 text-cyan-800',
  liberacao: 'bg-emerald-100 text-emerald-800',
  finalizado: 'bg-purple-100 text-purple-800'
};

export default function Lideranca() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [etapaFilter, setEtapaFilter] = useState('all');
  const [responsavelFilter, setResponsavelFilter] = useState('all');

  const { data: ops = [], isLoading: loadingOPs } = useQuery({
    queryKey: ['ops-lideranca'],
    queryFn: () => base44.entities.OrdemProducao.list('data_lancamento'),
  });

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: ['itens-lideranca'],
    queryFn: () => base44.entities.ItemOP.list('data_entrada_etapa'),
  });

  // Responsáveis únicos
  const responsaveisUnicos = [...new Set(ops.map(op => op.responsavel).filter(Boolean))];

  // Filtrar itens
  const itensFiltrados = itens.filter(item => {
    const op = ops.find(o => o.id === item.op_id);
    const matchSearch = !searchTerm || 
      item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cliente?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEtapa = etapaFilter === 'all' || item.etapa_atual === etapaFilter;
    const matchResponsavel = responsavelFilter === 'all' || op?.responsavel === responsavelFilter;
    const matchStatus = statusFilter === 'all' || op?.status === statusFilter;
    
    return matchSearch && matchEtapa && matchResponsavel && matchStatus;
  });

  const gerarRelatorio = () => {
    const dados = itensFiltrados.map(item => {
      const op = ops.find(o => o.id === item.op_id);
      return {
        'OP': item.numero_op,
        'Descrição': item.descricao,
        'Código GA': item.codigo_ga || '-',
        'Peso (kg)': item.peso || '-',
        'Quantidade': item.quantidade,
        'Cliente': item.cliente,
        'Etapa Atual': item.etapa_atual,
        'Responsável': op?.responsavel || '-',
        'Status OP': op?.status || '-',
        'Data Entrega': item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yyyy') : '-',
        'Entrada Etapa': item.data_entrada_etapa ? format(new Date(item.data_entrada_etapa), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'
      };
    });

    if (dados.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = Object.keys(dados[0]).join(';');
    const rows = dados.map(row => Object.values(row).join(';')).join('\n');
    const csv = `${headers}\n${rows}`;
    
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
    finalizadas: ops.filter(op => op.status === 'finalizada').length,
    totalItens: itens.length,
    finalizados: itens.filter(i => i.etapa_atual === 'finalizado').length
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel de Liderança</h1>
            <p className="text-slate-500">Visão geral de todas as OPs e itens</p>
          </div>
        </div>
        <Button onClick={gerarRelatorio} className="bg-indigo-600 hover:bg-indigo-700">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Gerar Relatório
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.finalizadas}</p>
              <p className="text-xs text-slate-500">Finalizadas</p>
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
              <p className="text-2xl font-bold text-slate-800">{stats.finalizados}</p>
              <p className="text-xs text-slate-500">Itens Finalizados</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar OP, descrição, cliente..."
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
          <Select value={etapaFilter} onValueChange={setEtapaFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              {ETAPA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Itens ({itensFiltrados.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>OP</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Entrada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingItens ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : itensFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              ) : (
                itensFiltrados.map((item) => {
                  const op = ops.find(o => o.id === item.op_id);
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{item.numero_op}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-800">{item.descricao}</p>
                          <p className="text-xs text-slate-500">
                            {item.equipamento_principal && `${item.equipamento_principal} • `}
                            {item.codigo_ga || ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{item.cliente}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                      <TableCell>
                        <Badge className={ETAPA_COLORS[item.etapa_atual]}>
                          {item.etapa_atual}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{op?.responsavel || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yy') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {item.data_entrada_etapa 
                          ? format(new Date(item.data_entrada_etapa), 'dd/MM/yy HH:mm', { locale: ptBR })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}