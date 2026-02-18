import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Truck, 
  Search,
  Package,
  FileSpreadsheet,
  Filter,
  X,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ItemOPActions from '@/components/producao/ItemOPActions';
import ItensRetornados from '@/components/producao/ItensRetornados';
import { updateOPStatus } from '@/components/producao/UpdateOPStatus';

export default function Suprimentos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [retornarItem, setRetornarItem] = useState(null);
  const [retornarDestino, setRetornarDestino] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [clienteFilter, setClienteFilter] = useState('todos');
  const [responsavelFilter, setResponsavelFilter] = useState('todos');
  const [dataFilter, setDataFilter] = useState('');
  const [showAtrasados, setShowAtrasados] = useState(false);
  const [expandedOPs, setExpandedOPs] = useState({});
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-suprimentos'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'suprimentos' });
      // Ordenar por data de entrega (mais próxima primeiro)
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

  const toggleOP = (opId) => {
    setExpandedOPs(prev => ({ ...prev, [opId]: !prev[opId] }));
  };

  const movimentarItem = async (item, novaEtapa, justif = '') => {
    setLoadingItem(item.id);
    try {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: novaEtapa,
        data_entrada_etapa: new Date().toISOString(),
        alerta_retorno: false,
        justificativa_retorno: '',
        iniciado: false
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'suprimentos',
        setor_destino: novaEtapa,
        justificativa: justif,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(item.op_id);
      
      queryClient.invalidateQueries({ queryKey: ['itens-suprimentos'] });
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

  const handleRetornar = (item, destino) => {
    setRetornarItem(item);
    setRetornarDestino(destino);
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
        etapa_atual: retornarDestino,
        data_entrada_etapa: new Date().toISOString(),
        alerta_retorno: true,
        justificativa_retorno: justificativa,
        iniciado: false
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: retornarItem.id,
        op_id: retornarItem.op_id,
        numero_op: retornarItem.numero_op,
        descricao_item: retornarItem.descricao,
        setor_origem: 'suprimentos',
        setor_destino: retornarDestino,
        justificativa,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(retornarItem.op_id);
      
      queryClient.invalidateQueries({ queryKey: ['itens-suprimentos'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('Item retornado com sucesso');
      setRetornarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao retornar item');
    } finally {
      setLoadingItem(null);
      setJustificativa('');
    }
  };

  const handleEnviar = async (item, destino) => {
    await movimentarItem(item, destino, '');
  };

  const gerarRelatorio = () => {
    const dados = itensFiltrados.map(item => ({
      'OP': item.numero_op,
      'Descrição': item.descricao,
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
    const csv = `\uFEFF${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_suprimentos_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  const isAtrasado = (dataEntrega) => {
    if (!dataEntrega) return false;
    return isBefore(startOfDay(new Date(dataEntrega)), startOfDay(new Date()));
  };

  const itensFiltrados = itens.filter(item => {
    const matchSearch = !searchTerm || 
      item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCliente = clienteFilter === 'todos' || item.cliente === clienteFilter;
    const matchResponsavel = responsavelFilter === 'todos' || item.responsavel_op === responsavelFilter;
    
    const matchData = !dataFilter || 
      (item.data_entrega && format(new Date(item.data_entrega), 'yyyy-MM-dd') === dataFilter);

    const matchAtrasado = !showAtrasados || isAtrasado(item.data_entrega);

    return matchSearch && matchCliente && matchResponsavel && matchData && matchAtrasado;
  });

  const opsComItens = ops
    .map(op => ({
      ...op,
      itens: itensFiltrados.filter(item => item.op_id === op.id)
    }))
    .filter(op => op.itens.length > 0)
    .sort((a, b) => {
      // Ordenar por data de entrega mais próxima
      const dataA = a.itens.length > 0 ? Math.min(...a.itens.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity)) : Infinity;
      const dataB = b.itens.length > 0 ? Math.min(...b.itens.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity)) : Infinity;
      return dataA - dataB;
    });

  const clientes = ['todos', ...new Set(itens.map(i => i.cliente).filter(Boolean))];
  const responsaveis = ['todos', ...new Set(itens.map(i => i.responsavel_op).filter(Boolean))];

  const activeFilters = [
    clienteFilter !== 'todos' && 'Cliente',
    responsavelFilter !== 'todos' && 'Responsável',
    dataFilter && 'Data',
    showAtrasados && 'Atrasados'
  ].filter(Boolean);

  const limparFiltros = () => {
    setClienteFilter('todos');
    setResponsavelFilter('todos');
    setDataFilter('');
    setShowAtrasados(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Suprimentos</h1>
            <p className="text-slate-500">{itens.length} itens • {opsComItens.length} OPs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {itensFiltrados.length > 0 && (
            <Button onClick={gerarRelatorio} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>
          )}
        </div>
      </div>

      <ItensRetornados
        itens={itensFiltrados}
        onReenviar={async (item, justif) => {
          setLoadingItem(item.id);
          await movimentarItem(item, item.etapa_atual, justif, false);
        }}
        loadingItem={loadingItem}
        etapaAtual="suprimentos"
      />

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-700">Filtros</span>
          {activeFilters.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {activeFilters.length} ativo{activeFilters.length > 1 ? 's' : ''}
            </Badge>
          )}
          {activeFilters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="ml-auto h-7 text-xs">
              <X className="w-3 h-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar OP, item, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={clienteFilter} onValueChange={setClienteFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map(c => (
                <SelectItem key={c} value={c}>
                  {c === 'todos' ? 'Todos os Clientes' : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              {responsaveis.map(r => (
                <SelectItem key={r} value={r}>
                  {r === 'todos' ? 'Todos os Responsáveis' : r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dataFilter}
            onChange={(e) => setDataFilter(e.target.value)}
            placeholder="Data de Entrega"
          />
          <div className="flex items-center space-x-2 border rounded-lg px-3 py-2 bg-white">
            <Checkbox 
              id="atrasados" 
              checked={showAtrasados}
              onCheckedChange={setShowAtrasados}
            />
            <label htmlFor="atrasados" className="text-sm cursor-pointer flex-1">
              Apenas atrasados
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : opsComItens.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum item encontrado</h3>
          <p className="text-slate-500">
            {activeFilters.length > 0 ? 'Tente ajustar os filtros' : 'Todos os itens foram processados'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {opsComItens.map((op) => (
            <div key={op.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Header da OP */}
              <div 
                className="bg-slate-50 p-4 cursor-pointer hover:bg-slate-100 transition-all border-b border-slate-200"
                onClick={() => toggleOP(op.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-baseline gap-2">
                          <h3 className="font-bold text-lg text-slate-800">{op.numero_op}</h3>
                          <span className="text-sm text-slate-600">{op.equipamento_principal}</span>
                        </div>
                        {op.ordem_compra && (
                          <Badge variant="outline" className="text-blue-700 border-blue-300">
                            O.C: {op.ordem_compra}
                          </Badge>
                        )}
                        <Badge className="bg-orange-100 text-orange-800">
                          {op.itens.length} {op.itens.length === 1 ? 'item' : 'itens'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap mt-1">
                        <span>{op.cliente}</span>
                        {op.responsavel && (
                          <>
                            <span>•</span>
                            <span>{op.responsavel}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {expandedOPs[op.id] ? 
                    <ChevronUp className="w-5 h-5 text-slate-400" /> : 
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  }
                </div>
              </div>

              {/* Lista de Itens */}
              {expandedOPs[op.id] && (
                <div className="p-4 space-y-4">
                  {/* Arquivos da OP */}
                  {op.arquivos && op.arquivos.length > 0 && (
                    <div className="pb-4 border-b border-slate-100">
                      <p className="text-xs text-slate-500 mb-2">Arquivos da OP:</p>
                      <div className="flex flex-wrap gap-2">
                        {op.arquivos.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs text-blue-600 hover:bg-slate-200"
                          >
                            <FileText className="w-3 h-3" />
                            Arquivo {idx + 1}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Itens */}
                  {op.itens.map((item) => {
                    const atrasado = isAtrasado(item.data_entrega);
                    const toggleIniciado = async () => {
                      try {
                        await base44.entities.ItemOP.update(item.id, {
                          iniciado: !item.iniciado
                        });
                        queryClient.invalidateQueries({ queryKey: ['itens-suprimentos'] });
                        toast.success(item.iniciado ? 'Item desmarcado' : 'Item marcado como iniciado');
                      } catch (error) {
                        toast.error('Erro ao atualizar status');
                      }
                    };
                    return (
                      <div key={item.id} className={`rounded-lg border p-4 ${item.alerta_retorno ? 'bg-red-50 border-red-500' : atrasado ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'} ${item.iniciado ? 'ring-2 ring-blue-500' : ''}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <Package className="w-4 h-4 text-slate-400" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className={`text-slate-800 ${item.iniciado ? 'font-bold' : 'font-semibold'}`}>{item.descricao}</p>
                                {item.alerta_retorno && (
                                   <Badge className="bg-red-600 text-white animate-pulse">
                                     <AlertTriangle className="w-3 h-3 mr-1" />
                                     ALERTA - Retornado
                                   </Badge>
                                 )}
                                {item.iniciado && <Badge className="bg-blue-600 text-white">Iniciado</Badge>}
                              </div>
                              {atrasado && (
                                <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Atrasado</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={item.iniciado ? "default" : "outline"}
                            onClick={toggleIniciado}
                            className={item.iniciado ? "bg-blue-600 hover:bg-blue-700" : ""}
                          >
                            {item.iniciado ? '✓ Iniciado' : 'Iniciar'}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 text-sm">
                          <div>
                            <span className="text-slate-400">Código GA:</span>
                            <p className="font-medium">{item.codigo_ga || '-'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Peso:</span>
                            <p className="font-medium">{item.peso ? `${item.peso} kg` : '-'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Quantidade:</span>
                            <p className="font-medium">{item.quantidade}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Entrega:</span>
                            <p className={`font-medium ${atrasado ? 'text-red-600' : ''}`}>
                              {item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yyyy') : '-'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Responsável:</span>
                            <p className="font-medium">{item.responsavel_op || '-'}</p>
                          </div>
                        </div>

                        {item.data_entrada_etapa && (
                          <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Entrada: {format(new Date(item.data_entrada_etapa), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        )}

                        <ItemOPActions 
                          item={item} 
                          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['itens-suprimentos'] })} 
                        />

                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleEnviar(item, 'liberacao')}
                            disabled={loadingItem === item.id}
                            className="bg-slate-800 hover:bg-slate-900"
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            Enviar p/ Liberação
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetornar(item, 'engenharia')}
                            disabled={loadingItem === item.id}
                            className="text-amber-600 border-amber-300 hover:bg-amber-50"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Retornar p/ Engenharia
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
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