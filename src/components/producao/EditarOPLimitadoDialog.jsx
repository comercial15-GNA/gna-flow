import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, CheckCircle, Zap, Info } from 'lucide-react';
import { toast } from 'sonner';
import { etapaEntradaItem } from '@/lib/permissoesOP';

const ETAPA_LABELS = {
  comercial: 'Comercial',
  engenharia: 'Engenharia',
  modelagem: 'Modelagem',
  suprimentos: 'Suprimentos',
  fundicao: 'Fundição',
  acabamento: 'Acabamento',
  usinagem: 'Usinagem',
  caldeiraria: 'Caldeiraria',
  liberacao: 'Liberação',
  expedicao: 'Expedição',
  coleta: 'Coleta',
  suporte_industrial: 'Suporte Industrial',
  montagem: 'Montagem',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

/**
 * Edição reduzida de OP para o criador / usuário com liberação temporária.
 * Permite ajustar dados da OP e adicionar/editar itens.
 * Não altera etapas, status, cancelamento, reabertura, exclusão nem arquivos.
 */
export default function EditarOPLimitadoDialog({ op, open, onOpenChange, currentUser, onSuccess }) {
  const queryClient = useQueryClient();
  const [dadosOP, setDadosOP] = useState({});
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const { data: responsaveis = [] } = useQuery({
    queryKey: ['responsaveis-ativos'],
    queryFn: () => base44.entities.ResponsavelOP.filter({ ativo: true }),
    enabled: open,
  });

  useEffect(() => {
    if (!op || !open) return;
    setDadosOP({
      equipamento_principal: op.equipamento_principal || '',
      ordem_compra: op.ordem_compra || '',
      cliente: op.cliente || '',
      responsavel: op.responsavel || '',
      responsavel_user_id: op.responsavel_user_id || '',
    });
    setCarregando(true);
    base44.entities.ItemOP.filter({ op_id: op.id })
      .then(res => setItens(res))
      .finally(() => setCarregando(false));
  }, [op, open]);

  const adicionarItem = () => {
    setItens(prev => [...prev, {
      descricao: '',
      codigo_ga: '',
      observacao: '',
      peso: '',
      quantidade: 1,
      data_entrega: '',
      pronta_entrega: false,
      _isNew: true,
    }]);
  };

  const removerItemNovo = (index) => {
    setItens(prev => prev.filter((_, i) => i !== index));
  };

  const atualizarItem = (index, campo, valor) => {
    setItens(prev => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const novos = itens.filter(i => i._isNew);
      const novosValidos = novos.filter(i => i.descricao?.trim() && parseInt(i.quantidade) > 0 && i.data_entrega);
      if (novos.length !== novosValidos.length) {
        throw new Error('Preencha descrição, quantidade e data de entrega dos itens novos');
      }

      await base44.entities.OrdemProducao.update(op.id, {
        equipamento_principal: dadosOP.equipamento_principal,
        ordem_compra: dadosOP.ordem_compra || null,
        cliente: dadosOP.cliente,
        responsavel: dadosOP.responsavel,
        responsavel_user_id: dadosOP.responsavel_user_id || null,
      });

      const existentes = itens.filter(i => !i._isNew && i.id);
      for (const item of existentes) {
        await base44.entities.ItemOP.update(item.id, {
          descricao: item.descricao,
          codigo_ga: item.codigo_ga || '',
          observacao: item.observacao || '',
          peso: item.peso !== '' && item.peso != null ? parseFloat(item.peso) : null,
          quantidade: parseInt(item.quantidade) || 1,
          data_entrega: item.data_entrega || null,
          pronta_entrega: !!item.pronta_entrega,
          equipamento_principal: dadosOP.equipamento_principal,
          cliente: dadosOP.cliente,
          responsavel_op: dadosOP.responsavel,
        });
      }

      const etapaEntrada = etapaEntradaItem(existentes);
      const agora = new Date().toISOString();
      const criados = [];
      for (const item of novosValidos) {
        const criado = await base44.entities.ItemOP.create({
          op_id: op.id,
          numero_op: op.numero_op,
          equipamento_principal: dadosOP.equipamento_principal,
          cliente: dadosOP.cliente,
          responsavel_op: dadosOP.responsavel,
          descricao: item.descricao,
          codigo_ga: item.codigo_ga || '',
          observacao: item.observacao || '',
          peso: item.peso !== '' && item.peso != null ? parseFloat(item.peso) : null,
          quantidade: parseInt(item.quantidade) || 1,
          data_entrega: item.data_entrega || null,
          etapa_atual: etapaEntrada,
          data_entrada_etapa: agora,
          pronta_entrega: !!item.pronta_entrega,
        });
        criados.push(criado);
      }

      if (criados.length > 0) {
        await base44.entities.HistoricoMovimentacao.bulkCreate(criados.map(c => ({
          item_id: c.id,
          op_id: op.id,
          numero_op: op.numero_op,
          descricao_item: c.descricao,
          setor_origem: 'comercial',
          setor_destino: etapaEntrada,
          justificativa: 'Item adicionado após a criação da OP',
          usuario_email: currentUser?.email,
          usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
          data_movimentacao: agora,
        })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ops-comercial'] });
      queryClient.invalidateQueries({ queryKey: ['itens-all'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('OP atualizada com sucesso');
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err?.message || 'Erro ao atualizar OP');
    },
  });

  if (!op) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar OP: {op.numero_op}</DialogTitle>
          <DialogDescription>
            Ajuste os dados da OP e adicione ou corrija itens.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>As etapas de produção, o cancelamento e a exclusão continuam sob responsabilidade do administrador.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <Label>Equipamento Principal *</Label>
            <Input
              value={dadosOP.equipamento_principal || ''}
              onChange={(e) => setDadosOP({ ...dadosOP, equipamento_principal: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Ordem de Compra</Label>
            <Input
              value={dadosOP.ordem_compra || ''}
              onChange={(e) => setDadosOP({ ...dadosOP, ordem_compra: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Cliente *</Label>
            <Input
              value={dadosOP.cliente || ''}
              onChange={(e) => setDadosOP({ ...dadosOP, cliente: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Responsável</Label>
            <Select
              value={dadosOP.responsavel_user_id || ''}
              onValueChange={(value) => {
                const resp = responsaveis.find(r => r.user_id === value);
                setDadosOP({
                  ...dadosOP,
                  responsavel_user_id: value,
                  responsavel: resp?.apelido || resp?.nome_completo || '',
                });
              }}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map(r => (
                  <SelectItem key={r.user_id} value={r.user_id}>{r.apelido || r.nome_completo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-600">{itens.length} {itens.length === 1 ? 'item' : 'itens'} na OP</p>
          <Button onClick={adicionarItem} size="sm" type="button">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto mt-2">
          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : itens.map((item, idx) => (
            <div key={item.id || `new-${idx}`} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">Item {idx + 1}</h4>
                  {!item._isNew && (
                    <Badge variant="outline" className="text-xs">
                      Etapa: {ETAPA_LABELS[item.etapa_atual] || item.etapa_atual}
                    </Badge>
                  )}
                  {item._isNew && <Badge className="bg-blue-100 text-blue-800 text-xs">Novo</Badge>}
                </div>
                {item._isNew && (
                  <Button variant="ghost" size="sm" type="button" onClick={() => removerItemNovo(idx)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Descrição *</Label>
                  <Input value={item.descricao || ''} onChange={(e) => atualizarItem(idx, 'descricao', e.target.value)} />
                </div>
                <div>
                  <Label>Código GA</Label>
                  <Input value={item.codigo_ga || ''} onChange={(e) => atualizarItem(idx, 'codigo_ga', e.target.value)} />
                </div>
                <div>
                  <Label>Quantidade *</Label>
                  <Input type="number" min="1" value={item.quantidade ?? 1} onChange={(e) => atualizarItem(idx, 'quantidade', e.target.value)} />
                </div>
                <div>
                  <Label>Peso (kg)</Label>
                  <Input type="number" step="0.01" value={item.peso ?? ''} onChange={(e) => atualizarItem(idx, 'peso', e.target.value)} />
                </div>
                <div>
                  <Label>Data Entrega *</Label>
                  <Input type="date" value={item.data_entrega || ''} onChange={(e) => atualizarItem(idx, 'data_entrega', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Observação</Label>
                  <Textarea value={item.observacao || ''} onChange={(e) => atualizarItem(idx, 'observacao', e.target.value)} rows={2} />
                </div>
                <div className="md:col-span-2 flex items-center gap-2 pt-1">
                  <Checkbox
                    id={`pronta-lim-${idx}`}
                    checked={!!item.pronta_entrega}
                    onCheckedChange={(v) => atualizarItem(idx, 'pronta_entrega', !!v)}
                  />
                  <Label htmlFor={`pronta-lim-${idx}`} className="cursor-pointer flex items-center gap-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Pronta Entrega
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvarMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
            {salvarMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}