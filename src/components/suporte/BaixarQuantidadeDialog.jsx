import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function BaixarQuantidadeDialog({ open, onOpenChange, item, onSaved }) {
  const [tipo, setTipo] = useState('baixa');
  const [quantidade, setQuantidade] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo('baixa');
      setQuantidade(1);
    }
  }, [open]);

  if (!item) return null;

  const novaQuantidade = tipo === 'baixa'
    ? (item.quantidade || 0) - (parseInt(quantidade, 10) || 0)
    : (item.quantidade || 0) + (parseInt(quantidade, 10) || 0);

  const handleConfirmar = async () => {
    if (!quantidade || quantidade < 1) {
      toast.error('Informe uma quantidade válida');
      return;
    }

    if (tipo === 'baixa' && novaQuantidade < 0) {
      toast.error('Quantidade insuficiente em estoque');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.EstoqueItem.update(item.id, {
        quantidade: novaQuantidade,
      });
      toast.success(tipo === 'baixa' ? 'Baixa registrada' : 'Reposição registrada');
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao atualizar quantidade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Baixar / Repor Quantidade</DialogTitle>
          <DialogDescription>
            {item.descricao} — Saldo atual: <span className="font-semibold">{item.quantidade}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label>Operação</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixar (saída)</SelectItem>
                <SelectItem value="reposicao">Repor (entrada)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className={`rounded-lg p-3 ${novaQuantidade < 0 ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Novo saldo:</span>
              <span className={`font-bold text-lg ${novaQuantidade < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {novaQuantidade}
              </span>
            </div>
            {novaQuantidade < 0 && (
              <p className="text-xs text-red-600 mt-1">Quantidade insuficiente em estoque</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmar}
              disabled={saving || novaQuantidade < 0}
              className={tipo === 'baixa' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : tipo === 'baixa' ? (
                <Minus className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {tipo === 'baixa' ? 'Confirmar Baixa' : 'Confirmar Reposição'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}