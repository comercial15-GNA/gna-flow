import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Truck, Search, Package, RotateCcw, Check, FileText,
  ExternalLink, FileSpreadsheet, Info, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ItemOPActions from '@/components/producao/ItemOPActions';
import { updateOPStatus } from '@/components/producao/UpdateOPStatus';
import VolumeCard from '@/components/expedicao/VolumeCard';

export default function Expedicao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);
  const [loadingVolume, setLoadingVolume] = useState(null);
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const [retornarVolumeDialogOpen, setRetornarVolumeDialogOpen] = useState(false);
  const [coletaVolumeDialogOpen, setColetaVolumeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVolume, setSelectedVolume] = useState(null);
  const [selectedVolumeItens, setSelectedVolumeItens] = useState([]);
  const [justificativa, setJustificativa] = useState('');
  const [informacoes, setInformacoes] = useState('');
  const [informacoesVolume, setInformacoesVolume] = useState('');
  const [expandedOPs, setExpandedOPs] = useState({});
  const queryClient = useQueryClient();

  const toggleOP = (opId) => setExpandedOPs(prev => ({ ...prev, [opId]: !prev[opId] }));

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-expedicao'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'expedicao' });
      return items.sort((a, b) => {
        if (!a.data_entrega) return 1;
        if (!b.data_entrega) return -1;
        return new Date(a.data_entrega) - new Date(b.data_entrega);
      });
    }
  });

  const { data: volumes = [] } = useQuery({
    queryKey: ['volumes-expedicao'],
    queryFn: () => base44.entities.VolumeExpedicao.filter({ etapa_atual: 'expedicao' }),
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-all'],
    queryFn: () => base44.entities.OrdemProducao.list('data_lancamento')
  });

  const { data: todosItens = [] } = useQuery({
    queryKey: ['todos-itens-ops'],
    queryFn: () => base44.entities.ItemOP.list()
  });

  const getArquivos = (opId) => ops.find(o => o.id === opId)?.arquivos || [];

  const invalidarQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['itens-expedicao'] });
    queryClient.invalidateQueries({ queryKey: ['volumes-expedicao'] });
    queryClient.invalidateQueries({ queryKey: ['ops-all'] });
    queryClient.invalidateQueries({ queryKey: ['todos-itens-ops'] });
  };

  // --- Item individual: enviar para coleta ---
  const abrirDialogFinalizar = (item) => {
    setSelectedItem(item);
    setInformacoes(item.informacoes_expedicao || '');
    setFinalizarDialogOpen(true);
  };

  const finalizarItem = async () => {
    setLoadingItem(selectedItem.id);
    try {
      await base44.entities.ItemOP.update(selectedItem.id, {
        etapa_atual: 'coleta',
        data_entrada_etapa: new Date().toISOString(),
        informacoes_expedicao: informacoes
      });
      await base44.entities.HistoricoMovimentacao.create({
        item_id: selectedItem.id,
        op_id: selectedItem.op_id,
        numero_op: selectedItem.numero_op,
        descricao_item: selectedItem.descricao,
        setor_origem: 'expedicao',
        setor_destino: 'coleta',
        justificativa: informacoes || '',
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });
      await updateOPStatus(selectedItem.op_id);
      invalidarQueries();
      toast.success('Item enviado para Coleta');
      setFinalizarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao enviar item');
    } finally {
      setLoadingItem(null);
    }
  };

  // --- Item individual: retornar para liberação ---
  const abrirDialogRetorno = (item) => {
    setSelectedItem(item);
    setJustificativa('');
    setRetornarDialogOpen(true);
  };

  const confirmarRetorno = async () => {
    if (!justificativa.trim()) { toast.error('Justificativa é obrigatória'); return; }
    setLoadingItem(selectedItem.id);
    try {
      await base44.entities.ItemOP.update(selectedItem.id, {
        etapa_atual: 'liberacao',
        data_entrada_etapa: new Date().toISOString(),
        retornado: true,
        justificativa_retorno: justificativa
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
        usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });
      await updateOPStatus(selectedItem.op_id);
      invalidarQueries();
      toast.success('Item retornado para Liberação');
      setRetornarDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao retornar item');
    } finally {
      setLoadingItem(null);
    }
  };

  // --- Volume: enviar para coleta ---
  const abrirColetaVolume = (volume, itensDoVolume) => {
    setSelectedVolume(volume);
    setSelectedVolumeItens(itensDoVolume);
    setInformacoesVolume(volume.informacoes_expedicao || '');
    setColetaVolumeDialogOpen(true);
  };

  const confirmarColetaVolume = async () => {
    if (!selectedVolume) return;
    setLoadingVolume(selectedVolume.id);
    try {
      const agora = new Date().toISOString();
      // Mover todos os itens para coleta
      await Promise.all(
        selectedVolumeItens.map(item =>
          base44.entities.ItemOP.update(item.id, {
            etapa_atual: 'coleta',
            data_entrada_etapa: agora,
            informacoes_expedicao: informacoesVolume,
          })
        )
      );
      // Registrar histórico para cada item
      await Promise.all(
        selectedVolumeItens.map(item =>
          base44.entities.HistoricoMovimentacao.create({
            item_id: item.id,
            op_id: item.op_id,
            numero_op: item.numero_op,
            descricao_item: item.descricao,
            setor_origem: 'expedicao',
            setor_destino: 'coleta',
            justificativa: `Volume: ${selectedVolume.numero_volume}. ${informacoesVolume || ''}`,
            usuario_email: currentUser?.email,
            usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
            data_movimentacao: agora,
          })
        )
      );
      // Atualizar volume
      await base44.entities.VolumeExpedicao.update(selectedVolume.id, {
        etapa_atual: 'coleta',
        informacoes_expedicao: informacoesVolume,
      });
      await updateOPStatus(selectedVolume.op_id);
      invalidarQueries();
      toast.success(`Volume ${selectedVolume.numero_volume} enviado para Coleta`);
      setColetaVolumeDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao enviar volume');
    } finally {
      setLoadingVolume(null);
    }
  };

  // --- Volume: retornar para liberação (desfaz o volume) ---
  const abrirRetornarVolume = (volume, itensDoVolume) => {
    setSelectedVolume(volume);
    setSelectedVolumeItens(itensDoVolume);
    setJustificativa('');
    setRetornarVolumeDialogOpen(true);
  };

  const confirmarRetornarVolume = async () => {
    if (!justificativa.trim()) { toast.error('Justificativa é obrigatória'); return; }
    if (!selectedVolume) return;
    setLoadingVolume(selectedVolume.id);
    try {
      const agora = new Date().toISOString();
      // Retornar todos os itens para liberação e desvincular do volume
      await Promise.all(
        selectedVolumeItens.map(item =>
          base44.entities.ItemOP.update(item.id, {
            etapa_atual: 'liberacao',
            data_entrada_etapa: agora,
            retornado: true,
            justificativa_retorno: justificativa,
            volume_id: null,
          })
        )
      );
      // Registrar histórico
      await Promise.all(
        selectedVolumeItens.map(item =>
          base44.entities.HistoricoMovimentacao.create({
            item_id: item.id,
            op_id: item.op_id,
            numero_op: item.numero_op,
            descricao_item: item.descricao,
            setor_origem: 'expedicao',
            setor_destino: 'liberacao',
            justificativa: `Retorno do Volume ${selectedVolume.numero_volume}: ${justificativa}`,
            usuario_email: currentUser?.email,
            usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
            data_movimentacao: agora,
          })
        )
      );
      // Deletar o volume (foi desfeito)
      await base44.entities.VolumeExpedicao.delete(selectedVolume.id);
      await updateOPStatus(selectedVolume.op_id);
      invalidarQueries();
      toast.success(`Volume ${selectedVolume.numero_volume} retornado para Liberação e desfeito`);
      setRetornarVolumeDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao retornar volume');
    } finally {
      setLoadingVolume(null);
    }
  };

  const gerarRelatorio = () => {
    const dados = itens.map(item => ({
      'OP': item.numero_op, 'Descrição': item.descricao,
      'Código GA': item.codigo_ga || '-', 'Quantidade': item.quantidade,
      'Cliente': item.cliente, 'Peso Expedição (kg)': item.peso_expedicao || '-',
      'Volume': item.volume_expedicao || '-',
      'Volume ID': item.volume_id || '-',
      'Data Entrega': item.data_entrega ? format(parseISO(item.data_entrega), 'dd/MM/yyyy') : '-',
    }));
    if (dados.length === 0) { toast.error('Nenhum dado para exportar'); return; }
    const headers = Object.keys(dados[0]).join(';');
    const rows = dados.map(row => Object.values(row).join(';')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_expedicao_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  // Agrupar OPs
  const opsComItensExpedicao = ops.filter(op => {
    const itensOP = itens.filter(i => i.op_id === op.id);
    const volumesOP = volumes.filter(v => v.op_id === op.id);
    if (itensOP.length === 0 && volumesOP.length === 0) return false;
    if (searchTerm) {
      const matchOP = op.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchItens = itensOP.some(item =>
        item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo_ga?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return matchOP || matchItens;
    }
    return true;
  }).map(op => {
    const todosItensOP = todosItens.filter(i => i.op_id === op.id);
    const itensExpedicao = itens.filter(i => i.op_id === op.id);
    const volumesOP = volumes.filter(v => v.op_id === op.id);
    return { op, todosItensOP, itensExpedicao, volumesOP };
  }).sort((a, b) => {
    const dataA = Math.min(...a.itensExpedicao.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity));
    const dataB = Math.min(...b.itensExpedicao.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity));
    return dataA - dataB;
  });

  const totalItensIndividuais = itens.filter(i => !i.volume_id).length;

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
            {totalItensIndividuais} itens individuais • {volumes.length} volumes • {opsComItensExpedicao.length} OPs
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
          <Input placeholder="Buscar por OP, cliente ou item..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : opsComItensExpedicao.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhuma OP com itens em Expedição</h3>
          <p className="text-slate-500">Todas as OPs foram processadas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {opsComItensExpedicao.map(({ op, todosItensOP, itensExpedicao, volumesOP }) => {
            const arquivos = getArquivos(op.id);
            const isExpanded = expandedOPs[op.id];
            const itensSemVolume = itensExpedicao.filter(i => !i.volume_id);

            return (
              <div key={op.id} className="bg-white rounded-xl border-2 border-teal-200 shadow-sm overflow-hidden">
                <button onClick={() => toggleOP(op.id)}
                  className="w-full bg-teal-50 border-b border-teal-200 p-4 hover:bg-teal-100 transition-colors text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-lg font-bold text-slate-800">{op.numero_op}</h3>
                          <span className="text-sm text-slate-600">{op.equipamento_principal}</span>
                        </div>
                        {op.ordem_compra && (
                          <Badge variant="outline" className="text-blue-700 border-blue-300">O.C: {op.ordem_compra}</Badge>
                        )}
                        <Badge className="bg-teal-600 text-white">{itensExpedicao.length} em Expedição</Badge>
                        {volumesOP.length > 0 && (
                          <Badge className="bg-blue-600 text-white">{volumesOP.length} volume(s)</Badge>
                        )}
                        <Badge variant="outline" className="text-slate-600">Total: {todosItensOP.length} itens</Badge>
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

                {isExpanded && (
                  <div className="p-4">
                    {arquivos.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-slate-200">
                        <p className="text-sm font-medium text-slate-700 mb-2">Arquivos da OP:</p>
                        <div className="flex flex-wrap gap-2">
                          {arquivos.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded text-sm text-blue-600 hover:bg-slate-200">
                              <FileText className="w-4 h-4" />Arquivo {idx + 1}<ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Volumes */}
                    {volumesOP.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Volumes/Paletes ({volumesOP.length})
                        </h4>
                        <div className="space-y-3">
                          {volumesOP.map(volume => {
                            const itensDoVolume = itensExpedicao.filter(i => i.volume_id === volume.id);
                            return (
                              <VolumeCard
                                key={volume.id}
                                volume={volume}
                                itensDoVolume={itensDoVolume}
                                etapaAtual="expedicao"
                                onAcao={abrirColetaVolume}
                                onRetornar={abrirRetornarVolume}
                                loadingVolume={loadingVolume}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Itens individuais */}
                    {itensSemVolume.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-teal-700 mb-3 flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Itens Individuais ({itensSemVolume.length})
                        </h4>
                        <div className="space-y-3">
                          {itensSemVolume.map(item => (
                            <div key={item.id} className="bg-teal-50 rounded-lg border-2 border-teal-300 p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-semibold text-slate-800 mb-1">{item.descricao}</p>
                                  <p className="text-xs text-slate-500">Código GA: {item.codigo_ga || '-'}</p>
                                </div>
                              </div>
                              <ItemOPActions item={item} onUpdate={invalidarQueries} />
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3 text-sm">
                                <div className="text-slate-600"><span className="font-medium">Qtd:</span> {item.quantidade}</div>
                                <div className="text-slate-600">
                                  <span className="font-medium">Entrega:</span>{' '}
                                  {item.data_entrega ? format(parseISO(item.data_entrega), 'dd/MM/yy') : '-'}
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
                                <Button size="sm" onClick={() => abrirDialogFinalizar(item)} disabled={loadingItem === item.id}
                                  className="bg-teal-600 hover:bg-teal-700">
                                  <Check className="w-3 h-3 mr-1" />Enviar p/ Coleta
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => abrirDialogRetorno(item)} disabled={loadingItem === item.id}
                                  className="text-amber-600 border-amber-300 hover:bg-amber-50">
                                  <RotateCcw className="w-3 h-3 mr-1" />Retornar p/ Liberação
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outros Itens da OP */}
                    {todosItensOP.filter(i => i.etapa_atual !== 'expedicao').length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-600 mb-2">
                          Outros Itens ({todosItensOP.filter(i => i.etapa_atual !== 'expedicao').length})
                        </h4>
                        <div className="space-y-2">
                          {todosItensOP.filter(i => i.etapa_atual !== 'expedicao').map(item => (
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
                                <Badge className="bg-slate-200 text-slate-700 text-xs">{item.etapa_atual}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: enviar item individual p/ coleta */}
      <Dialog open={finalizarDialogOpen} onOpenChange={setFinalizarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para Coleta</DialogTitle>
            <DialogDescription>Adicione informações adicionais da coleta</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Informações Adicionais</Label>
              <div className="relative mt-1">
                <Info className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Textarea value={informacoes} onChange={e => setInformacoes(e.target.value)}
                  placeholder="Observações, número de NF, transportadora, etc." className="pl-10" rows={4} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setFinalizarDialogOpen(false)}>Cancelar</Button>
              <Button onClick={finalizarItem} disabled={!!loadingItem} className="bg-teal-600 hover:bg-teal-700">
                <Check className="w-4 h-4 mr-2" />Enviar p/ Coleta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: enviar volume p/ coleta */}
      <Dialog open={coletaVolumeDialogOpen} onOpenChange={setColetaVolumeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Volume para Coleta</DialogTitle>
            <DialogDescription>
              {selectedVolume?.numero_volume} — {selectedVolumeItens.length} itens serão movidos para Coleta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Informações Adicionais (opcional)</Label>
              <div className="relative mt-1">
                <Info className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Textarea value={informacoesVolume} onChange={e => setInformacoesVolume(e.target.value)}
                  placeholder="NF, transportadora, instruções de coleta..." className="pl-10" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setColetaVolumeDialogOpen(false)}>Cancelar</Button>
              <Button onClick={confirmarColetaVolume} disabled={!!loadingVolume} className="bg-teal-600 hover:bg-teal-700">
                <Check className="w-4 h-4 mr-2" />Confirmar Coleta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: retornar item individual */}
      <Dialog open={retornarDialogOpen} onOpenChange={setRetornarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar para Liberação</DialogTitle>
            <DialogDescription>Informe a justificativa do retorno</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Justificativa *</Label>
              <Textarea value={justificativa} onChange={e => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo do retorno..." className="mt-1" rows={4} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRetornarDialogOpen(false)}>Cancelar</Button>
              <Button onClick={confirmarRetorno} disabled={!!loadingItem} className="bg-amber-600 hover:bg-amber-700">
                Confirmar Retorno
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: retornar volume (desfaz) */}
      <Dialog open={retornarVolumeDialogOpen} onOpenChange={setRetornarVolumeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Volume para Liberação</DialogTitle>
            <DialogDescription>
              Todos os {selectedVolumeItens.length} itens do volume {selectedVolume?.numero_volume} serão retornados para Liberação e o volume será desfeito.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Justificativa *</Label>
              <Textarea value={justificativa} onChange={e => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo do retorno..." className="mt-1" rows={4} />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRetornarVolumeDialogOpen(false)}>Cancelar</Button>
              <Button onClick={confirmarRetornarVolume} disabled={!!loadingVolume} className="bg-amber-600 hover:bg-amber-700">
                Confirmar Retorno e Desfazer Volume
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}