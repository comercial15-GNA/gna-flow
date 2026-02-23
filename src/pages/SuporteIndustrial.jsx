import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Hammer, 
  Search,
  Package,
  RotateCcw,
  FileSpreadsheet,
  Filter,
  X,
  AlertTriangle,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SuporteIndustrial() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroCliente, setFiltroCliente] = useState('todos');
  const [loadingItem, setLoadingItem] = useState(null);
  const [enviarDialogOpen, setEnviarDialogOpen] = useState(false);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const [etapaDestino, setEtapaDestino] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
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

  const abrirDialogEnviar = (item) => {
    setSelectedItem(item);
    setJustificativa('');
    setEtapaDestino('');
    setEnviarDialogOpen(true);
  };

  const confirmarEnvio = async () => {
    if (!etapaDestino) {
      toast.error('Selecione a etapa de destino');
      return;
    }

    setLoadingItem(selectedItem.id);
    try {
      await base44.entities.ItemOP.update(selectedItem.id, {
        etapa_atual: etapaDestino,
        data_entrada_etapa: new Date().toISOString(),
        retornado: false,
        justificativa_retorno: ''
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: selectedItem.id,
        op_id: selectedItem.op_id,
        numero_op: selectedItem.numero_op,
        descricao_item: selectedItem.descricao,
        setor_origem: 'suporte_industrial',
        setor_destino: etapaDestino,
        justificativa: justificativa || 'Enviado do suporte industrial',
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['itens-suporte-industrial'] });
      toast.success('Item enviado com sucesso');
      setEnviarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao enviar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const confirmarRetorno = async () => {
    if (!etapaDestino) {
      toast.error('Selecione a etapa de destino');
      return;
    }

    setLoadingItem(selectedItem.id);
    try {
      await base44.entities.ItemOP.update(selectedItem.id, {
        etapa_atual: etapaDestino,
        data_entrada_etapa: new Date().toISOString(),
        retornado: true,
        justificativa_retorno: justificativa || 'Retornado do suporte industrial'
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: selectedItem.id,
        op_id: selectedItem.op_id,
        numero_op: selectedItem.numero_op,
        descricao_item: selectedItem.descricao,
        setor_origem: 'suporte_industrial',
        setor_destino: etapaDestino,
        justificativa: justificativa || 'Retornado do suporte industrial',
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['itens-suporte-industrial'] });
      toast.success('Item retornado com sucesso');
      setEnviarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao retornar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const gerarRelatorio = () => {
    const dados = itensFiltrados.map(item => ({
      'OP': item.numero_op,
      'Equipamento OP': item.equipamento_principal || '-',
      'Descrição': item.descricao,
      'Código GA': item.codigo_ga || '-',
      'Categoria': item.categoria_suporte ? getCategoriaLabel(item.categoria_suporte) : 'Não categorizado',
      'Peso (kg)': item.peso || '-',
      'Quantidade': item.quantidade,
      'Cliente': item.cliente,
      'Responsável': item.responsavel_op || '-',
      'Data Entrega': item.data_entrega ? format(parseISO(item.data_entrega), 'dd/MM/yyyy') : '-',
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
      reforma: 'Reforma',
      equipamento: 'Equipamento'
    };
    return labels[categoria] || categoria;
  };

  const getCategoriaColor = (categoria) => {
    const colors = {
      bronze: 'bg-amber-100 text-amber-800',
      caldeiraria: 'bg-orange-100 text-orange-800',
      montagem: 'bg-blue-100 text-blue-800',
      materia_prima: 'bg-green-100 text-green-800',
      reforma: 'bg-purple-100 text-purple-800',
      equipamento: 'bg-indigo-100 text-indigo-800'
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
                <SelectItem value="equipamento">Equipamento</SelectItem>
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
      ) : itensFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum item encontrado</h3>
          <p className="text-slate-500">Ajuste os filtros ou aguarde novos itens</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">OP</TableHead>
                <TableHead className="font-semibold">Equipamento</TableHead>
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold">Código GA</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="font-semibold text-center">Qtd</TableHead>
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Entrega</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensFiltrados.map((item) => {
                const isAtrasado = item.data_entrega && new Date(item.data_entrega) < new Date();
                
                return (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-sm">{item.numero_op}</TableCell>
                    <TableCell className="text-sm">{item.equipamento_principal || '-'}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium text-slate-800">{item.descricao}</div>
                      {item.observacao && (
                        <div className="text-xs text-slate-500 mt-1 truncate">{item.observacao}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{item.codigo_ga || '-'}</TableCell>
                    <TableCell>
                      {item.categoria_suporte ? (
                        <Badge className={getCategoriaColor(item.categoria_suporte)}>
                          {getCategoriaLabel(item.categoria_suporte)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400">
                          Sem categoria
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">{item.quantidade}</TableCell>
                    <TableCell className="text-sm">{item.cliente}</TableCell>
                    <TableCell>
                      {item.data_entrega ? (
                        <div className={`text-sm ${isAtrasado ? 'text-red-600 font-semibold' : ''}`}>
                          {format(parseISO(item.data_entrega), 'dd/MM/yyyy')}
                          {isAtrasado && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="text-xs">Atrasado</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirDialogCategoria(item)}
                          className="text-xs h-7"
                        >
                          {item.categoria_suporte ? 'Editar' : 'Categorizar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirDialogEnviar(item)}
                          disabled={loadingItem === item.id}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs h-7"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Enviar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
                  <SelectItem value="equipamento">Equipamento</SelectItem>
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

      <Dialog open={enviarDialogOpen} onOpenChange={setEnviarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Item</DialogTitle>
            <DialogDescription>Selecione a etapa de destino e informe a justificativa (opcional)</DialogDescription>
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
                  <SelectItem value="caldeiraria">Caldeiraria</SelectItem>
                  <SelectItem value="liberacao">Liberação</SelectItem>
                  <SelectItem value="expedicao">Expedição</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Justificativa (opcional)</Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva informações adicionais sobre o envio..."
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEnviarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarEnvio} disabled={loadingItem} className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
              <Button onClick={confirmarRetorno} disabled={loadingItem} className="bg-amber-600 hover:bg-amber-700">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retornar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}