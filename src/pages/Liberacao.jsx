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
  CheckCircle, 
  Search,
  Package,
  RotateCcw,
  ArrowRight,
  FileText,
  ExternalLink,
  Weight,
  Box,
  History,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import HistoricoMovimentacoes from '@/components/producao/HistoricoMovimentacoes';
import OPProgressPanel from '@/components/producao/OPProgressPanel';
import ItemOPActions from '@/components/producao/ItemOPActions';
import ItensRetornados from '@/components/producao/ItensRetornados';
import { updateOPStatus } from '@/components/producao/UpdateOPStatus';

const ETAPAS_RETORNO = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'engenharia', label: 'Engenharia' },
  { value: 'modelagem', label: 'Modelagem' },
  { value: 'suprimentos', label: 'Suprimentos' },
  { value: 'fundicao', label: 'Fundição' },
  { value: 'usinagem', label: 'Usinagem' },
  { value: 'caldeiraria', label: 'Caldeiraria' },
];

export default function Liberacao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [expedicaoDialogOpen, setExpedicaoDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedEtapa, setSelectedEtapa] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [pesoExpedicao, setPesoExpedicao] = useState('');
  const [volumeExpedicao, setVolumeExpedicao] = useState('');
  const [alertaRetorno, setAlertaRetorno] = useState(false);
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
    queryKey: ['itens-liberacao'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'liberacao' });
      // Ordenar por data de entrega (mais próxima primeiro)
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

  const getArquivos = (opId) => ops.find(o => o.id === opId)?.arquivos || [];

  const abrirDialogExpedicao = (item) => {
    setSelectedItem(item);
    setPesoExpedicao(item.peso_expedicao || '');
    setVolumeExpedicao(item.volume_expedicao || '');
    setExpedicaoDialogOpen(true);
  };

  const enviarParaExpedicao = async () => {
    if (!pesoExpedicao || !volumeExpedicao) {
      toast.error('Peso e Volume são obrigatórios para enviar à Expedição');
      return;
    }

    setLoadingItem(selectedItem.id);
    try {
      const opId = selectedItem.op_id;

      await base44.entities.ItemOP.update(selectedItem.id, {
        etapa_atual: 'expedicao',
        data_entrada_etapa: new Date().toISOString(),
        peso_expedicao: parseFloat(pesoExpedicao),
        volume_expedicao: volumeExpedicao,
        retornado: false,
        justificativa_retorno: '',
        alerta_retorno: false
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: selectedItem.id,
        op_id: selectedItem.op_id,
        numero_op: selectedItem.numero_op,
        descricao_item: selectedItem.descricao,
        setor_origem: 'liberacao',
        setor_destino: 'expedicao',
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(opId);
      
      queryClient.invalidateQueries({ queryKey: ['itens-liberacao'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('Item enviado para Expedição');
      setExpedicaoDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao enviar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const abrirDialogRetorno = (item) => {
    setSelectedItem(item);
    setSelectedEtapa('');
    setJustificativa('');
    setAlertaRetorno(false);
    setRetornarDialogOpen(true);
  };

  const confirmarRetorno = async () => {
    if (!selectedEtapa) {
      toast.error('Selecione uma etapa');
      return;
    }
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória para retorno');
      return;
    }

    setLoadingItem(selectedItem.id);
    try {
      await base44.entities.ItemOP.update(selectedItem.id, {
        etapa_atual: selectedEtapa,
        data_entrada_etapa: new Date().toISOString(),
        retornado: true,
        justificativa_retorno: justificativa,
        alerta_retorno: alertaRetorno
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: selectedItem.id,
        op_id: selectedItem.op_id,
        numero_op: selectedItem.numero_op,
        descricao_item: selectedItem.descricao,
        setor_origem: 'liberacao',
        setor_destino: selectedEtapa,
        justificativa: justificativa,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(selectedItem.op_id);
      
      queryClient.invalidateQueries({ queryKey: ['itens-liberacao'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success(`Item retornado para ${ETAPAS_RETORNO.find(e => e.value === selectedEtapa)?.label}`);
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
    link.download = `relatorio_liberacao_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  const itensFiltrados = itens.filter(item =>
    item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Buscar TODOS os itens de TODAS as OPs (não apenas os da etapa liberação)
  const { data: todosItens = [] } = useQuery({
    queryKey: ['todos-itens-ops'],
    queryFn: () => base44.entities.ItemOP.list(),
  });

  // Agrupar TODAS OPs que têm pelo menos um item na etapa de liberação
  const opsComItensLiberacao = ops.filter(op => {
    const itensOP = itens.filter(i => i.op_id === op.id);
    const temItensLiberacao = itensOP.length > 0;
    
    // Aplicar filtro de busca
    if (searchTerm) {
      const matchOP = op.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchItens = itensOP.some(item =>
        item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo_ga?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return temItensLiberacao && (matchOP || matchItens);
    }
    
    return temItensLiberacao;
  }).map(op => {
    const todosItensOP = todosItens.filter(i => i.op_id === op.id);
    return { op, itens: todosItensOP };
  }).sort((a, b) => {
    // Ordenar por data de entrega mais próxima
    const itensLiberacaoA = a.itens.filter(i => i.etapa_atual === 'liberacao');
    const itensLiberacaoB = b.itens.filter(i => i.etapa_atual === 'liberacao');
    const dataA = itensLiberacaoA.length > 0 ? Math.min(...itensLiberacaoA.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity)) : Infinity;
    const dataB = itensLiberacaoB.length > 0 ? Math.min(...itensLiberacaoB.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity)) : Infinity;
    return dataA - dataB;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Liberação</h1>
            <p className="text-slate-500">Itens aguardando liberação para expedição</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium">
            {itens.length} itens em Liberação • {opsComItensLiberacao.length} OPs
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
            placeholder="Buscar por OP, cliente, equipamento ou item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ItensRetornados
        itens={itens}
        onReenviar={async (item, justif) => {
          if (!pesoExpedicao || !volumeExpedicao) {
            toast.error('Configure peso e volume primeiro');
            return;
          }
          setLoadingItem(item.id);
          await enviarParaExpedicao();
        }}
        loadingItem={loadingItem}
        etapaAtual="liberacao"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : opsComItensLiberacao.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhuma OP com itens em Liberação</h3>
          <p className="text-slate-500">Todas as OPs foram processadas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opsComItensLiberacao.map(({ op, itens: todosItensOP }) => {
            const arquivos = getArquivos(op.id);
            const itensLiberacao = todosItensOP.filter(i => i.etapa_atual === 'liberacao');
            const isExpanded = expandedOPs[op.id];
            
            return (
              <div key={op.id} className="bg-white rounded-xl border-2 border-emerald-200 shadow-sm overflow-hidden">
                {/* Cabeçalho da OP - Clicável */}
                <button
                  onClick={() => toggleOP(op.id)}
                  className="w-full bg-emerald-50 border-b border-emerald-200 p-4 hover:bg-emerald-100 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-lg font-bold text-slate-800">{op.numero_op}</h3>
                          <span className="text-sm text-slate-600">{op.equipamento_principal}</span>
                        </div>
                        {op.ordem_compra && (
                          <Badge variant="outline" className="text-blue-700 border-blue-300">
                            O.C: {op.ordem_compra}
                          </Badge>
                        )}
                        <Badge className="bg-emerald-600 text-white">
                          {itensLiberacao.length} em Liberação
                        </Badge>
                        <Badge variant="outline" className="text-slate-600">
                          Total: {todosItensOP.length} itens
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-slate-600">
                        <div><strong>Cliente:</strong> {op.cliente}</div>
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

                {/* Conteúdo Expandível */}
                {isExpanded && (
                  <div className="p-4">
                    {/* Arquivos */}
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

                    {/* Itens em Liberação */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Itens em Liberação ({itensLiberacao.length})
                      </h4>
                      <div className="space-y-3">
                        {itensLiberacao.map((item) => (
                          <div key={item.id} className={`bg-emerald-50 rounded-lg border-2 ${item.alerta_retorno ? 'border-red-500 bg-red-50' : 'border-emerald-300'} p-4`}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-slate-800">{item.descricao}</p>
                                  {item.retornado && !item.alerta_retorno && <Badge variant="destructive">Retornado</Badge>}
                                  {item.alerta_retorno && (
                                    <Badge className="bg-red-600 text-white animate-pulse">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      ALERTA - Retornado
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">Código GA: {item.codigo_ga || '-'}</p>
                              </div>
                            </div>

                            <ItemOPActions item={item} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['itens-liberacao'] })} />

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3 text-sm">
                              <div className="text-slate-600">
                                <span className="font-medium">Peso:</span> {item.peso ? `${item.peso} kg` : '-'}
                              </div>
                              <div className="text-slate-600">
                                <span className="font-medium">Qtd:</span> {item.quantidade}
                              </div>
                              <div className="text-slate-600">
                                <span className="font-medium">Entrega:</span>{' '}
                                {item.data_entrega ? (
                                  <>
                                    {format(new Date(item.data_entrega), 'dd/MM/yy')}
                                    {new Date(item.data_entrega) < new Date() && (
                                      <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />
                                    )}
                                  </>
                                ) : '-'}
                              </div>
                              <div className="text-slate-600">
                                <span className="font-medium">Entrada:</span>{' '}
                                {item.data_entrada_etapa ? format(new Date(item.data_entrada_etapa), 'dd/MM HH:mm', { locale: ptBR }) : '-'}
                              </div>
                              <div className="text-slate-600">
                                <span className="font-medium">Responsável:</span> {item.responsavel_op || '-'}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => abrirDialogExpedicao(item)}
                                disabled={loadingItem === item.id}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Enviar p/ Expedição
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
                    </div>

                    {/* Distribuição por Etapa - Todos os Itens */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Distribuição por Etapa - Todos os Itens da OP
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {['comercial', 'engenharia', 'modelagem', 'suprimentos', 'fundicao', 'usinagem', 'liberacao', 'expedicao'].map(etapa => {
                          const count = todosItensOP.filter(i => i.etapa_atual === etapa).length;
                          const etapaLabels = {
                            comercial: 'Comercial',
                            engenharia: 'Engenharia',
                            modelagem: 'Modelagem',
                            suprimentos: 'Suprimentos',
                            fundicao: 'Fundição',
                            usinagem: 'Usinagem',
                            liberacao: 'Liberação',
                            expedicao: 'Expedição'
                          };
                          return count > 0 ? (
                            <div key={etapa} className="bg-slate-100 rounded p-2 text-center">
                              <p className="text-xs text-slate-600 mb-1">{etapaLabels[etapa]}</p>
                              <p className="text-lg font-bold text-slate-800">{count}</p>
                            </div>
                          ) : null;
                        })}
                      </div>

                      {/* Lista de Outros Itens */}
                      {todosItensOP.filter(i => i.etapa_atual !== 'liberacao').length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-600 mb-2">Outros Itens ({todosItensOP.filter(i => i.etapa_atual !== 'liberacao').length})</h4>
                          <div className="space-y-2">
                            {todosItensOP.filter(i => i.etapa_atual !== 'liberacao').map((item) => (
                              <div key={item.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800 text-sm">{item.descricao}</p>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                                      <span>Código: {item.codigo_ga || '-'}</span>
                                      <span>Qtd: {item.quantidade}</span>
                                      <span>Peso: {item.peso ? `${item.peso} kg` : '-'}</span>
                                    </div>
                                  </div>
                                  <Badge className="bg-slate-200 text-slate-700 text-xs">
                                    {item.etapa_atual}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Expedição */}
      <Dialog open={expedicaoDialogOpen} onOpenChange={setExpedicaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para Expedição</DialogTitle>
            <DialogDescription>Informe o Peso e Volume do item para expedição</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Peso (kg) *</Label>
              <div className="relative mt-1">
                <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  value={pesoExpedicao}
                  onChange={(e) => setPesoExpedicao(e.target.value)}
                  placeholder="Ex: 150.5"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Volume *</Label>
              <div className="relative mt-1">
                <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={volumeExpedicao}
                  onChange={(e) => setVolumeExpedicao(e.target.value)}
                  placeholder="Ex: 2m³ ou 100x50x30cm"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setExpedicaoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={enviarParaExpedicao} disabled={loadingItem} className="bg-emerald-600 hover:bg-emerald-700">
                Enviar para Expedição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Retorno */}
      <Dialog open={retornarDialogOpen} onOpenChange={setRetornarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Item</DialogTitle>
            <DialogDescription>Selecione a etapa e informe a justificativa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Etapa de Destino *</Label>
              <Select value={selectedEtapa} onValueChange={setSelectedEtapa}>
                <SelectTrigger className="mt-1">
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
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <input
                type="checkbox"
                id="alertaRetorno"
                checked={alertaRetorno}
                onChange={(e) => setAlertaRetorno(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded"
              />
              <label htmlFor="alertaRetorno" className="text-sm text-slate-700 cursor-pointer flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-medium">Marcar como Alerta de Retorno (item aparecerá em destaque vermelho)</span>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRetornarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarRetorno} disabled={!selectedEtapa || loadingItem} className="bg-amber-600 hover:bg-amber-700">
                Confirmar Retorno
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}