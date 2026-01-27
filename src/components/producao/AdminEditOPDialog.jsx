import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Upload, X, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminEditOPDialog({ op, open, onOpenChange, onSuccess }) {
  const queryClient = useQueryClient();
  const [dadosOP, setDadosOP] = useState({});
  const [itens, setItens] = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const { data: responsaveis = [] } = useQuery({
    queryKey: ['responsaveis-ativos'],
    queryFn: () => base44.entities.ResponsavelOP.filter({ ativo: true }),
    enabled: open
  });

  useEffect(() => {
    if (op && open) {
      setDadosOP({
        numero_op: op.numero_op || '',
        ordem_compra: op.ordem_compra || '',
        equipamento_principal: op.equipamento_principal || '',
        cliente: op.cliente || '',
        responsavel: op.responsavel || '',
        responsavel_user_id: op.responsavel_user_id || '',
        status: op.status || 'em_andamento'
      });
      setArquivos(op.arquivos || []);
      
      // Buscar itens da OP
      base44.entities.ItemOP.filter({ op_id: op.id }).then(setItens);
    }
  }, [op, open]);

  const handleUploadArquivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setArquivos([...arquivos, file_url]);
      toast.success('Arquivo enviado');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const adicionarItem = () => {
    setItens([...itens, {
      descricao: '',
      codigo_ga: '',
      observacao: '',
      peso: 0,
      quantidade: 1,
      data_entrega: '',
      etapa_atual: 'engenharia',
      _isNew: true
    }]);
  };

  const removerItem = (index) => {
    const novaLista = [...itens];
    novaLista.splice(index, 1);
    setItens(novaLista);
  };

  const atualizarItem = (index, campo, valor) => {
    const novosItens = [...itens];
    novosItens[index][campo] = valor;
    setItens(novosItens);
  };

  const salvarMutation = useMutation({
    mutationFn: async () => {
      // Atualizar OP
      await base44.entities.OrdemProducao.update(op.id, {
        ...dadosOP,
        arquivos
      });

      // Processar itens
      const itensExistentes = itens.filter(i => !i._isNew && i.id);
      const itensNovos = itens.filter(i => i._isNew);
      const itensOriginais = await base44.entities.ItemOP.filter({ op_id: op.id });
      const idsParaManter = itensExistentes.map(i => i.id);
      const itensParaRemover = itensOriginais.filter(i => !idsParaManter.includes(i.id));

      // Remover itens excluídos
      for (const item of itensParaRemover) {
        await base44.entities.ItemOP.delete(item.id);
      }

      // Atualizar itens existentes
      for (const item of itensExistentes) {
        await base44.entities.ItemOP.update(item.id, {
          descricao: item.descricao,
          codigo_ga: item.codigo_ga,
          observacao: item.observacao,
          peso: parseFloat(item.peso) || 0,
          quantidade: parseInt(item.quantidade) || 1,
          data_entrega: item.data_entrega,
          etapa_atual: item.etapa_atual
        });
      }

      // Criar novos itens
      for (const item of itensNovos) {
        await base44.entities.ItemOP.create({
          op_id: op.id,
          numero_op: op.numero_op,
          equipamento_principal: dadosOP.equipamento_principal,
          cliente: dadosOP.cliente,
          responsavel_op: dadosOP.responsavel,
          descricao: item.descricao,
          codigo_ga: item.codigo_ga,
          observacao: item.observacao,
          peso: parseFloat(item.peso) || 0,
          quantidade: parseInt(item.quantidade) || 1,
          data_entrega: item.data_entrega,
          etapa_atual: item.etapa_atual || 'engenharia',
          data_entrada_etapa: new Date().toISOString()
        });
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
    onError: () => {
      toast.error('Erro ao atualizar OP');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar OP: {op?.numero_op}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dados">Dados da OP</TabsTrigger>
            <TabsTrigger value="itens">Itens da OP</TabsTrigger>
            <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número OP</Label>
                <Input
                  value={dadosOP.numero_op}
                  onChange={(e) => setDadosOP({...dadosOP, numero_op: e.target.value})}
                />
              </div>
              <div>
                <Label>Ordem de Compra</Label>
                <Input
                  value={dadosOP.ordem_compra}
                  onChange={(e) => setDadosOP({...dadosOP, ordem_compra: e.target.value})}
                />
              </div>
              <div>
                <Label>Equipamento Principal *</Label>
                <Input
                  value={dadosOP.equipamento_principal}
                  onChange={(e) => setDadosOP({...dadosOP, equipamento_principal: e.target.value})}
                />
              </div>
              <div>
                <Label>Cliente *</Label>
                <Input
                  value={dadosOP.cliente}
                  onChange={(e) => setDadosOP({...dadosOP, cliente: e.target.value})}
                />
              </div>
              <div>
                <Label>Responsável *</Label>
                <Select
                  value={dadosOP.responsavel_user_id}
                  onValueChange={(value) => {
                    const resp = responsaveis.find(r => r.user_id === value);
                    setDadosOP({
                      ...dadosOP,
                      responsavel_user_id: value,
                      responsavel: resp?.apelido || resp?.nome_completo || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsaveis.map(r => (
                      <SelectItem key={r.user_id} value={r.user_id}>
                        {r.apelido || r.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={dadosOP.status}
                  onValueChange={(value) => setDadosOP({...dadosOP, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="coleta">Coleta</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="itens" className="space-y-4">
            <Button onClick={adicionarItem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {itens.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold">Item {idx + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerItem(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Descrição *</Label>
                      <Input
                        value={item.descricao}
                        onChange={(e) => atualizarItem(idx, 'descricao', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Código GA</Label>
                      <Input
                        value={item.codigo_ga}
                        onChange={(e) => atualizarItem(idx, 'codigo_ga', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Quantidade *</Label>
                      <Input
                        type="number"
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(idx, 'quantidade', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Peso (kg)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.peso}
                        onChange={(e) => atualizarItem(idx, 'peso', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Data Entrega</Label>
                      <Input
                        type="date"
                        value={item.data_entrega}
                        onChange={(e) => atualizarItem(idx, 'data_entrega', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Etapa Atual</Label>
                      <Select
                        value={item.etapa_atual}
                        onValueChange={(value) => atualizarItem(idx, 'etapa_atual', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="comercial">Comercial</SelectItem>
                          <SelectItem value="engenharia">Engenharia</SelectItem>
                          <SelectItem value="modelagem">Modelagem</SelectItem>
                          <SelectItem value="suprimentos">Suprimentos</SelectItem>
                          <SelectItem value="fundicao">Fundição</SelectItem>
                          <SelectItem value="acabamento">Acabamento</SelectItem>
                          <SelectItem value="usinagem">Usinagem</SelectItem>
                          <SelectItem value="liberacao">Liberação</SelectItem>
                          <SelectItem value="expedicao">Expedição</SelectItem>
                          <SelectItem value="coleta">Coleta</SelectItem>
                          <SelectItem value="suporte_industrial">Suporte Industrial</SelectItem>
                          <SelectItem value="finalizado">Finalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label>Observação</Label>
                      <Textarea
                        value={item.observacao}
                        onChange={(e) => atualizarItem(idx, 'observacao', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="arquivos" className="space-y-4">
            <div>
              <Label htmlFor="upload-arquivo" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                  {uploading ? (
                    <p>Enviando...</p>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-600">Clique para adicionar arquivo</p>
                    </>
                  )}
                </div>
              </Label>
              <input
                id="upload-arquivo"
                type="file"
                className="hidden"
                onChange={handleUploadArquivo}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              {arquivos.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline flex items-center gap-1">
                      Arquivo {idx + 1}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setArquivos(arquivos.filter((_, i) => i !== idx))}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending}>
            {salvarMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}