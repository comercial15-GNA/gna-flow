import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Cog, 
  Search,
  Package,
  Edit2,
  ArrowRight,
  RotateCcw,
  FileText,
  ExternalLink,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";

export default function Engenharia() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [retornarItem, setRetornarItem] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-engenharia'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'engenharia' }, 'data_entrada_etapa');
      return items;
    }
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-all'],
    queryFn: () => base44.entities.OrdemProducao.list(),
  });

  const movimentarItem = async (item, novaEtapa, justif = '') => {
    setLoadingItem(item.id);
    try {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: novaEtapa,
        data_entrada_etapa: new Date().toISOString()
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'engenharia',
        setor_destino: novaEtapa,
        justificativa: justif,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.apelido || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['itens-engenharia'] });
      const destinos = { modelagem: 'Modelagem', suprimentos: 'Suprimentos', comercial: 'Comercial' };
      toast.success(`Item enviado para ${destinos[novaEtapa]}`);
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

  const confirmarRetorno = () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória para retorno');
      return;
    }
    movimentarItem(retornarItem, 'comercial', justificativa);
  };

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
      queryClient.invalidateQueries({ queryKey: ['itens-engenharia'] });
      toast.success('Item atualizado com sucesso');
      setEditDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao atualizar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const itensFiltrados = itens.filter(item =>
    item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo_ga?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOPArquivos = (opId) => {
    const op = ops.find(o => o.id === opId);
    return op?.arquivos || [];
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Cog className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Engenharia</h1>
            <p className="text-slate-500">Itens aguardando análise técnica</p>
          </div>
        </div>
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
          {itens.length} itens na fila
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por descrição, OP, cliente ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum item na fila</h3>
          <p className="text-slate-500">Todos os itens foram processados</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {itensFiltrados.map((item) => {
            const arquivos = getOPArquivos(item.op_id);
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{item.descricao}</p>
                      <p className="text-xs text-slate-500">{item.numero_op} • {item.equipamento_principal || item.cliente}</p>
                      {item.equipamento_principal && <p className="text-xs text-slate-400">{item.cliente}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">Engenharia</Badge>
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

                {item.data_entrada_etapa && (
                  <div className="text-xs text-slate-500 mb-4">
                    Entrada: {format(new Date(item.data_entrada_etapa), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                  <Button
                    size="sm"
                    onClick={() => movimentarItem(item, 'modelagem')}
                    disabled={loadingItem === item.id}
                    className="bg-slate-800 hover:bg-slate-900"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Enviar p/ Modelagem
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => movimentarItem(item, 'suprimentos')}
                    disabled={loadingItem === item.id}
                    className="bg-slate-800 hover:bg-slate-900"
                  >
                    <ArrowRight className="w-3 h-3 mr-1" />
                    Enviar p/ Suprimentos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetornar(item)}
                    disabled={loadingItem === item.id}
                    className="text-amber-600 border-amber-300 hover:bg-amber-50"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Retornar p/ Comercial
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Editar Item */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
            <DialogDescription>Atualize os dados do item</DialogDescription>
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

      {/* Dialog Justificativa Retorno */}
      <Dialog open={retornarDialogOpen} onOpenChange={setRetornarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Item para Comercial</DialogTitle>
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