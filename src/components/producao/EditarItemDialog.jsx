import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EditarItemDialog({ item, open, onOpenChange, onSuccess }) {
  const [descricao, setDescricao] = useState('');
  const [peso, setPeso] = useState('');
  const [codigoGa, setCodigoGa] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setDescricao(item.descricao || '');
      setPeso(item.peso ?? '');
      setCodigoGa(item.codigo_ga || '');
    }
  }, [item]);

  const handleSave = async () => {
    if (!descricao.trim()) {
      toast.error('A descrição é obrigatória');
      return;
    }
    setLoading(true);
    try {
      await base44.entities.ItemOP.update(item.id, {
        descricao: descricao.trim(),
        peso: peso === '' ? null : Number(peso),
        codigo_ga: codigoGa.trim()
      });
      toast.success('Item atualizado');
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao atualizar item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
          <DialogDescription>
            {item?.numero_op} - {item?.cliente}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label>Descrição *</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição do item"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código GA</Label>
              <Input
                value={codigoGa}
                onChange={(e) => setCodigoGa(e.target.value)}
                placeholder="Código GA"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Peso (kg)</Label>
            <Input
              type="number"
              step="0.01"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="0"
              className="mt-1"
            />
            </div>
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