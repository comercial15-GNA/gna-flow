import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

export default function RetornarItemDialog({
  open,
  onOpenChange,
  titulo = "Retornar Item",
  descricao = "Informe a justificativa do retorno",
  placeholder = "Descreva o motivo do retorno...",
  confirmLabel = "Confirmar Retorno",
  onConfirm,
  loading = false,
  confirmVariant = "default",
  confirmClassName = "bg-amber-600 hover:bg-amber-700",
}) {
  const [justificativa, setJustificativa] = useState('');

  // Reseta o texto sempre que o dialog abre
  useEffect(() => {
    if (open) setJustificativa('');
  }, [open]);

  const handleConfirm = () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória');
      return;
    }
    onConfirm(justificativa.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label>Justificativa *</Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder={placeholder}
              className="mt-1"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading} className={confirmClassName}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}