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
  PackageCheck, 
  Search,
  Package,
  RotateCcw,
  Check,
  FileText,
  ExternalLink,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ItemOPActions from '@/components/producao/ItemOPActions';
import { updateOPStatus } from '@/components/producao/UpdateOPStatus';

export default function Coleta() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
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
    queryKey: ['itens-coleta'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'coleta' });
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

  const { data: todosItens = [] } = useQuery({
    queryKey: ['todos-itens-ops'],
    queryFn: () => base44.entities.ItemOP.list(),
  });

  const abrirDialogFinalizar = (item) => {
    setSelectedItem(item);
    setJustificativa('');
    setFinalizarDialogOpen(true);
  };

  const finalizarItem = async () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória');
      return;
    }

    setLoadingItem(selectedItem.id);
    try {
      await base44.entities.ItemOP.update(selectedItem.id, {
        etapa_atual: 'finalizado',
        data_entrada_etapa: new Date().toISOString()
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: selectedItem.id,
        op_id: selectedItem.op_id,
        numero_op: selectedItem.numero_op,
        descricao_item: selectedItem.descricao,
        setor_origem: 'coleta',
        setor_destino: 'finalizado',
        justificativa: justificativa,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.apelido || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      // Atualizar status da OP
      await updateOPStatus(selectedItem.op_id);

      queryClient.invalidateQueries({ queryKey: ['itens-coleta'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      queryClient.invalidateQueries({ queryKey: ['todos-itens-ops'] });
      toast.success('Item finalizado com sucesso');
      setFinalizarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao finalizar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const abrirDialogRetorno = (item) => {
    setSelectedItem(item);
    setJustificativa('');
    setRetornarDialogOpen(true);
  };

  const confirmarRetorno = async () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória para retorno');
      return;
    }

    setLoadingItem(selectedItem.id);
    try {
      await base44.entities.ItemOP.update(selectedItem.id, {
        etapa_atual: 'expedicao',
        data_entrada_etapa: new Date().toISOString(),
        retornado: true,
        justificativa_retorno: justificativa
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: selectedItem.id,
        op_id: selectedItem.op_id,
        numero_op: selectedItem.numero_op,
        descricao_item: selectedItem.descricao,
        setor_origem: 'coleta',
        setor_destino: 'expedicao',
        justificativa: justificativa,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.apelido || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(selectedItem.op_id);
      
      queryClient.invalidateQueries({ queryKey: ['itens-coleta'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('Item retornado para Expedição');
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
      'Peso (kg)': item.peso || '-',
      'Quantidade': item.quantidade,
      'Cliente': item.cliente,
      'Peso Expedição': item.peso_expedicao || '-',
      'Volume': item.volume_expedicao || '-',
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
    link.download = `relatorio_coleta_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  const itensFiltrados = itens.filter(item =>
    item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const opsComItensColeta = ops.filter(op => {
    const itensOP = itens.filter(i => i.op_id === op.id);
    const temItensColeta = itensOP.length > 0;
    
    if (searchTerm) {
      const matchOP = op.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchItens = itensOP.some(item =>
        item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo_ga?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return temItensColeta && (matchOP || matchItens);
    }
    
    return temItensColeta;
  }).map(op => {
    const todosItensOP = todosItens.filter(i => i.op_id === op.id);
    return { op, itens: todosItensOP };
  }).sort((a, b) => {
    const itensColetaA = a.itens.filter(i => i.etapa_atual === 'coleta');
    const itensColetaB = b.itens.filter(i => i.etapa_atual === 'coleta');
    const dataA = itensColetaA.length > 0 ? Math.min(...itensColetaA.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity)) : Infinity;
    const dataB = itensColetaB.length > 0 ? Math.min(...itensColetaB.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity)) : Infinity;
    return dataA - dataB;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <PackageCheck className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Coleta</h1>
            <p className="text-slate-500">Itens aguardando coleta</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium">
            {itens.length} itens em Coleta • {opsComItensColeta.length} OPs
          </div>
          {itens.length > 0 && (
            <Button onClick={gerarRelatorio} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Relatório
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por OP, cliente, equipamento ou item..."
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
      ) : opsComItensColeta.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhuma OP com itens em Coleta</h3>
          <p className="text-slate-500">Todos os itens foram processados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opsComItensColeta.map(({ op, itens: todosItensOP }) => {
            const arquivos = op.arquivos || [];
            const itensColeta = todosItensOP.filter(i => i.etapa_atual === 'coleta');
            const isExpanded = expandedOPs[op.id];
            
            return (
              <div key={op.id} className="bg-white rounded-xl border-2 border-purple-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleOP(op.id)}
                  className="w-full bg-purple-50 border-b border-purple-200 p-4 hover:bg-purple-100 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">{op.numero_op}</h3>
                        <Badge className="bg-purple-600 text-white">
                          {itensColeta.length} em Coleta
                        </Badge>
                        <Badge variant="outline" className="text-slate-600">
                          Total: {todosItensOP.length} itens
                        </Badge>
                        {op.status === 'coleta' && (
                          <Badge className="bg-purple-500 text-white">Status: Coleta</Badge>
                        )}
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

                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                        <PackageCheck className="w-4 h-4" />
                        Itens em Coleta ({itensColeta.length})
                      </h4>
                      <div className="space-y-3">
                        {itensColeta.map((item) => {
                          const isAtrasado = item.data_entrega && new Date(item.data_entrega) < new Date();
                          return (
                            <div key={item.id} className="bg-purple-50 rounded-lg border-2 border-purple-300 p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-semibold text-slate-800 mb-1">{item.descricao}</p>
                                  <p className="text-xs text-slate-500">Código GA: {item.codigo_ga || '-'}</p>
                                </div>
                              </div>

                              <ItemOPActions item={item} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['itens-coleta'] })} />

                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3 text-sm">
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
                                  <span className="font-medium">Peso Exp.:</span> {item.peso_expedicao ? `${item.peso_expedicao} kg` : '-'}
                                </div>
                                <div className="text-slate-600">
                                  <span className="font-medium">Volume:</span> {item.volume_expedicao || '-'}
                                </div>
                                <div className="text-slate-600">
                                  <span className="font-medium">Responsável:</span> {item.responsavel_op || '-'}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => abrirDialogFinalizar(item)}
                                  disabled={loadingItem === item.id}
                                  className="bg-purple-600 hover:bg-purple-700"
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
                                  Retornar p/ Expedição
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Distribuição por Etapa - Todos os Itens da OP
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {['comercial', 'engenharia', 'modelagem', 'suprimentos', 'fundicao', 'acabamento', 'usinagem', 'liberacao', 'expedicao', 'coleta', 'finalizado'].map(etapa => {
                          const count = todosItensOP.filter(i => i.etapa_atual === etapa).length;
                          const etapaLabels = {
                            comercial: 'Comercial',
                            engenharia: 'Engenharia',
                            modelagem: 'Modelagem',
                            suprimentos: 'Suprimentos',
                            fundicao: 'Fundição',
                            acabamento: 'Acabamento',
                            usinagem: 'Usinagem',
                            liberacao: 'Liberação',
                            expedicao: 'Expedição',
                            coleta: 'Coleta',
                            finalizado: 'Finalizado'
                          };
                          return count > 0 ? (
                            <div key={etapa} className="bg-slate-100 rounded p-2 text-center">
                              <p className="text-xs text-slate-600 mb-1">{etapaLabels[etapa]}</p>
                              <p className="text-lg font-bold text-slate-800">{count}</p>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={finalizarDialogOpen} onOpenChange={setFinalizarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Item</DialogTitle>
            <DialogDescription>Informe a justificativa para finalização</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Justificativa *</Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo da finalização..."
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setFinalizarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={finalizarItem} disabled={loadingItem} className="bg-purple-600 hover:bg-purple-700">
                <Check className="w-4 h-4 mr-2" />
                Confirmar Finalização
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={retornarDialogOpen} onOpenChange={setRetornarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar para Expedição</DialogTitle>
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