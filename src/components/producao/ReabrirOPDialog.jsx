import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { updateOPStatus } from './UpdateOPStatus';

const ETAPAS_DESTINO = [
  { value: 'coleta', label: 'Coleta' },
  { value: 'expedicao', label: 'Expedição' },
  { value: 'liberacao', label: 'Liberação' },
  { value: 'montagem', label: 'Montagem' },
  { value: 'suporte_industrial', label: 'Suporte Industrial' },
  { value: 'caldeiraria', label: 'Caldeiraria' },
  { value: 'usinagem', label: 'Usinagem' },
  { value: 'acabamento', label: 'Acabamento' },
  { value: 'fundicao', label: 'Fundição' },
  { value: 'suprimentos', label: 'Suprimentos' },
  { value: 'modelagem', label: 'Modelagem' },
  { value: 'engenharia', label: 'Engenharia' },
];

/**
 * ReabrirOPDialog — reverte uma finalização feita por engano.
 *
 * Props:
 *  - open / onOpenChange
 *  - op: objeto OrdemProducao
 *  - item: objeto ItemOP (se definido, reabre apenas o item; caso contrário, reabre a OP inteira)
 *  - itensOP: array de ItemOP da OP (usado quando reabre OP inteira)
 *  - currentUser: usuário logado
 *  - onSuccess: callback após reabertura
 */
export default function ReabrirOPDialog({ open, onOpenChange, op, item, itensOP = [], currentUser, onSuccess }) {
  const [etapaDestino, setEtapaDestino] = useState('coleta');
  const [justificativa, setJustificativa] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const modoItem = !!item;
  const titulo = modoItem
    ? `Reabrir Item: ${item?.descricao}`
    : `Reabrir OP: ${op?.numero_op}`;
  const descricao = modoItem
    ? 'O item finalizado voltará para a etapa escolhida. Esta ação ficará registrada no histórico.'
    : 'Todos os itens finalizados da OP voltarão para a etapa escolhida. Esta ação ficará registrada no histórico.';

  const itensReabrir = modoItem
    ? [item]
    : itensOP.filter(i => i.etapa_atual === 'finalizado');

  const invalidarQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['ops-comercial'] });
    queryClient.invalidateQueries({ queryKey: ['itens-all'] });
    queryClient.invalidateQueries({ queryKey: ['ops-all'] });
    queryClient.invalidateQueries({ queryKey: ['ops-admin'] });
    queryClient.invalidateQueries({ queryKey: ['itens-admin'] });
    queryClient.invalidateQueries({ queryKey: ['volumes-expedicao'] });
    queryClient.invalidateQueries({ queryKey: ['itens-expedicao'] });
    queryClient.invalidateQueries({ queryKey: ['volumes-coleta'] });
    queryClient.invalidateQueries({ queryKey: ['itens-coleta'] });
  };

  const handleReabrir = async () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória para a reabertura');
      return;
    }
    if (itensReabrir.length === 0) {
      toast.info('Não há itens finalizados para reabrir');
      return;
    }

    setLoading(true);
    try {
      const agora = new Date().toISOString();
      const idsReabertos = itensReabrir.map(i => i.id);

      // 1) Reabrir itens (bulkUpdate) com retornado + justificativa (dispara alerta na etapa destino)
      await base44.entities.ItemOP.bulkUpdate(
        itensReabrir.map(i => ({
          id: i.id,
          etapa_atual: etapaDestino,
          data_entrada_etapa: agora,
          retornado: true,
          justificativa_retorno: `Reabertura: ${justificativa.trim()}`,
        }))
      );

      // 2) Histórico de movimentação para cada item
      await Promise.all(
        itensReabrir.map(item =>
          base44.entities.HistoricoMovimentacao.create({
            item_id: item.id,
            op_id: item.op_id,
            numero_op: item.numero_op,
            descricao_item: item.descricao,
            setor_origem: 'finalizado',
            setor_destino: etapaDestino,
            justificativa: `Reabertura: ${justificativa.trim()}`,
            usuario_email: currentUser?.email,
            usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
            data_movimentacao: agora,
          })
        )
      );

      // 3) Reabrir volumes finalizados que continham itens reabertos
      if (op) {
        const volumes = await base44.entities.VolumeExpedicao.filter({ op_id: op.id });
        await Promise.all(
          volumes
            .filter(v => v.etapa_atual === 'finalizado' && (v.itens_ids || []).some(id => idsReabertos.includes(id)))
            .map(v => base44.entities.VolumeExpedicao.update(v.id, { etapa_atual: 'coleta' }))
        );

        // 4) Recalcular status da OP
        await updateOPStatus(op.id);
      }

      invalidarQueries();
      toast.success(modoItem ? 'Item reaberto com sucesso' : `OP ${op?.numero_op} reaberta com ${itensReabrir.length} ${itensReabrir.length === 1 ? 'item' : 'itens'}`);
      setJustificativa('');
      setEtapaDestino('coleta');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao reabrir');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setJustificativa('');
      setEtapaDestino('coleta');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <RotateCcw className="w-5 h-5" />
            {titulo}
          </DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Resumo */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            {op && (
              <>
                <p><span className="text-amber-700 font-medium">OP:</span> {op.numero_op}</p>
                <p><span className="text-amber-700 font-medium">Cliente:</span> {op.cliente}</p>
                <p><span className="text-amber-700 font-medium">Equipamento:</span> {op.equipamento_principal}</p>
              </>
            )}
            {modoItem ? (
              <div className="mt-1 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800">{item?.descricao}</span>
                <Badge variant="outline" className="text-xs">finalizado</Badge>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-amber-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {itensReabrir.length} {itensReabrir.length === 1 ? 'item finalizado será reaberto' : 'itens finalizados serão reabertos'}
                </p>
                {itensReabrir.length < itensOP.length && (
                  <p className="text-xs text-amber-600 mt-1">
                    {itensOP.length - itensReabrir.length} {itensOP.length - itensReabrir.length === 1 ? 'item não está finalizado' : 'itens não estão finalizados'} e não serão alterados.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Etapa de destino */}
          <div>
            <Label>Etapa de destino <span className="text-red-500">*</span></Label>
            <Select value={etapaDestino} onValueChange={setEtapaDestino} disabled={loading}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ETAPAS_DESTINO.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justificativa */}
          <div>
            <Label>
              Justificativa da Reabertura <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo da reabertura (finalizado por engano)..."
              className="mt-1"
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Voltar
            </Button>
            <Button
              onClick={handleReabrir}
              disabled={loading || !justificativa.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {loading ? 'Reabrindo...' : modoItem ? 'Reabrir Item' : 'Reabrir OP'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}