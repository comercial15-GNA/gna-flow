import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Filter, ChevronDown, ChevronUp, FileDown, Package, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import OPProgressPanel from '../components/producao/OPProgressPanel';
import { updateOPStatus } from '../components/producao/UpdateOPStatus';

export default function Coleta() {
  const [search, setSearch] = useState('');
  const [opsExpandidas, setOpsExpandidas] = useState({});
  const [dialogFinalizar, setDialogFinalizar] = useState({ aberto: false, item: null });
  const [dialogRetornar, setDialogRetornar] = useState({ aberto: false, item: null });
  const [justificativa, setJustificativa] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-coleta'],
    queryFn: () => base44.entities.ItemOP.filter({ etapa_atual: 'coleta' })
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-all'],
    queryFn: () => base44.entities.OrdemProducao.list()
  });

  const finalizarMutation = useMutation({
    mutationFn: async ({ item, justificativa }) => {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: 'finalizado',
        data_entrada_etapa: new Date().toISOString()
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'coleta',
        setor_destino: 'finalizado',
        justificativa: justificativa,
        usuario_email: user?.email,
        usuario_nome: user?.full_name || user?.apelido,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(item.op_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens-coleta'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('Item finalizado com sucesso');
      setDialogFinalizar({ aberto: false, item: null });
      setJustificativa('');
      setLoadingItem(null);
    },
    onError: () => {
      toast.error('Erro ao finalizar item');
      setLoadingItem(null);
    }
  });

  const retornarMutation = useMutation({
    mutationFn: async ({ item, justificativa }) => {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: 'expedicao',
        data_entrada_etapa: new Date().toISOString(),
        retornado: true,
        justificativa_retorno: justificativa
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'coleta',
        setor_destino: 'expedicao',
        justificativa: justificativa,
        usuario_email: user?.email,
        usuario_nome: user?.full_name || user?.apelido,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(item.op_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens-coleta'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('Item retornado para expedição');
      setDialogRetornar({ aberto: false, item: null });
      setJustificativa('');
      setLoadingItem(null);
    },
    onError: () => {
      toast.error('Erro ao retornar item');
      setLoadingItem(null);
    }
  });

  const handleFinalizar = (item) => {
    setDialogFinalizar({ aberto: true, item });
    setJustificativa('');
  };

  const confirmarFinalizacao = async () => {
    if (!justificativa.trim()) {
      toast.error('Observações da finalização são obrigatórias');
      return;
    }
    setLoadingItem(dialogFinalizar.item.id);
    await finalizarMutation.mutateAsync({ item: dialogFinalizar.item, justificativa });
  };

  const handleRetornar = (item) => {
    setDialogRetornar({ aberto: true, item });
    setJustificativa('');
  };

  const confirmarRetorno = async () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória');
      return;
    }
    setLoadingItem(dialogRetornar.item.id);
    await retornarMutation.mutateAsync({ item: dialogRetornar.item, justificativa });
  };

  const itensFiltrados = itens.filter(item => {
    const matchSearch = search === '' || 
      item.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      item.numero_op?.toLowerCase().includes(search.toLowerCase()) ||
      item.codigo_ga?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const opsComItens = ops
    .map(op => ({
      ...op,
      itens: itensFiltrados.filter(item => item.op_id === op.id)
    }))
    .filter(op => op.itens.length > 0);

  const gerarRelatorio = () => {
    const headers = ['OP', 'Cliente', 'Equipamento', 'Item', 'Código GA', 'Quantidade', 'Peso Expedição', 'Volume', 'Data Coleta'];
    const linhas = itensFiltrados.map(item => [
      item.numero_op,
      item.cliente,
      item.equipamento_principal,
      item.descricao,
      item.codigo_ga || '',
      item.quantidade,
      item.peso_expedicao || '',
      item.volume_expedicao || '',
      format(new Date(item.data_entrada_etapa), 'dd/MM/yyyy HH:mm')
    ]);

    const csv = [headers, ...linhas].map(linha => linha.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_coleta_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
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
            <h1 className="text-3xl font-bold text-slate-800">Coleta</h1>
            <p className="text-slate-600">Itens aguardando coleta e finalização</p>
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
          
          <Input
            placeholder="Buscar por OP, item ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Card>

        <div className="space-y-4">
          {opsComItens.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600">Nenhum item em coleta</p>
            </Card>
          ) : (
            opsComItens.map(op => {
              const todosItensOP = itens.filter(i => i.op_id === op.id);
              return (
                <Card key={op.id} className="p-6">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setOpsExpandidas({...opsExpandidas, [op.id]: !opsExpandidas[op.id]})}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-800">{op.numero_op}</h3>
                        <Badge className="bg-teal-600">{op.itens.length} itens em coleta</Badge>
                        <Badge variant="outline">{op.status}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">Cliente:</span>
                          <span className="ml-2 font-medium">{op.cliente}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Equipamento:</span>
                          <span className="ml-2 font-medium">{op.equipamento_principal}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Responsável:</span>
                          <span className="ml-2 font-medium">{op.responsavel}</span>
                        </div>
                      </div>
                    </div>
                    {opsExpandidas[op.id] ? <ChevronUp /> : <ChevronDown />}
                  </div>

                  {opsExpandidas[op.id] && (
                    <div className="mt-6 space-y-4">
                      <OPProgressPanel op={op} itens={todosItensOP} />
                      
                      {op.itens.map(item => (
                        <div key={item.id} className="border-l-4 border-teal-600 pl-4 py-3 bg-slate-50 rounded">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 mb-2">{item.descricao}</h4>
                              <div className="grid grid-cols-4 gap-3 text-sm text-slate-600">
                                {item.codigo_ga && <div>Código: {item.codigo_ga}</div>}
                                <div>Qtd: {item.quantidade}</div>
                                {item.peso_expedicao && <div>Peso: {item.peso_expedicao} kg</div>}
                                {item.volume_expedicao && <div>Volume: {item.volume_expedicao}</div>}
                              </div>
                              {item.informacoes_expedicao && (
                                <p className="text-sm text-slate-600 mt-2 italic">{item.informacoes_expedicao}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleFinalizar(item)}
                                disabled={loadingItem === item.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Finalizar
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleRetornar(item)}
                                disabled={loadingItem === item.id}
                              >
                                Retornar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={dialogFinalizar.aberto} onOpenChange={(open) => setDialogFinalizar({ aberto: open, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded">
              <p className="font-semibold">{dialogFinalizar.item?.descricao}</p>
              <p className="text-sm text-slate-600">OP: {dialogFinalizar.item?.numero_op}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Observações da finalização (obrigatória) *</label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva detalhes da coleta realizada..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogFinalizar({ aberto: false, item: null })}>
              Cancelar
            </Button>
            <Button onClick={confirmarFinalizacao} disabled={finalizarMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {finalizarMutation.isPending ? 'Finalizando...' : 'Confirmar Finalização'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogRetornar.aberto} onOpenChange={(open) => setDialogRetornar({ aberto: open, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Item para Expedição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded">
              <p className="font-semibold">{dialogRetornar.item?.descricao}</p>
              <p className="text-sm text-slate-600">OP: {dialogRetornar.item?.numero_op}</p>
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