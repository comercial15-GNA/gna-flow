import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sparkles, 
  Search,
  Package,
  ArrowRight,
  RotateCcw,
  FileText,
  ExternalLink,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ItemOPActions from '@/components/producao/ItemOPActions';
import ItensRetornados from '@/components/producao/ItensRetornados';
import { updateOPStatus } from '@/components/producao/UpdateOPStatus';

export default function Acabamento() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('todos');
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
  const [filtroData, setFiltroData] = useState('');
  const [filtroAtrasados, setFiltroAtrasados] = useState(false);
  const [loadingItem, setLoadingItem] = useState(null);
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [retornarItem, setRetornarItem] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const [expandedOPs, setExpandedOPs] = useState({});
  const queryClient = useQueryClient();

  const toggleOP = (opId) => {
    setExpandedOPs(prev => ({ ...prev, [opId]: !prev[opId] }));
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-acabamento'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'acabamento' });
      return items.sort((a, b) => {
        if (!a.data_entrega) return 1;
        if (!b.data_entrega) return -1;
        return new Date(a.data_entrega) - new Date(b.data_entrega);
      });
    }
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-all'],
    queryFn: () => base44.entities.OrdemProducao.list('data_lancamento'),
  });

  const movimentarItem = async (item, novaEtapa, justif = '') => {
    setLoadingItem(item.id);
    try {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: novaEtapa,
        data_entrada_etapa: new Date().toISOString(),
        retornado: false,
        justificativa_retorno: ''
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'acabamento',
        setor_destino: novaEtapa,
        justificativa: justif,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.apelido || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(item.op_id);
      
      queryClient.invalidateQueries({ queryKey: ['itens-acabamento'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('Item movimentado com sucesso');
    } catch (error) {
      toast.error('Erro ao movimentar item');
    } finally {
      setLoadingItem(null);
      setRetornarDialogOpen(false);
      setJustificativa('');
    }
  };

  const handleRetornar = (item) => {
    setRetornarItem(item);
    setJustificativa('');
    setRetornarDialogOpen(true);
  };

  const confirmarRetorno = async () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória para retorno');
      return;
    }
    
    setLoadingItem(retornarItem.id);
    try {
      await base44.entities.ItemOP.update(retornarItem.id, {
        etapa_atual: 'fundicao',
        data_entrada_etapa: new Date().toISOString(),
        retornado: true,
        justificativa_retorno: justificativa
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: retornarItem.id,
        op_id: retornarItem.op_id,
        numero_op: retornarItem.numero_op,
        descricao_item: retornarItem.descricao,
        setor_origem: 'acabamento',
        setor_destino: 'fundicao',
        justificativa: justificativa,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.apelido || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(retornarItem.op_id);
      
      queryClient.invalidateQueries({ queryKey: ['itens-acabamento'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('Item retornado para Fundição');
      setRetornarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao retornar item');
    } finally {
      setLoadingItem(null);
      setJustificativa('');
    }
  };

  const gerarRelatorio = () => {
    const dados = itensFiltrados.map(item => ({
      'OP': item.numero_op,
      'O.C': getOP(item.op_id)?.ordem_compra || '-',
      'Equipamento': item.equipamento_principal || '-',
      'Descrição': item.descricao,
      'Observação': item.observacao || '-',
      'Código GA': item.codigo_ga || '-',
      'Peso (kg)': item.peso || '-',
      'Quantidade': item.quantidade,
      'Cliente': item.cliente,
      'Responsável': item.responsavel_op || '-',
      'Data Entrega': item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yyyy') : '-',
      'Entrada Etapa': item.data_entrada_etapa ? format(new Date(item.data_entrada_etapa), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'
    }));

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
    link.download = `relatorio_acabamento_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  const getOP = (opId) => ops.find(o => o.id === opId);

  const clientesUnicos = [...new Set(itens.map(i => i.cliente))].filter(Boolean).sort();
  const responsaveisUnicos = [...new Set(itens.map(i => i.responsavel_op))].filter(Boolean).sort();

  const itensFiltrados = itens.filter(item => {
    const matchSearch = !searchTerm || 
      item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo_ga?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCliente = filtroCliente === 'todos' || item.cliente === filtroCliente;
    const matchResponsavel = filtroResponsavel === 'todos' || item.responsavel_op === filtroResponsavel;
    const matchData = !filtroData || 
      (item.data_entrega && new Date(item.data_entrega).toISOString().split('T')[0] === filtroData);
    const matchAtrasado = !filtroAtrasados || 
      (item.data_entrega && new Date(item.data_entrega) < new Date());
    
    return matchSearch && matchCliente && matchResponsavel && matchData && matchAtrasado;
  });

  const opsComItens = ops.filter(op => {
    const itensOP = itensFiltrados.filter(i => i.op_id === op.id);
    return itensOP.length > 0;
  }).map(op => {
    const itensOP = itensFiltrados.filter(i => i.op_id === op.id);
    return { op, itens: itensOP };
  }).sort((a, b) => {
    const dataA = a.itens.length > 0 ? Math.min(...a.itens.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity)) : Infinity;
    const dataB = b.itens.length > 0 ? Math.min(...b.itens.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity)) : Infinity;
    return dataA - dataB;
  });

  const limparFiltros = () => {
    setSearchTerm('');
    setFiltroCliente('todos');
    setFiltroResponsavel('todos');
    setFiltroData('');
    setFiltroAtrasados(false);
  };

  const temFiltrosAtivos = searchTerm || filtroCliente !== 'todos' || filtroResponsavel !== 'todos' || filtroData || filtroAtrasados;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Acabamento</h1>
            <p className="text-slate-500">Itens em processo de acabamento</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium">
            {itens.length} itens • {opsComItens.length} OPs
          </div>
          {itensFiltrados.length > 0 && (
            <Button onClick={gerarRelatorio} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Relatório
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-700">Filtros</span>
          {temFiltrosAtivos && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="ml-auto">
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Label className="text-xs">Buscar</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="OP, descrição, código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clientesUnicos.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Responsável</Label>
            <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {responsaveisUnicos.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Data Entrega</Label>
            <Input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input
            type="checkbox"
            id="atrasados"
            checked={filtroAtrasados}
            onChange={(e) => setFiltroAtrasados(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="atrasados" className="text-sm text-slate-700 cursor-pointer flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Mostrar apenas atrasados
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : opsComItens.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhuma OP encontrada</h3>
          <p className="text-slate-500">Ajuste os filtros ou aguarde novos itens</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opsComItens.map(({ op, itens: itensOP }) => {
            const isExpanded = expandedOPs[op.id];
            const arquivos = op.arquivos || [];
            
            return (
              <div key={op.id} className="bg-white rounded-xl border-2 border-pink-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleOP(op.id)}
                  className="w-full bg-pink-50 border-b border-pink-200 p-4 hover:bg-pink-100 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">{op.numero_op}</h3>
                        {op.ordem_compra && (
                          <Badge variant="outline" className="text-blue-700 border-blue-300">
                            O.C: {op.ordem_compra}
                          </Badge>
                        )}
                        <Badge className="bg-red-600 text-white">
                          {itensOP.length} {itensOP.length === 1 ? 'item' : 'itens'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600">
                        <div><strong>Cliente:</strong> {op.cliente}</div>
                        <div><strong>Equipamento:</strong> {op.equipamento_principal}</div>
                        {op.responsavel && <div><strong>Responsável:</strong> {op.responsavel}</div>}
                        {op.data_lancamento && (
                          <div><strong>Lançamento:</strong> {format(new Date(op.data_lancamento), 'dd/MM/yyyy')}</div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4">
                    {arquivos.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-slate-200">
                        <p className="text-sm font-medium text-slate-700 mb-2">Arquivos da OP:</p>
                        <div className="flex flex-wrap gap-2">
                          {arquivos.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded text-sm text-blue-600 hover:bg-slate-200"
                            >
                              <FileText className="w-4 h-4" />
                              Arquivo {idx + 1}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {itensOP.map((item) => {
                        const isAtrasado = item.data_entrega && new Date(item.data_entrega) < new Date();
                        return (
                          <div key={item.id} className="bg-red-50 rounded-lg border-2 border-red-300 p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800 mb-1">{item.descricao}</p>
                                <p className="text-xs text-slate-500">Código GA: {item.codigo_ga || '-'}</p>
                              </div>
                            </div>

                            <ItemOPActions item={item} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['itens-acabamento'] })} />

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3 text-sm">
                              <div className="text-slate-600">
                                <span className="font-medium">Peso:</span> {item.peso ? `${item.peso} kg` : '-'}
                              </div>
                              <div className="text-slate-600">
                                <span className="font-medium">Qtd:</span> {item.quantidade}
                              </div>
                              <div className="text-slate-600">
                                <span className="font-medium">Entrega:</span>{' '}
                                {item.data_entrega ? (
                                  <span className={isAtrasado ? 'text-red-600 font-semibold' : ''}>
                                    {format(new Date(item.data_entrega), 'dd/MM/yy')}
                                    {isAtrasado && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                                  </span>
                                ) : '-'}
                              </div>
                              <div className="text-slate-600">
                                <span className="font-medium">Entrada:</span>{' '}
                                {item.data_entrada_etapa ? format(new Date(item.data_entrada_etapa), 'dd/MM HH:mm') : '-'}
                              </div>
                              <div className="text-slate-600">
                                <span className="font-medium">Responsável:</span> {item.responsavel_op || '-'}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => movimentarItem(item, 'usinagem')}
                                disabled={loadingItem === item.id}
                                className="bg-slate-800 hover:bg-slate-900"
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Enviar p/ Usinagem
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => movimentarItem(item, 'liberacao')}
                                disabled={loadingItem === item.id}
                                className="bg-slate-800 hover:bg-slate-900"
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Enviar p/ Liberação
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => movimentarItem(item, 'suporte_industrial')}
                                disabled={loadingItem === item.id}
                                className="bg-slate-800 hover:bg-slate-900"
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Enviar p/ Suporte Industrial
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRetornar(item)}
                                disabled={loadingItem === item.id}
                                className="text-amber-600 border-amber-300 hover:bg-amber-50"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Retornar p/ Fundição
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={retornarDialogOpen} onOpenChange={setRetornarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Item</DialogTitle>
            <DialogDescription>Informe a justificativa do retorno</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Justificativa *</Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo do retorno..."
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRetornarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarRetorno} className="bg-amber-600 hover:bg-amber-700">
                Confirmar Retorno
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}