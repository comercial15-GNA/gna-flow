import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter, FileDown, Package, ArrowUpDown, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { updateOPStatus } from '../components/producao/UpdateOPStatus';

export default function SuporteIndustrial() {
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroCliente, setFiltroCliente] = useState('todos');
  const [ordenacao, setOrdenacao] = useState({ campo: 'numero_op', ordem: 'asc' });
  const [dialogCategorizar, setDialogCategorizar] = useState({ aberto: false, item: null });
  const [dialogRetornar, setDialogRetornar] = useState({ aberto: false, item: null });
  const [categoria, setCategoria] = useState('');
  const [etapaDestino, setEtapaDestino] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-suporte'],
    queryFn: () => base44.entities.ItemOP.filter({ etapa_atual: 'suporte_industrial' })
  });

  const categorizarMutation = useMutation({
    mutationFn: async ({ item, categoria }) => {
      await base44.entities.ItemOP.update(item.id, {
        categoria_suporte: categoria
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens-suporte'] });
      toast.success('Item categorizado com sucesso');
      setDialogCategorizar({ aberto: false, item: null });
      setCategoria('');
    },
    onError: () => {
      toast.error('Erro ao categorizar item');
    }
  });

  const retornarMutation = useMutation({
    mutationFn: async ({ item, etapa, justificativa }) => {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: etapa,
        data_entrada_etapa: new Date().toISOString(),
        retornado: true,
        justificativa_retorno: justificativa
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'suporte_industrial',
        setor_destino: etapa,
        justificativa: justificativa,
        usuario_email: user?.email,
        usuario_nome: user?.full_name || user?.apelido,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(item.op_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens-suporte'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('Item retornado com sucesso');
      setDialogRetornar({ aberto: false, item: null });
      setJustificativa('');
      setEtapaDestino('');
      setLoadingItem(null);
    },
    onError: () => {
      toast.error('Erro ao retornar item');
      setLoadingItem(null);
    }
  });

  const handleCategorizar = (item) => {
    setDialogCategorizar({ aberto: true, item });
    setCategoria(item.categoria_suporte || '');
  };

  const confirmarCategorizacao = async () => {
    if (!categoria) {
      toast.error('Selecione uma categoria');
      return;
    }
    await categorizarMutation.mutateAsync({ item: dialogCategorizar.item, categoria });
  };

  const handleRetornar = (item) => {
    setDialogRetornar({ aberto: true, item });
    setEtapaDestino('');
    setJustificativa('');
  };

  const confirmarRetorno = async () => {
    if (!etapaDestino) {
      toast.error('Selecione a etapa de destino');
      return;
    }
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória');
      return;
    }
    setLoadingItem(dialogRetornar.item.id);
    await retornarMutation.mutateAsync({
      item: dialogRetornar.item,
      etapa: etapaDestino,
      justificativa
    });
  };

  const toggleOrdenacao = (campo) => {
    if (ordenacao.campo === campo) {
      setOrdenacao({ campo, ordem: ordenacao.ordem === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenacao({ campo, ordem: 'asc' });
    }
  };

  const itensFiltrados = itens.filter(item => {
    const matchSearch = search === '' || 
      item.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      item.numero_op?.toLowerCase().includes(search.toLowerCase()) ||
      item.cliente?.toLowerCase().includes(search.toLowerCase());
    
    const matchCategoria = filtroCategoria === 'todos' || item.categoria_suporte === filtroCategoria;
    const matchCliente = filtroCliente === 'todos' || item.cliente === filtroCliente;
    
    return matchSearch && matchCategoria && matchCliente;
  });

  const itensOrdenados = [...itensFiltrados].sort((a, b) => {
    const valorA = a[ordenacao.campo] || '';
    const valorB = b[ordenacao.campo] || '';
    
    if (ordenacao.ordem === 'asc') {
      return valorA > valorB ? 1 : -1;
    } else {
      return valorA < valorB ? 1 : -1;
    }
  });

  const clientes = [...new Set(itens.map(i => i.cliente).filter(Boolean))];

  const gerarRelatorio = () => {
    const headers = ['OP', 'Cliente', 'Item', 'Categoria', 'Qtd', 'Peso', 'Data Entrada'];
    const linhas = itensOrdenados.map(item => [
      item.numero_op,
      item.cliente,
      item.descricao,
      item.categoria_suporte || 'Não categorizado',
      item.quantidade,
      item.peso || '',
      format(new Date(item.data_entrada_etapa), 'dd/MM/yyyy HH:mm')
    ]);

    const csv = [headers, ...linhas].map(linha => linha.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_suporte_industrial_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
  };

  const getCategoriaColor = (cat) => {
    const cores = {
      bronze: 'bg-amber-500',
      caldeiraria: 'bg-orange-500',
      montagem: 'bg-blue-500',
      materia_prima: 'bg-green-500',
      reforma: 'bg-purple-500'
    };
    return cores[cat] || 'bg-slate-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Suporte Industrial</h1>
            <p className="text-slate-600">Categorização e gestão de itens em suporte</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Package className="w-4 h-4 mr-2" />
              {itensFiltrados.length} itens
            </Badge>
            <Button onClick={gerarRelatorio} variant="outline">
              <FileDown className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar por OP, item ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as categorias</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="caldeiraria">Caldeiraria</SelectItem>
                <SelectItem value="montagem">Montagem</SelectItem>
                <SelectItem value="materia_prima">Matéria Prima</SelectItem>
                <SelectItem value="reforma">Reforma</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {clientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('numero_op')}>
                  <div className="flex items-center gap-2">
                    OP <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('cliente')}>
                  <div className="flex items-center gap-2">
                    Cliente <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('descricao')}>
                  <div className="flex items-center gap-2">
                    Descrição <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('categoria_suporte')}>
                  <div className="flex items-center gap-2">
                    Categoria <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('data_entrada_etapa')}>
                  <div className="flex items-center gap-2">
                    Entrada <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensOrdenados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-600">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              ) : (
                itensOrdenados.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-semibold">{item.numero_op}</TableCell>
                    <TableCell>{item.cliente}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.descricao}</p>
                        {item.codigo_ga && <p className="text-sm text-slate-600">Cód: {item.codigo_ga}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.categoria_suporte ? (
                        <Badge className={getCategoriaColor(item.categoria_suporte)}>
                          {item.categoria_suporte.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Não categorizado</Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.quantidade}</TableCell>
                    <TableCell>
                      {format(new Date(item.data_entrada_etapa), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCategorizar(item)}
                        >
                          <Tag className="w-4 h-4 mr-1" />
                          Categorizar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRetornar(item)}
                          disabled={loadingItem === item.id}
                        >
                          Retornar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={dialogCategorizar.aberto} onOpenChange={(open) => setDialogCategorizar({ aberto: open, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorizar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded">
              <p className="font-semibold">{dialogCategorizar.item?.descricao}</p>
              <p className="text-sm text-slate-600">OP: {dialogCategorizar.item?.numero_op}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Categoria *</label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCategorizar({ aberto: false, item: null })}>
              Cancelar
            </Button>
            <Button onClick={confirmarCategorizacao} disabled={categorizarMutation.isPending}>
              {categorizarMutation.isPending ? 'Salvando...' : 'Salvar Categoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogRetornar.aberto} onOpenChange={(open) => setDialogRetornar({ aberto: open, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded">
              <p className="font-semibold">{dialogRetornar.item?.descricao}</p>
              <p className="text-sm text-slate-600">OP: {dialogRetornar.item?.numero_op}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Retornar para *</label>
              <Select value={etapaDestino} onValueChange={setEtapaDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engenharia">Engenharia</SelectItem>
                  <SelectItem value="modelagem">Modelagem</SelectItem>
                  <SelectItem value="suprimentos">Suprimentos</SelectItem>
                  <SelectItem value="fundicao">Fundição</SelectItem>
                  <SelectItem value="acabamento">Acabamento</SelectItem>
                  <SelectItem value="usinagem">Usinagem</SelectItem>
                  <SelectItem value="liberacao">Liberação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Justificativa (obrigatória) *</label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo do retorno..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRetornar({ aberto: false, item: null })}>
              Cancelar
            </Button>
            <Button onClick={confirmarRetorno} disabled={retornarMutation.isPending}>
              {retornarMutation.isPending ? 'Retornando...' : 'Confirmar Retorno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}