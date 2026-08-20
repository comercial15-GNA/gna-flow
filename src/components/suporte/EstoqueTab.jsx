import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCategoriasSuporte } from '@/hooks/useCategoriasSuporte';
import EditarEstoqueItemDialog from '@/components/suporte/EditarEstoqueItemDialog';
import BaixarQuantidadeDialog from '@/components/suporte/BaixarQuantidadeDialog';
import {
  PackageSearch,
  Search,
  Package,
  FileSpreadsheet,
  Filter,
  X,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EstoqueTab() {
  const queryClient = useQueryClient();
  const { categorias, getLabel: getCategoriaLabel, getColor: getCategoriaColor } = useCategoriasSuporte();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [editarOpen, setEditarOpen] = useState(false);
  const [baixarOpen, setBaixarOpen] = useState(false);
  const [excluirOpen, setExcluirOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [baixaItem, setBaixaItem] = useState(null);
  const [excluirItem, setExcluirItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-estoque'],
    queryFn: () => base44.entities.EstoqueItem.list('-created_date', 500),
  });

  const itensFiltrados = itens.filter(item => {
    const matchSearch = !searchTerm ||
      item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo_ga?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = filtroCategoria === 'todos' || item.categoria_suporte === filtroCategoria;
    return matchSearch && matchCategoria;
  });

  const temFiltrosAtivos = searchTerm || filtroCategoria !== 'todos';

  const limparFiltros = () => {
    setSearchTerm('');
    setFiltroCategoria('todos');
  };

  const handleAdicionar = () => {
    setEditingItem(null);
    setEditarOpen(true);
  };

  const handleEditar = (item) => {
    setEditingItem(item);
    setEditarOpen(true);
  };

  const handleBaixar = (item) => {
    setBaixaItem(item);
    setBaixarOpen(true);
  };

  const handleExcluir = (item) => {
    setExcluirItem(item);
    setExcluirOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!excluirItem) return;
    setSaving(true);
    try {
      await base44.entities.EstoqueItem.delete(excluirItem.id);
      queryClient.invalidateQueries({ queryKey: ['itens-estoque'] });
      toast.success('Item excluído');
      setExcluirOpen(false);
      setExcluirItem(null);
    } catch (error) {
      toast.error('Erro ao excluir item');
    } finally {
      setSaving(false);
    }
  };

  const gerarRelatorio = () => {
    if (itensFiltrados.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const dados = itensFiltrados.map(item => ({
      'Descrição': item.descricao,
      'Equipamento': item.equipamento || '-',
      'Código GA': item.codigo_ga || '-',
      'Categoria': item.categoria_suporte ? getCategoriaLabel(item.categoria_suporte) : 'Não categorizado',
      'Peso (kg)': item.peso || '-',
      'Quantidade': item.quantidade,
      'Observação': item.observacao || '-',
      'Criado em': item.created_date ? format(new Date(item.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-',
    }));

    const headers = Object.keys(dados[0]).join(';');
    const rows = dados.map(row => Object.values(row).join(';')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_estoque_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['itens-estoque'] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <PackageSearch className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Estoque</h2>
            <p className="text-sm text-slate-500">{itens.length} {itens.length === 1 ? 'item' : 'itens'} cadastrados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {itensFiltrados.length > 0 && (
            <Button onClick={gerarRelatorio} variant="outline" size="sm">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Relatório
            </Button>
          )}
          <Button onClick={handleAdicionar} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Buscar</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Descrição, equipamento, código GA..."
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
                {categorias.map(cat => (
                  <SelectItem key={cat.id} value={cat.valor}>{cat.nome}</SelectItem>
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
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            {temFiltrosAtivos ? 'Nenhum item encontrado' : 'Nenhum item em estoque'}
          </h3>
          <p className="text-slate-500">
            {temFiltrosAtivos ? 'Ajuste os filtros' : 'Clique em "Adicionar Item" para começar'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Descrição</TableHead>
                <TableHead className="font-semibold">Equipamento</TableHead>
                <TableHead className="font-semibold">Código GA</TableHead>
                <TableHead className="font-semibold">Categoria</TableHead>
                <TableHead className="font-semibold text-center">Peso</TableHead>
                <TableHead className="font-semibold text-center">Qtd</TableHead>
                <TableHead className="font-semibold">Observação</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensFiltrados.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium text-slate-800">{item.descricao}</TableCell>
                  <TableCell className="text-sm">{item.equipamento || '-'}</TableCell>
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
                  <TableCell className="text-center text-sm">{item.peso ? `${item.peso} kg` : '-'}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${item.quantidade <= 5 ? 'text-red-600' : 'text-slate-800'}`}>
                      {item.quantidade}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-xs text-slate-500 truncate">{item.observacao || '-'}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleBaixar(item)}
                        className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                        title="Baixar / Repor"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditar(item)}
                        className="h-8 w-8"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleExcluir(item)}
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EditarEstoqueItemDialog
        open={editarOpen}
        onOpenChange={setEditarOpen}
        item={editingItem}
        onSaved={invalidate}
      />

      <BaixarQuantidadeDialog
        open={baixarOpen}
        onOpenChange={setBaixarOpen}
        item={baixaItem}
        onSaved={invalidate}
      />

      <Dialog open={excluirOpen} onOpenChange={setExcluirOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Item de Estoque</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          {excluirItem && (
            <p className="text-sm text-slate-600 py-2">"{excluirItem.descricao}"</p>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setExcluirOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarExclusao} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}