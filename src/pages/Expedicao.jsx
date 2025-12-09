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
  Truck, 
  Search,
  Package,
  RotateCcw,
  Check,
  FileText,
  ExternalLink,
  Weight,
  Box,
  FileSpreadsheet,
  Info,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HistoricoMovimentacoes from '@/components/producao/HistoricoMovimentacoes';
import OPProgressPanel from '@/components/producao/OPProgressPanel';

export default function Expedicao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const [informacoes, setInformacoes] = useState('');
  const [expandedHistorico, setExpandedHistorico] = useState({});
  const queryClient = useQueryClient();

  const toggleHistorico = (itemId) => {
    setExpandedHistorico(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-expedicao'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'expedicao' }, 'created_date');
      return items;
    }
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-all'],
    queryFn: () => base44.entities.OrdemProducao.list(),
  });

  const getArquivos = (opId) => ops.find(o => o.id === opId)?.arquivos || [];

  const abrirDialogFinalizar = (item) => {
    setSelectedItem(item);
    setInformacoes(item.informacoes_expedicao || '');
    setFinalizarDialogOpen(true);
  };

  const finalizarItem = async () => {
    setLoadingItem(selectedItem.id);
    try {
      const opId = selectedItem.op_id;
      
      // Atualizar status da OP para "coleta" quando houver itens em expedição
      const op = ops.find(o => o.id === opId);
      if (op && op.status !== 'coleta') {
        await base44.entities.OrdemProducao.update(opId, { status: 'coleta' });
      }

      // Excluir histórico de movimentações do item
      const historicos = await base44.entities.HistoricoMovimentacao.filter({ item_id: selectedItem.id });
      for (const hist of historicos) {
        await base44.entities.HistoricoMovimentacao.delete(hist.id);
      }
      
      // Excluir o item
      await base44.entities.ItemOP.delete(selectedItem.id);

      // Verificar se ainda existem itens na OP
      const itensRestantes = await base44.entities.ItemOP.filter({ op_id: opId });
      
      if (itensRestantes.length === 0) {
        // Se não há mais itens, excluir a OP também
        await base44.entities.OrdemProducao.delete(opId);
        toast.success('Item e OP finalizados e excluídos!');
      } else {
        toast.success('Item finalizado e excluído!');
      }

      queryClient.invalidateQueries({ queryKey: ['itens-expedicao'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
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
        etapa_atual: 'liberacao',
        data_entrada_etapa: new Date().toISOString()
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: selectedItem.id,
        op_id: selectedItem.op_id,
        numero_op: selectedItem.numero_op,
        descricao_item: selectedItem.descricao,
        setor_origem: 'expedicao',
        setor_destino: 'liberacao',
        justificativa: justificativa,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.apelido || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['itens-expedicao'] });
      toast.success('Item retornado para Liberação');
      setRetornarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao retornar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const gerarRelatorio = () => {
    const dados = itens.map(item => ({
      'OP': item.numero_op,
      'Equipamento': item.equipamento_principal || '-',
      'Descrição': item.descricao,
      'Código GA': item.codigo_ga || '-',
      'Peso Item (kg)': item.peso || '-',
      'Quantidade': item.quantidade,
      'Cliente': item.cliente,
      'Peso Expedição (kg)': item.peso_expedicao || '-',
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
    link.download = `relatorio_expedicao_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  const itensFiltrados = itens.filter(item =>
    item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar itens por OP
  const itensAgrupadosPorOP = itensFiltrados.reduce((acc, item) => {
    if (!acc[item.op_id]) {
      const op = ops.find(o => o.id === item.op_id);
      acc[item.op_id] = {
        op: op || { numero_op: item.numero_op, cliente: item.cliente, equipamento_principal: item.equipamento_principal },
        itens: []
      };
    }
    acc[item.op_id].itens.push(item);
    return acc;
  }, {});

  const opsComItens = Object.values(itensAgrupadosPorOP);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Expedição</h1>
            <p className="text-slate-500">Itens prontos para expedição</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 text-teal-800 px-4 py-2 rounded-full text-sm font-medium">
            {itens.length} itens • {opsComItens.length} OPs
          </div>
          {itens.length > 0 && (
            <Button onClick={gerarRelatorio} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>
          )}
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
        <div className="space-y-6">
          {opsComItens.map(({ op, itens: itensOP }) => {
            const arquivos = getArquivos(op.id);
            return (
              <div key={op.id} className="space-y-4">
                {/* Painel de Progresso da OP */}
                <OPProgressPanel op={op} itens={itensOP} />

                {/* Container dos Itens */}
                <div className="bg-white rounded-xl border-2 border-teal-200 shadow-sm overflow-hidden">
                  {/* Cabeçalho da OP */}
                  <div className="bg-teal-50 border-b border-teal-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{op.numero_op}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span><strong>Cliente:</strong> {op.cliente}</span>
                        <span><strong>Equipamento:</strong> {op.equipamento_principal}</span>
                        {op.responsavel && <span><strong>Resp.:</strong> {op.responsavel}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-teal-600 text-white">
                        {itensOP.length} {itensOP.length === 1 ? 'item' : 'itens'}
                      </Badge>
                    </div>
                  </div>
                  
                  {arquivos.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-teal-200">
                      <p className="text-xs text-slate-500 mb-2">Arquivos da OP:</p>
                      <div className="flex flex-wrap gap-2">
                        {arquivos.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 bg-white px-2 py-1 rounded text-xs text-blue-600 hover:bg-teal-100"
                          >
                            <FileText className="w-3 h-3" />
                            Arquivo {idx + 1}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Itens da OP */}
                <div className="p-4 space-y-3">
                  {itensOP.map((item) => (
                    <div key={item.id} className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                            <Package className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{item.descricao}</p>
                            <p className="text-xs text-slate-500">Código: {item.codigo_ga || '-'}</p>
                          </div>
                        </div>
                      </div>

                      {item.observacao && (
                        <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs text-blue-800">
                            <strong>Observação:</strong> {item.observacao}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                        <div><span className="text-slate-400">Qtd:</span> {item.quantidade}</div>
                        <div><span className="text-slate-400">Entrega:</span> {item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yy') : '-'}</div>
                        <div><span className="text-slate-400">Peso Exp.:</span> {item.peso_expedicao ? `${item.peso_expedicao} kg` : '-'}</div>
                        <div><span className="text-slate-400">Volume:</span> {item.volume_expedicao || '-'}</div>
                      </div>

                      {item.data_entrada_etapa && (
                        <div className="text-xs text-slate-500 mb-3">
                          Entrada: {format(new Date(item.data_entrada_etapa), "dd/MM HH:mm", { locale: ptBR })}
                        </div>
                      )}

                      {/* Histórico */}
                      <div className="mb-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleHistorico(item.id)}
                          className="text-slate-600 hover:text-slate-800 p-0 h-auto text-xs"
                        >
                          <History className="w-3 h-3 mr-1" />
                          Histórico
                          {expandedHistorico[item.id] ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                        </Button>
                      </div>

                      {expandedHistorico[item.id] && (
                        <div className="mb-3 p-3 bg-white rounded-lg border border-slate-200">
                          <HistoricoMovimentacoes itemId={item.id} />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
                        <Button
                          size="sm"
                          onClick={() => abrirDialogFinalizar(item)}
                          disabled={loadingItem === item.id}
                          className="bg-teal-600 hover:bg-teal-700"
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
                          Retornar p/ Liberação
                        </Button>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Finalizar */}
      <Dialog open={finalizarDialogOpen} onOpenChange={setFinalizarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Item</DialogTitle>
            <DialogDescription>Adicione informações adicionais se necessário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Informações Adicionais</Label>
              <div className="relative mt-1">
                <Info className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Textarea
                  value={informacoes}
                  onChange={(e) => setInformacoes(e.target.value)}
                  placeholder="Observações, número de NF, transportadora, etc."
                  className="pl-10"
                  rows={4}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setFinalizarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={finalizarItem} disabled={loadingItem} className="bg-teal-600 hover:bg-teal-700">
                <Check className="w-4 h-4 mr-2" />
                Finalizar Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Retorno */}
      <Dialog open={retornarDialogOpen} onOpenChange={setRetornarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar para Liberação</DialogTitle>
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