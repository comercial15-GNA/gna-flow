import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, Weight, Box, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function CriarVolumeDialog({ open, onOpenChange, op, itensLiberacao, currentUser, onSuccess }) {
  const [step, setStep] = useState(1); // 1 = selecionar itens, 2 = preencher peso/volume
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [pesoExpedicao, setPesoExpedicao] = useState('');
  const [volumeExpedicao, setVolumeExpedicao] = useState('');
  const [loading, setLoading] = useState(false);

  // Itens disponíveis = itens desta OP na etapa liberação SEM volume
  const itensDisponiveis = itensLiberacao.filter(i => !i.volume_id);

  const pesoTotalItens = useMemo(() => {
    return itensSelecionados.reduce((sum, id) => {
      const item = itensDisponiveis.find(i => i.id === id);
      return sum + ((item?.peso || 0) * (item?.quantidade || 1));
    }, 0);
  }, [itensSelecionados, itensDisponiveis]);

  const toggleItem = (itemId) => {
    setItensSelecionados(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleProximo = () => {
    if (itensSelecionados.length < 2) {
      toast.error('Selecione pelo menos 2 itens para criar um volume');
      return;
    }
    setPesoExpedicao(pesoTotalItens.toFixed(2));
    setStep(2);
  };

  const handleCriar = async () => {
    if (!pesoExpedicao || !volumeExpedicao) {
      toast.error('Peso e Volume são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const agora = new Date();
      const agoraISO = agora.toISOString();
      const numeroVolume = `VOL-${op.numero_op}-${agora.getTime().toString().slice(-6)}`;

      // Criar o volume já na etapa expedição
      const volume = await base44.entities.VolumeExpedicao.create({
        numero_volume: numeroVolume,
        op_id: op.id,
        numero_op: op.numero_op,
        cliente: op.cliente,
        descricao: descricao || `Volume - ${op.numero_op}`,
        itens_ids: itensSelecionados,
        peso_total_itens: pesoTotalItens,
        peso_expedicao: parseFloat(pesoExpedicao),
        volume_expedicao: volumeExpedicao,
        etapa_atual: 'expedicao',
        criado_por_email: currentUser?.email,
        criado_por_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
      });

      // Mover os itens para expedição e vincular ao volume
      await Promise.all(
        itensSelecionados.map(itemId => {
          const item = itensDisponiveis.find(i => i.id === itemId);
          return base44.entities.ItemOP.update(itemId, {
            volume_id: volume.id,
            etapa_atual: 'expedicao',
            data_entrada_etapa: agoraISO,
            peso_expedicao: parseFloat(pesoExpedicao),
            volume_expedicao: volumeExpedicao,
            retornado: false,
            justificativa_retorno: '',
          });
        })
      );

      // Registrar histórico para cada item
      await Promise.all(
        itensSelecionados.map(itemId => {
          const item = itensDisponiveis.find(i => i.id === itemId);
          return base44.entities.HistoricoMovimentacao.create({
            item_id: itemId,
            op_id: op.id,
            numero_op: op.numero_op,
            descricao_item: item?.descricao || '',
            setor_origem: 'liberacao',
            setor_destino: 'expedicao',
            justificativa: `Criação do volume ${numeroVolume}`,
            usuario_email: currentUser?.email,
            usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
            data_movimentacao: agoraISO,
          });
        })
      );

      toast.success(`Volume ${numeroVolume} criado e enviado para Expedição com ${itensSelecionados.length} itens`);
      onSuccess();
      handleClose();
    } catch (error) {
      toast.error('Erro ao criar volume');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setItensSelecionados([]);
    setDescricao('');
    setPesoExpedicao('');
    setVolumeExpedicao('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Criar Volume/Palete — {op?.numero_op}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Selecione os itens desta OP para agrupar no volume'
              : 'Informe o peso e volume do palete'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div>
              <Label>Descrição do Volume (opcional)</Label>
              <Input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Palete 1 - Itens fundidos"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="mb-2 block">
                Itens disponíveis ({itensDisponiveis.length})
                {itensSelecionados.length > 0 && (
                  <Badge className="ml-2 bg-emerald-100 text-emerald-800">
                    {itensSelecionados.length} selecionados
                  </Badge>
                )}
              </Label>

              {itensDisponiveis.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm">Todos os itens já estão em um volume</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {itensDisponiveis.map(item => {
                    const isAtrasado = item.data_entrega && new Date(item.data_entrega) < new Date();
                    const checked = itensSelecionados.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          checked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm">{item.descricao}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                            <span>GA: {item.codigo_ga || '-'}</span>
                            <span>Qtd: {item.quantidade}</span>
                            <span>Peso: {item.peso ? `${item.peso} kg/un` : '-'}</span>
                            {item.data_entrega && (
                              <span className={isAtrasado ? 'text-red-600 font-semibold' : ''}>
                                Entrega: {format(parseISO(item.data_entrega), 'dd/MM/yy')}
                                {isAtrasado && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-700 shrink-0">
                          {item.peso ? `${((item.peso || 0) * (item.quantidade || 1)).toFixed(2)} kg` : '-'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {itensSelecionados.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-emerald-800">Peso total dos itens selecionados:</span>
                  <span className="text-lg font-bold text-emerald-900">{pesoTotalItens.toFixed(2)} kg</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleProximo}
                disabled={itensSelecionados.length < 2}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Próximo →
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 pt-2">
            {/* Resumo dos itens */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-700 mb-2">Itens no volume ({itensSelecionados.length}):</p>
              <div className="space-y-1">
                {itensSelecionados.map(id => {
                  const item = itensDisponiveis.find(i => i.id === id);
                  return (
                    <div key={id} className="flex justify-between text-sm">
                      <span className="text-slate-700">{item?.descricao}</span>
                      <span className="text-slate-500">{((item?.peso || 0) * (item?.quantidade || 1)).toFixed(2)} kg</span>
                    </div>
                  );
                })}
                <div className="border-t border-slate-300 pt-1 mt-1 flex justify-between font-semibold text-sm">
                  <span className="text-slate-800">Subtotal itens</span>
                  <span className="text-slate-800">{pesoTotalItens.toFixed(2)} kg</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Peso total do palete (kg) *</Label>
              <p className="text-xs text-slate-500 mb-1">Pré-preenchido com a soma dos itens. Ajuste se necessário.</p>
              <div className="relative mt-1">
                <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  value={pesoExpedicao}
                  onChange={e => setPesoExpedicao(e.target.value)}
                  placeholder="Ex: 150.5"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>Volume/Dimensões do Palete *</Label>
              <div className="relative mt-1">
                <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={volumeExpedicao}
                  onChange={e => setVolumeExpedicao(e.target.value)}
                  placeholder="Ex: 1 Palete 120x100x80cm"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button
                  onClick={handleCriar}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? 'Criando...' : 'Criar Volume e Enviar p/ Expedição'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}