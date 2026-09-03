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
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { updateOPStatus } from './UpdateOPStatus';

/**
 * RetornarItemVolumeDialog — retorna um único item de dentro de um volume
 * (sem retornar o volume inteiro). Desvincula o item do volume, recalcula o
 * peso do volume e exclui o volume se ficar vazio.
 *
 * Props:
 *  - open / onOpenChange
 *  - item: ItemOP a retornar
 *  - volume: VolumeExpedicao ao qual o item pertence
 *  - etapaOrigem: etapa atual do item ('coleta' | 'expedicao')
 *  - etapaDestino: etapa de destino ('expedicao' | 'liberacao')
 *  - destinoLabel: rótulo legível do destino (ex.: 'Expedição', 'Liberação')
 *  - currentUser: usuário logado
 *  - onSuccess: callback após retorno
 */
export default function RetornarItemVolumeDialog({
  open,
  onOpenChange,
  item,
  volume,
  etapaOrigem,
  etapaDestino,
  destinoLabel,
  currentUser,
  onSuccess,
}) {
  const [justificativa, setJustificativa] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const invalidarQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['itens-coleta'] });
    queryClient.invalidateQueries({ queryKey: ['volumes-coleta'] });
    queryClient.invalidateQueries({ queryKey: ['itens-expedicao'] });
    queryClient.invalidateQueries({ queryKey: ['volumes-expedicao'] });
    queryClient.invalidateQueries({ queryKey: ['ops-all'] });
    queryClient.invalidateQueries({ queryKey: ['todos-itens-ops'] });
  };

  const handleRetornar = async () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória');
      return;
    }
    if (!item || !volume) return;

    setLoading(true);
    try {
      const agora = new Date().toISOString();

      // 1) Retornar o item e desvincular do volume
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: etapaDestino,
        data_entrada_etapa: agora,
        retornado: true,
        justificativa_retorno: justificativa.trim(),
        volume_id: null,
      });

      // 2) Histórico de movimentação
      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: etapaOrigem,
        setor_destino: etapaDestino,
        justificativa: `Retorno item do volume ${volume.numero_volume}: ${justificativa.trim()}`,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
        data_movimentacao: agora,
      });

      // 3) Ajustar o volume: remover o item, recalcular peso, excluir se vazio
      const novosIds = (volume.itens_ids || []).filter(id => id !== item.id);
      if (novosIds.length === 0) {
        await base44.entities.VolumeExpedicao.delete(volume.id);
      } else {
        const itensDoVolume = await base44.entities.ItemOP.filter({ volume_id: volume.id });
        const itensRestantes = itensDoVolume.filter(i => i.etapa_atual !== 'cancelado' && i.id !== item.id);
        const pesoTotal = itensRestantes.reduce((s, i) => s + (i.peso || 0) * (i.quantidade || 1), 0);
        await base44.entities.VolumeExpedicao.update(volume.id, {
          itens_ids: novosIds,
          peso_total_itens: pesoTotal,
        });
      }

      // 4) Recalcular status da OP
      await updateOPStatus(item.op_id);

      invalidarQueries();
      toast.success(`Item retornado para ${destinoLabel}${novosIds.length === 0 ? ' (volume excluído)' : ''}`);
      setJustificativa('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao retornar item');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setJustificativa('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <RotateCcw className="w-5 h-5" />
            Retornar Item do Volume
          </DialogTitle>
          <DialogDescription>
            Somente este item será retornado para {destinoLabel}. Os demais itens do volume permanecem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Resumo */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p><span className="text-amber-700 font-medium">Volume:</span> {volume?.numero_volume}</p>
            <div className="mt-1 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-amber-800">{item?.descricao}</span>
              <Badge variant="outline" className="text-xs">{etapaOrigem}</Badge>
            </div>
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {volume && (volume.itens_ids || []).length <= 1
                ? 'Este é o único item do volume — o volume será excluído.'
                : 'O item será desvinculado do volume; o volume permanece com os demais itens.'}
            </p>
          </div>

          {/* Justificativa */}
          <div>
            <Label>
              Justificativa <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo do retorno deste item..."
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
              onClick={handleRetornar}
              disabled={loading || !justificativa.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {loading ? 'Retornando...' : `Retornar p/ ${destinoLabel}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}