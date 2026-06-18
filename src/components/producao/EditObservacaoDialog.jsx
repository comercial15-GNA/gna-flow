import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EditObservacaoDialog({ item, open, onOpenChange, onSuccess }) {
  const [novaObservacao, setNovaObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!novaObservacao.trim()) {
      toast.error('Digite uma observação');
      return;
    }
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const autor = user?.full_name || user?.email || 'Usuário';
      const carimbo = `[${format(new Date(), 'dd/MM/yyyy HH:mm')} - ${autor}] ${novaObservacao.trim()}`;
      const observacaoAtualizada = item?.observacao
        ? `${item.observacao}\n${carimbo}`
        : carimbo;

      await base44.entities.ItemOP.update(item.id, {
        observacao: observacaoAtualizada
      });
      toast.success('Observação adicionada');
      setNovaObservacao('');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar observação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Observação</DialogTitle>
          <DialogDescription>
            {item?.descricao} - {item?.numero_op}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {item?.observacao && (
            <div>
              <Label className="text-slate-500">Observações anteriores</Label>
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                {item.observacao.split('\n').filter(Boolean).map((linha, idx) => (
                  <p key={idx} className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {linha}
                  </p>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label>Nova observação</Label>
            <Textarea
              value={novaObservacao}
              onChange={(e) => setNovaObservacao(e.target.value)}
              placeholder="Digite a nova observação..."
              rows={4}
              className="mt-1"
            />
            <p className="text-xs text-slate-400 mt-1">
              A observação será registrada com data, hora e seu nome, sem apagar as anteriores.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}