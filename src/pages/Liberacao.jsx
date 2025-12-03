import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CheckCircle, 
  Search,
  Package,
  RotateCcw,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ETAPAS_RETORNO = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'engenharia', label: 'Engenharia' },
  { value: 'modelagem', label: 'Modelagem' },
  { value: 'suprimentos', label: 'Suprimentos' },
  { value: 'fundicao', label: 'Fundição' },
  { value: 'usinagem', label: 'Usinagem' },
];

export default function Liberacao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedEtapa, setSelectedEtapa] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-liberacao'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'liberacao' }, 'data_entrada_etapa');
      return items;
    }
  });

  const finalizarItem = async (item) => {
    setLoadingItem(item.id);
    try {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: 'finalizado',
        data_entrada_etapa: new Date().toISOString()
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'liberacao',
        setor_destino: 'finalizado',
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      // Verificar se todos os itens da OP foram finalizados
      const itensOP = await base44.entities.ItemOP.filter({ op_id: item.op_id });
      const todosFinalizados = itensOP.every(i => i.id === item.id ? true : i.etapa_atual === 'finalizado');
      
      if (todosFinalizados) {
        await base44.entities.OrdemProducao.update(item.op_id, { status: 'finalizada' });
      }

      queryClient.invalidateQueries({ queryKey: ['itens-liberacao'] });
      toast.success('Item finalizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao finalizar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const abrirDialogRetorno = (item) => {
    setSelectedItem(item);
    setSelectedEtapa('');
    setRetornarDialogOpen(true);
  };

  const confirmarRetorno = async () => {
    if (!selectedEtapa) {
      toast.error('Selecione uma etapa');
      return;
    }

    setLoadingItem(selectedItem.id);
    try {
      await base44.entities.ItemOP.update(selectedItem.id, {
        etapa_atual: selectedEtapa,
        data_entrada_etapa: new Date().toISOString()
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: selectedItem.id,
        op_id: selectedItem.op_id,
        numero_op: selectedItem.numero_op,
        descricao_item: selectedItem.descricao,
        setor_origem: 'liberacao',
        setor_destino: selectedEtapa,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['itens-liberacao'] });
      toast.success(`Item retornado para ${ETAPAS_RETORNO.find(e => e.value === selectedEtapa)?.label}`);
      setRetornarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao retornar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const itensFiltrados = itens.filter(item =>
    item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cliente?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Liberação</h1>
            <p className="text-slate-500">Itens aguardando liberação final</p>
          </div>
        </div>
        <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium">
          {itens.length} itens na fila
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
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
          {itensFiltrados.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{item.descricao}</p>
                    <p className="text-xs text-slate-500">{item.numero_op}</p>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800">Liberação</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                {item.codigo_ga && (
                  <div className="text-slate-600">
                    <span className="text-slate-400">Código:</span> {item.codigo_ga}
                  </div>
                )}
                {item.peso && (
                  <div className="text-slate-600">
                    <span className="text-slate-400">Peso:</span> {item.peso} kg
                  </div>
                )}
                <div className="text-slate-600">
                  <span className="text-slate-400">Qtd:</span> {item.quantidade}
                </div>
                {item.cliente && (
                  <div className="text-slate-600">
                    <span className="text-slate-400">Cliente:</span> {item.cliente}
                  </div>
                )}
              </div>

              {item.data_entrada_etapa && (
                <div className="text-xs text-slate-500 mb-4">
                  Entrada: {format(new Date(item.data_entrada_etapa), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                <Button
                  size="sm"
                  onClick={() => finalizarItem(item)}
                  disabled={loadingItem === item.id}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Finalizar Item
                </Button>
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de Retorno */}
      <Dialog open={retornarDialogOpen} onOpenChange={setRetornarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Item</DialogTitle>
            <DialogDescription>
              Selecione a etapa para qual deseja retornar o item
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedEtapa} onValueChange={setSelectedEtapa}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                {ETAPAS_RETORNO.map((etapa) => (
                  <SelectItem key={etapa.value} value={etapa.value}>
                    {etapa.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRetornarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarRetorno} disabled={!selectedEtapa || loadingItem}>
              Confirmar Retorno
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}