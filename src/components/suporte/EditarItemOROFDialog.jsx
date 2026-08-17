import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCategoriasSuporte } from '@/hooks/useCategoriasSuporte';

export default function EditarItemOROFDialog({ open, onOpenChange, op, item, onSaved }) {
  const isEdit = !!item;
  const [formData, setFormData] = useState({
    descricao: '', observacao: '', codigo_ga: '', peso: '', quantidade: 1, data_entrega: '', categoria_suporte: ''
  });
  const [saving, setSaving] = useState(false);
  const { categorias } = useCategoriasSuporte();

  useEffect(() => {
    if (item) {
      setFormData({
        descricao: item.descricao || '',
        observacao: item.observacao || '',
        codigo_ga: item.codigo_ga || '',
        peso: item.peso || '',
        quantidade: item.quantidade || 1,
        data_entrega: item.data_entrega || '',
        categoria_suporte: item.categoria_suporte || ''
      });
    } else {
      setFormData({
        descricao: '', observacao: '', codigo_ga: '', peso: '', quantidade: 1, data_entrega: '', categoria_suporte: ''
      });
    }
  }, [item, open]);

  const handleSubmit = async () => {
    if (!formData.descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    if (!formData.quantidade || formData.quantidade < 1) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    if (!formData.data_entrega) {
      toast.error('Data de entrega é obrigatória');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        descricao: formData.descricao,
        observacao: formData.observacao || '',
        codigo_ga: formData.codigo_ga || '',
        peso: formData.peso ? parseFloat(formData.peso) : null,
        quantidade: parseInt(formData.quantidade),
        data_entrega: formData.data_entrega,
        categoria_suporte: formData.categoria_suporte || null
      };

      if (isEdit) {
        await base44.entities.ItemOP.update(item.id, payload);
        toast.success('Item atualizado');
      } else {
        await base44.entities.ItemOP.create({
          ...payload,
          op_id: op.id,
          numero_op: op.numero_op,
          equipamento_principal: op.equipamento_principal,
          cliente: op.cliente,
          responsavel_op: op.responsavel,
          etapa_atual: 'suporte_industrial',
          data_entrada_etapa: new Date().toISOString()
        });
        toast.success('Item adicionado');
      }
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao salvar item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
          <DialogDescription>
            {op?.numero_op} — {op?.cliente}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label>Descrição *</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição do item"
              className="mt-1"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código GA</Label>
              <Input
                value={formData.codigo_ga}
                onChange={(e) => setFormData({ ...formData, codigo_ga: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={formData.categoria_suporte}
                onValueChange={(v) => setFormData({ ...formData, categoria_suporte: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.valor}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.peso}
                onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantidade}
                onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Data Entrega *</Label>
              <Input
                type="date"
                value={formData.data_entrega}
                onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              className="mt-1"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}