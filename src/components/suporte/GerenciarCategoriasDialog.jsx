import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { COLOR_OPTIONS, COLOR_MAP } from '@/hooks/useCategoriasSuporte';

const slugify = (str) =>
  str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export default function GerenciarCategoriasDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', cor: 'slate', ativo: true });

  useEffect(() => {
    if (open) loadCategorias();
  }, [open]);

  const loadCategorias = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.CategoriaSuporte.list();
      setCategorias(data.sort((a, b) => (a.ordem || 0) - (b.ordem || 0)));
    } catch (e) {
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => {
    setEditing({});
    setForm({ nome: '', cor: 'slate', ativo: true });
  };

  const startEdit = (cat) => {
    setEditing(cat);
    setForm({ nome: cat.nome, cor: cat.cor || 'slate', ativo: cat.ativo !== false });
  };

  const cancelEdit = () => setEditing(null);

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      if (editing?.id) {
        await base44.entities.CategoriaSuporte.update(editing.id, {
          nome: form.nome.trim(),
          cor: form.cor,
          ativo: form.ativo,
        });
        toast.success('Categoria atualizada');
      } else {
        const valor = slugify(form.nome);
        if (categorias.find(c => c.valor === valor)) {
          toast.error('Já existe uma categoria com esse nome');
          setSaving(false);
          return;
        }
        await base44.entities.CategoriaSuporte.create({
          nome: form.nome.trim(),
          valor,
          cor: form.cor,
          ativo: form.ativo,
          ordem: categorias.length,
        });
        toast.success('Categoria adicionada');
      }
      setEditing(null);
      await loadCategorias();
      queryClient.invalidateQueries({ queryKey: ['categorias-suporte'] });
    } catch (e) {
      toast.error('Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Excluir a categoria "${cat.nome}"?`)) return;
    try {
      await base44.entities.CategoriaSuporte.delete(cat.id);
      toast.success('Categoria excluída');
      await loadCategorias();
      queryClient.invalidateQueries({ queryKey: ['categorias-suporte'] });
    } catch (e) {
      toast.error('Erro ao excluir categoria');
    }
  };

  const toggleAtivo = async (cat) => {
    try {
      await base44.entities.CategoriaSuporte.update(cat.id, { ativo: !cat.ativo });
      await loadCategorias();
      queryClient.invalidateQueries({ queryKey: ['categorias-suporte'] });
    } catch (e) {
      toast.error('Erro ao atualizar categoria');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>Adicione, edite ou remova categorias do Suporte Industrial</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {editing ? (
            <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="mt-1"
                  placeholder="Ex: Matéria Prima"
                  autoFocus
                />
              </div>
              <div>
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {COLOR_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setForm({ ...form, cor: opt.key })}
                      className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition ${COLOR_MAP[opt.key]} ${form.cor === opt.key ? 'border-slate-800 ring-2 ring-slate-300' : 'border-transparent'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <Label>Ativa</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={cancelEdit}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={startNew} size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Categoria
            </Button>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {categorias.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">Nenhuma categoria cadastrada</p>
              ) : categorias.map(cat => (
                <div key={cat.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <Badge className={COLOR_MAP[cat.cor] || COLOR_MAP.slate}>
                      {cat.nome}
                    </Badge>
                    {cat.ativo === false && (
                      <span className="text-xs text-slate-400">Inativa</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={cat.ativo !== false} onCheckedChange={() => toggleAtivo(cat)} />
                    <Button variant="ghost" size="icon" onClick={() => startEdit(cat)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}