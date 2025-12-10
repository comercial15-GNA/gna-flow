import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  ClipboardList, 
  Plus, 
  Search,
  FileText,
  Package,
  Filter,
  Edit2,
  ArrowRight,
  RotateCcw,
  ExternalLink,
  Save,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import OPCard from '@/components/producao/OPCard';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HistoricoMovimentacoes from '@/components/producao/HistoricoMovimentacoes';

export default function Comercial() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('em_andamento');
  const [editingItem, setEditingItem] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loadingItem, setLoadingItem] = useState(null);
  const [expandedHistorico, setExpandedHistorico] = useState({});
  const queryClient = useQueryClient();

  const toggleHistorico = (itemId) => {
    setExpandedHistorico(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: ops = [], isLoading: loadingOPs } = useQuery({
    queryKey: ['ops-comercial'],
    queryFn: () => base44.entities.OrdemProducao.list('created_date'),
  });

  const { data: itens = [] } = useQuery({
    queryKey: ['itens-all'],
    queryFn: () => base44.entities.ItemOP.list('created_date'),
  });

  // Filtrar OPs: criadas pelo usuário ou onde é responsável (pelo apelido)
  const opsVisiveis = ops.filter(op => {
    if (currentUser?.setor === 'administrador') return true;
    return op.created_by === currentUser?.email || op.responsavel === currentUser?.apelido;
  });

  // Itens retornados para o comercial (etapa_atual === 'comercial')
  const itensRetornados = itens.filter(item => {
    const op = opsVisiveis.find(o => o.id === item.op_id);
    return op && item.etapa_atual === 'comercial';
  });

  // Filtros para OPs
  const opsFiltradas = opsVisiveis.filter(op => {
    const matchSearch = !searchTerm || 
      op.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'todos' || op.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleEditItem = (item) => {
    setEditingItem(item);
    setEditForm({
      descricao: item.descricao,
      codigo_ga: item.codigo_ga || '',
      peso: item.peso || '',
      quantidade: item.quantidade,
      data_entrega: item.data_entrega || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    setLoadingItem(editingItem.id);
    try {
      await base44.entities.ItemOP.update(editingItem.id, {
        descricao: editForm.descricao,
        codigo_ga: editForm.codigo_ga,
        peso: editForm.peso ? parseFloat(editForm.peso) : null,
        quantidade: parseInt(editForm.quantidade),
        data_entrega: editForm.data_entrega || null
      });
      queryClient.invalidateQueries({ queryKey: ['itens-all'] });
      toast.success('Item atualizado com sucesso');
      setEditDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao atualizar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const enviarParaEngenharia = async (item) => {
    setLoadingItem(item.id);
    try {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: 'engenharia',
        data_entrada_etapa: new Date().toISOString()
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'comercial',
        setor_destino: 'engenharia',
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.apelido || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['itens-all'] });
      toast.success('Item enviado para Engenharia');
    } catch (error) {
      toast.error('Erro ao enviar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const getOPArquivos = (opId) => {
    const op = ops.find(o => o.id === opId);
    return op?.arquivos || [];
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Comercial</h1>
            <p className="text-slate-500">Suas Ordens de Produção</p>
          </div>
        </div>
        <Link to={createPageUrl('CriarOP')}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova OP
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{opsVisiveis.length}</p>
              <p className="text-xs text-slate-500">Total OPs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {opsVisiveis.filter(op => op.status === 'em_andamento').length}
              </p>
              <p className="text-xs text-slate-500">Em Andamento</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {opsVisiveis.filter(op => op.status === 'coleta').length}
              </p>
              <p className="text-xs text-slate-500">Coleta</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {itens.filter(i => opsVisiveis.some(op => op.id === i.op_id)).length}
              </p>
              <p className="text-xs text-slate-500">Total Itens</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{itensRetornados.length}</p>
              <p className="text-xs text-slate-500">Itens Retornados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Itens Retornados */}
      {itensRetornados.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            Itens Retornados para Revisão
          </h2>
          <div className="space-y-4">
            {itensRetornados.map((item) => {
              const arquivos = getOPArquivos(item.op_id);
              return (
                <div key={item.id} className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{item.descricao}</p>
                        <p className="text-xs text-slate-500">{item.numero_op} • {item.equipamento_principal}</p>
                        <p className="text-xs text-slate-400">{item.cliente}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-800">Retornado</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
                    <div><span className="text-slate-400">Código GA:</span> {item.codigo_ga || '-'}</div>
                    <div><span className="text-slate-400">Peso:</span> {item.peso ? `${item.peso} kg` : '-'}</div>
                    <div><span className="text-slate-400">Qtd:</span> {item.quantidade}</div>
                    <div><span className="text-slate-400">Entrega:</span> {item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yyyy') : '-'}</div>
                    <div><span className="text-slate-400">Responsável:</span> {item.responsavel_op || '-'}</div>
                  </div>

                  {arquivos.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-2">Arquivos da OP:</p>
                      <div className="flex flex-wrap gap-2">
                        {arquivos.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 bg-white px-2 py-1 rounded text-xs text-blue-600 hover:bg-slate-100"
                          >
                            <FileText className="w-3 h-3" />
                            Arquivo {idx + 1}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.data_entrada_etapa && (
                    <div className="text-xs text-slate-500 mb-4">
                      Retornado em: {format(new Date(item.data_entrada_etapa), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  )}

                  {/* Histórico de Movimentações */}
                  <div className="mb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleHistorico(item.id)}
                      className="text-slate-600 hover:text-slate-800 p-0 h-auto"
                    >
                      <History className="w-4 h-4 mr-1" />
                      Histórico de Movimentações
                      {expandedHistorico[item.id] ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>

                  {expandedHistorico[item.id] && (
                    <div className="mb-4 p-3 bg-white rounded-lg">
                      <HistoricoMovimentacoes itemId={item.id} />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-amber-200">
                    <Button
                      size="sm"
                      onClick={() => enviarParaEngenharia(item)}
                      disabled={loadingItem === item.id}
                      className="bg-slate-800 hover:bg-slate-900"
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      Enviar p/ Engenharia
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por OP, cliente ou equipamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="coleta">Coleta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loadingOPs ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : opsFiltradas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhuma OP encontrada</h3>
          <p className="text-slate-500 mb-4">Crie sua primeira Ordem de Produção</p>
          <Link to={createPageUrl('CriarOP')}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova OP
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {opsFiltradas.map((op) => (
            <OPCard key={op.id} op={op} itens={itens} showItens={true} />
          ))}
        </div>
      )}

      {/* Dialog Editar Item */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item Retornado</DialogTitle>
            <DialogDescription>Atualize os dados do item antes de reenviar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código GA</Label>
                <Input
                  value={editForm.codigo_ga}
                  onChange={(e) => setEditForm({ ...editForm, codigo_ga: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.peso}
                  onChange={(e) => setEditForm({ ...editForm, peso: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.quantidade}
                  onChange={(e) => setEditForm({ ...editForm, quantidade: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Data Entrega</Label>
                <Input
                  type="date"
                  value={editForm.data_entrega}
                  onChange={(e) => setEditForm({ ...editForm, data_entrega: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={loadingItem}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}