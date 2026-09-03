import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, KeyRound } from 'lucide-react';
import NumeroOpColorido from '@/components/producao/NumeroOpColorido';
import TipoOrdemBadge from '@/components/producao/TipoOrdemBadge';

/**
 * Dialog isolado de encerramento em massa via Item Principal (OR/OF).
 * Mantém o estado da justificativa internamente para evitar re-renders no parent.
 *
 * Props:
 *  - open, onOpenChange
 *  - op: OrdemProducao (OR/OF)
 *  - itemPrincipal: ItemOP (primeiro criado da OP)
 *  - itensParaFinalizar: ItemOP[] (todos os itens ativos que serão finalizados, incluindo o principal)
 *  - loading: boolean
 *  - onConfirm(justificativa): callback chamado ao confirmar
 */
export default function FinalizarOROFDialog({
  open,
  onOpenChange,
  op,
  itemPrincipal,
  itensParaFinalizar,
  loading,
  onConfirm,
}) {
  const [justificativa, setJustificativa] = useState('');

  useEffect(() => {
    if (open) setJustificativa('');
  }, [open]);

  if (!op || !itemPrincipal) return null;

  const total = itensParaFinalizar.length;
  const demais = total - 1;

  const handleConfirm = () => {
    if (!justificativa.trim()) return;
    onConfirm(justificativa.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <DialogTitle className="text-base">Encerramento em Massa — Item Principal</DialogTitle>
          </div>
          <DialogDescription className="text-slate-600">
            Esta ação irá finalizar o <strong>Item Principal</strong> e marcar todos os outros{' '}
            <strong>{demais}</strong> {demais === 1 ? 'item ativo' : 'itens ativos'} desta OR/OF como Finalizados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Identificação da OP */}
          <div className="flex items-center gap-2 flex-wrap">
            <NumeroOpColorido numero_op={op.numero_op} tipo_ordem={op.tipo_ordem} />
            <TipoOrdemBadge tipo_ordem={op.tipo_ordem} numero_op={op.numero_op} />
            <Badge className="bg-[#F3E8FF] border border-[#DDD6FE] text-[#6D28D9]">
              <KeyRound className="w-3 h-3 mr-1" />
              Item Principal
            </Badge>
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
              {total} {total === 1 ? 'item' : 'itens'} serão finalizados
            </Badge>
          </div>

          {/* Item Principal */}
          <div className="rounded-lg border border-[#DDD6FE] bg-[#F3E8FF]/40 p-3">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-3.5 h-3.5 text-[#6D28D9]" />
              <span className="text-xs font-semibold text-[#6D28D9] uppercase tracking-wide">Item Principal</span>
            </div>
            <p className="text-sm font-medium text-slate-800">{itemPrincipal.descricao}</p>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500 font-mono">
              {itemPrincipal.codigo_ga && <span>GA: {itemPrincipal.codigo_ga}</span>}
              <span>Qtd: {itemPrincipal.quantidade}</span>
              {itemPrincipal.peso && <span>{itemPrincipal.peso} kg</span>}
            </div>
          </div>

          {/* Lista dos demais itens (truncada) */}
          {demais > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-32 overflow-y-auto">
              <p className="text-xs font-medium text-slate-600 mb-2">
                Demais itens ativos que serão finalizados:
              </p>
              <ul className="space-y-1">
                {itensParaFinalizar
                  .filter(i => i.id !== itemPrincipal.id)
                  .slice(0, 8)
                  .map(i => (
                    <li key={i.id} className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      <span className="truncate">{i.descricao}</span>
                    </li>
                  ))}
                {demais > 8 && (
                  <li className="text-xs text-slate-400 italic">+ {demais - 8} outro(s)...</li>
                )}
              </ul>
            </div>
          )}

          {/* Justificativa */}
          <div>
            <Label>Justificativa da finalização *</Label>
            <Textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo do encerramento em massa..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!justificativa.trim() || loading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              {loading ? 'Finalizando...' : 'Confirmar Encerramento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}