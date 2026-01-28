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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Hammer, 
  Search,
  Package,
  RotateCcw,
  FileSpreadsheet,
  Filter,
  X,
  ArrowUpDown,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ItemOPActions from '@/components/producao/ItemOPActions';

export default function SuporteIndustrial() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroCliente, setFiltroCliente] = useState('todos');
  const [loadingItem, setLoadingItem] = useState(null);
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const [etapaDestino, setEtapaDestino] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [ordenacao, setOrdenacao] = useState({ campo: 'data_entrega', direcao: 'asc' });
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-suporte-industrial'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'suporte_industrial' });
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

  const abrirDialogCategoria = (item) => {
    setSelectedItem(item);
    setNovaCategoria(item.categoria_suporte || '');
    setCategoriaDialogOpen(true);
  };

  const salvarCategoria = async () => {
    if (!novaCategoria) {
      toast.error('Selecione uma categoria');
      return;
    }

    setLoadingItem(selectedItem.id);
    try {
      await base44.entities.ItemOP.update(selectedItem.id, {
        categoria_suporte: novaCategoria
      });

      queryClient.invalidateQueries({ queryKey: ['itens-suporte-industrial'] });
      toast.success('Categoria atualizada');
      setCategoriaDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao atualizar categoria');
    } finally {
      setLoadingItem(null);
    }
  };

  const abrirDialogRetorno = (item) => {
    setSelectedItem(item);
    setJustificativa('');
    setEtapaDestino('');
    setRetornarDialogOpen(true);
  };

  const confirmarRetorno = async () => {
    if (!etapaDestino) {
      toast.error('Selecione a etapa de destino');
      return;
    }
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória para retorno');
      return;
    }

    setLoadingItem(selectedItem.id);
    try {
      await base44.entities.ItemOP.update(selectedItem.id, {
        etapa_atual: etapaDestino,
        data_entrada_etapa: new Date().toISOString(),
        retornado: true,
        justificativa_retorno: justificativa
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: selectedItem.id,
        op_id: selectedItem.op_id,
        numero_op: selectedItem.numero_op,
        descricao_item: selectedItem.descricao,
        setor_origem: 'suporte_industrial',
        setor_destino: etapaDestino,
        justificativa: justificativa,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.apelido || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['itens-suporte-industrial'] });
      toast.success('Item retornado com sucesso');
      setRetornarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao retornar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const gerarRelatorio = () => {
    const dados = itensFiltrados.map(item => ({
      'OP': item.numero_op,
      'Equipamento': item.equipamento_principal || '-',
      'Descrição': item.descricao,
      'Código GA': item.codigo_ga || '-',
      'Categoria': item.categoria_suporte ? getCategoriaLabel(item.categoria_suporte) : 'Não categorizado',
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
    link.download = `relatorio_suporte_industrial_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  const getCategoriaLabel = (categoria) => {
    const labels = {
      bronze: 'Bronze',
      caldeiraria: 'Caldeiraria',
      montagem: 'Montagem',
      materia_prima: 'Matéria Prima',
      reforma: 'Reforma'
    };
    return labels[categoria] || categoria;
  };

  const getCategoriaColor = (categoria) => {
    const colors = {
      bronze: 'bg-amber-100 text-amber-800',
      caldeiraria: 'bg-orange-100 text-orange-800',
      montagem: 'bg-blue-100 text-blue-800',
      materia_prima: 'bg-green-100 text-green-800',
      reforma: 'bg-purple-100 text-purple-800'
    };
    return colors[categoria] || 'bg-slate-100 text-slate-800';
  };

  const clientesUnicos = [...new Set(itens.map(i => i.cliente))].filter(Boolean).sort();

  const itensFiltrados = itens.filter(item => {
    const matchSearch = !searchTerm || 
      item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo_ga?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCategoria = filtroCategoria === 'todos' || item.categoria_suporte === filtroCategoria;
    const matchCliente = filtroCliente === 'todos' || item.cliente === filtroCliente;
    
    return matchSearch && matchCategoria && matchCliente;
  });

  const itensOrdenados = [...itensFiltrados].sort((a, b) => {
    const { campo, direcao } = ordenacao;
    let valorA = a[campo];
    let valorB = b[campo];

    if (campo === 'data_entrega') {
      valorA = valorA ? new Date(valorA).getTime() : Infinity;
      valorB = valorB ? new Date(valorB).getTime() : Infinity;
    }

    if (valorA === null || valorA === undefined) return 1;
    if (valorB === null || valorB === undefined) return -1;

    if (valorA < valorB) return direcao === 'asc' ? -1 : 1;
    if (valorA > valorB) return direcao === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleOrdenacao = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  };

  const limparFiltros = () => {
    setSearchTerm('');
    setFiltroCategoria('todos');
    setFiltroCliente('todos');
  };

  const temFiltrosAtivos = searchTerm || filtroCategoria !== 'todos' || filtroCliente !== 'todos';

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <Hammer className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Suporte Industrial</h1>
            <p className="text-slate-500">Gerenciar itens em suporte industrial</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 text-slate-800 px-4 py-2 rounded-full text-sm font-medium">
            {itens.length} itens
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
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
            <Label className="text-xs">Categoria</Label>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="caldeiraria">Caldeiraria</SelectItem>
                <SelectItem value="montagem">Montagem</SelectItem>
                <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                <SelectItem value="reforma">Reforma</SelectItem>
              </SelectContent>
            </Select>
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
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : itensOrdenados.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum item encontrado</h3>
          <p className="text-slate-500">Ajuste os filtros ou aguarde novos itens</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('numero_op')}>
                    <div className="flex items-center gap-1">
                      OP <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('cliente')}>
                    <div className="flex items-center gap-1">
                      Cliente <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Código GA</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('categoria_suporte')}>
                    <div className="flex items-center gap-1">
                      Categoria <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('data_entrega')}>
                    <div className="flex items-center gap-1">
                      Entrega <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensOrdenados.map((item) => {
                  const isAtrasado = item.data_entrega && new Date(item.data_entrega) < new Date();
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.numero_op}</TableCell>
                      <TableCell>{item.cliente}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{item.descricao}</p>
                          {item.observacao && (
                            <p className="text-xs text-slate-500">{item.observacao}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.codigo_ga || '-'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={item.categoria_suporte ? "ghost" : "outline"}
                          onClick={() => abrirDialogCategoria(item)}
                          className="text-xs"
                        >
                          {item.categoria_suporte ? (
                            <Badge className={getCategoriaColor(item.categoria_suporte)}>
                              {getCategoriaLabel(item.categoria_suporte)}
                            </Badge>
                          ) : (
                            'Categorizar'
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">{item.quantidade}</TableCell>
                      <TableCell>
                        {item.data_entrega ? (
                          <span className={isAtrasado ? 'text-red-600 font-semibold flex items-center gap-1' : ''}>
                            {format(new Date(item.data_entrega), 'dd/MM/yy')}
                            {isAtrasado && <AlertTriangle className="w-3 h-3" />}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{item.responsavel_op || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirDialogRetorno(item)}
                          disabled={loadingItem === item.id}
                          className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Retornar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={categoriaDialogOpen} onOpenChange={setCategoriaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorizar Item</DialogTitle>
            <DialogDescription>Selecione a categoria do item</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Categoria *</Label>
              <Select value={novaCategoria} onValueChange={setNovaCategoria}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="caldeiraria">Caldeiraria</SelectItem>
                  <SelectItem value="montagem">Montagem</SelectItem>
                  <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                  <SelectItem value="reforma">Reforma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCategoriaDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarCategoria} disabled={loadingItem}>
                Salvar Categoria
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={retornarDialogOpen} onOpenChange={setRetornarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Item</DialogTitle>
            <DialogDescription>Selecione a etapa e informe a justificativa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Etapa de Destino *</Label>
              <Select value={etapaDestino} onValueChange={setEtapaDestino}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a etapa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="engenharia">Engenharia</SelectItem>
                  <SelectItem value="modelagem">Modelagem</SelectItem>
                  <SelectItem value="suprimentos">Suprimentos</SelectItem>
                  <SelectItem value="fundicao">Fundição</SelectItem>
                  <SelectItem value="acabamento">Acabamento</SelectItem>
                  <SelectItem value="usinagem">Usinagem</SelectItem>
                  <SelectItem value="liberacao">Liberação</SelectItem>
                  <SelectItem value="expedicao">Expedição</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <Button onClick={confirmarRetorno} disabled={loadingItem} className="bg-amber-600 hover:bg-amber-700">
                Confirmar Retorno
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}