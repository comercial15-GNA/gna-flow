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
import { Ban, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * CancelarOPDialog — cancela uma OP inteira ou um único item.
 *
 * Props:
 *  - open / onOpenChange
 *  - op: objeto OrdemProducao
 *  - item: objeto ItemOP (se definido, cancela apenas o item; caso contrário, cancela a OP toda)
 *  - itensOP: array de ItemOP da OP (usado quando cancela OP inteira)
 *  - currentUser: usuário logado
 *  - onSuccess: callback após cancelamento
 */
export default function CancelarOPDialog({ open, onOpenChange, op, item, itensOP = [], currentUser, onSuccess }) {
  const [justificativa, setJustificativa] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const modoItem = !!item;
  const titulo = modoItem
    ? `Cancelar Item: ${item?.descricao}`
    : `Cancelar OP: ${op?.numero_op}`;
  const descricao = modoItem
    ? 'O item será marcado como cancelado. Esta ação ficará registrada no histórico.'
    : 'Todos os itens da OP serão marcados como cancelados. Esta ação ficará registrada no histórico.';

  const itensCancelar = modoItem
    ? [item]
    : itensOP.filter(i => i.etapa_atual !== 'cancelado' && i.etapa_atual !== 'finalizado');

  const handleCancelar = async () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória para o cancelamento');
      return;
    }

    setLoading(true);
    try {
      // Cancelar cada item
      await Promise.all(itensCancelar.map(async (it) => {
        await base44.entities.ItemOP.update(it.id, {
          etapa_atual: 'cancelado',
          data_entrada_etapa: new Date().toISOString(),
        });

        await base44.entities.HistoricoMovimentacao.create({
          item_id: it.id,
          op_id: it.op_id,
          numero_op: it.numero_op,
          descricao_item: it.descricao,
          setor_origem: it.etapa_atual,
          setor_destino: 'cancelado',
          justificativa: justificativa.trim(),
          usuario_email: currentUser?.email,
          usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
          data_movimentacao: new Date().toISOString(),
        });
      }));

      // Se cancelou a OP inteira, atualiza o status da OP também
      if (!modoItem && op) {
        await base44.entities.OrdemProducao.update(op.id, { status: 'cancelada' });
      }

      queryClient.invalidateQueries({ queryKey: ['ops-comercial'] });
      queryClient.invalidateQueries({ queryKey: ['itens-all'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      queryClient.invalidateQueries({ queryKey: ['ops-admin'] });
      queryClient.invalidateQueries({ queryKey: ['itens-admin'] });

      toast.success(modoItem ? 'Item cancelado com sucesso' : `OP ${op?.numero_op} cancelada com sucesso`);
      setJustificativa('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Erro ao realizar cancelamento');
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Ban className="w-5 h-5" />
            {titulo}
          </DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Resumo do que será cancelado */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
            {op && (
              <>
                <p><span className="text-orange-700 font-medium">OP:</span> {op.numero_op}</p>
                <p><span className="text-orange-700 font-medium">Cliente:</span> {op.cliente}</p>
                <p><span className="text-orange-700 font-medium">Equipamento:</span> {op.equipamento_principal}</p>
              </>
            )}
            {modoItem ? (
              <div className="mt-1 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-800">{item?.descricao}</span>
                <Badge variant="outline" className="text-xs">{item?.etapa_atual}</Badge>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-orange-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {itensCancelar.length} {itensCancelar.length === 1 ? 'item será cancelado' : 'itens serão cancelados'}
                </p>
                {itensCancelar.length < itensOP.length && (
                  <p className="text-xs text-orange-600 mt-1">
                    {itensOP.length - itensCancelar.length} {itensOP.length - itensCancelar.length === 1 ? 'item já está' : 'itens já estão'} finalizado/cancelado e não serão alterados.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Justificativa */}
          <div>
            <Label>
              Justificativa do Cancelamento <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
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
              onClick={handleCancelar}
              disabled={loading || !justificativa.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Ban className="w-4 h-4 mr-2" />
              {loading ? 'Cancelando...' : modoItem ? 'Cancelar Item' : 'Cancelar OP'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}