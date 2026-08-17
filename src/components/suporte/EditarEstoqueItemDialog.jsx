import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCategoriasSuporte } from '@/hooks/useCategoriasSuporte';

export default function EditarEstoqueItemDialog({ open, onOpenChange, item, onSaved }) {
  const { categorias } = useCategoriasSuporte();
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [codigoGa, setCodigoGa] = useState('');
  const [peso, setPeso] = useState('');
  const [categoria, setCategoria] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setDescricao(item.descricao || '');
        setQuantidade(item.quantidade ?? 1);
        setCodigoGa(item.codigo_ga || '');
        setPeso(item.peso || '');
        setCategoria(item.categoria_suporte || '');
        setObservacao(item.observacao || '');
      } else {
        setDescricao('');
        setQuantidade(1);
        setCodigoGa('');
        setPeso('');
        setCategoria('');
        setObservacao('');
      }
    }
  }, [open, item]);

  const handleSalvar = async () => {
    if (!descricao.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    if (!quantidade || quantidade < 1) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    setSaving(true);
    try {
      const dados = {
        descricao: descricao.trim(),
        quantidade: parseInt(quantidade, 10),
        codigo_ga: codigoGa.trim() || undefined,
        peso: peso ? parseFloat(peso) : undefined,
        categoria_suporte: categoria || undefined,
        observacao: observacao.trim() || undefined,
      };

      if (item) {
        await base44.entities.EstoqueItem.update(item.id, dados);
        toast.success('Item atualizado');
      } else {
        await base44.entities.EstoqueItem.create(dados);
        toast.success('Item adicionado ao estoque');
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Editar Item de Estoque' : 'Adicionar Item ao Estoque'}</DialogTitle>
          <DialogDescription>
            {item ? 'Altere os dados do item' : 'Preencha os dados do item de estoque'}
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
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
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
                placeholder="0,00"
                className="mt-1"
              />
            </div>
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
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.valor}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observações adicionais..."
              className="mt-1"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {item ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}