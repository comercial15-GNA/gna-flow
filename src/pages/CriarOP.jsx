import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CriarOP() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    equipamento_principal: '',
    cliente: '',
    responsavel_email: '',
    arquivos: []
  });
  
  const [itens, setItens] = useState([
    { descricao: '', codigo_ga: '', peso: '', quantidade: 1 }
  ]);
  
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Buscar usuários ativos com setor
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-ativos'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.setor && u.ativo !== false);
    }
  });

  // Buscar sequência
  const { data: sequencias = [] } = useQuery({
    queryKey: ['sequencia-op'],
    queryFn: () => base44.entities.SequenciaOP.list()
  });

  const gerarNumeroOP = async () => {
    const anoAtual = new Date().getFullYear();
    let sequenciaAtual = sequencias.find(s => s.ano === anoAtual);
    let proximoNumero = 1;

    if (sequenciaAtual) {
      proximoNumero = (sequenciaAtual.ultimo_numero || 0) + 1;
      await base44.entities.SequenciaOP.update(sequenciaAtual.id, {
        ultimo_numero: proximoNumero
      });
    } else {
      await base44.entities.SequenciaOP.create({
        ano: anoAtual,
        ultimo_numero: 1
      });
    }

    return `OP-${anoAtual}-${String(proximoNumero).padStart(4, '0')}`;
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      }
      setFormData(prev => ({
        ...prev,
        arquivos: [...prev.arquivos, ...uploadedUrls]
      }));
      toast.success('Arquivo(s) enviado(s) com sucesso');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      arquivos: prev.arquivos.filter((_, i) => i !== index)
    }));
  };

  const addItem = () => {
    setItens([...itens, { descricao: '', codigo_ga: '', peso: '', quantidade: 1 }]);
  };

  const removeItem = (index) => {
    if (itens.length === 1) {
      toast.error('A OP deve ter pelo menos um item');
      return;
    }
    setItens(itens.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItens = [...itens];
    newItens[index][field] = value;
    setItens(newItens);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!formData.equipamento_principal || !formData.cliente || !formData.responsavel_email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const itensValidos = itens.filter(item => item.descricao && item.quantidade > 0);
    if (itensValidos.length === 0) {
      toast.error('Adicione pelo menos um item válido');
      return;
    }

    setSubmitting(true);
    try {
      const numeroOP = await gerarNumeroOP();
      const responsavel = usuarios.find(u => u.email === formData.responsavel_email);
      const dataLancamento = new Date().toISOString();

      // Criar OP
      const op = await base44.entities.OrdemProducao.create({
        numero_op: numeroOP,
        equipamento_principal: formData.equipamento_principal,
        cliente: formData.cliente,
        responsavel_email: formData.responsavel_email,
        responsavel_nome: responsavel?.full_name || formData.responsavel_email,
        arquivos: formData.arquivos,
        status: 'em_andamento',
        data_lancamento: dataLancamento
      });

      // Criar itens
      const itensParaCriar = itensValidos.map(item => ({
        op_id: op.id,
        numero_op: numeroOP,
        descricao: item.descricao,
        codigo_ga: item.codigo_ga,
        peso: item.peso ? parseFloat(item.peso) : null,
        quantidade: parseInt(item.quantidade),
        etapa_atual: 'engenharia',
        cliente: formData.cliente,
        responsavel_op_email: formData.responsavel_email,
        data_entrada_etapa: dataLancamento
      }));

      await base44.entities.ItemOP.bulkCreate(itensParaCriar);

      queryClient.invalidateQueries({ queryKey: ['sequencia-op'] });
      toast.success(`${numeroOP} criada com sucesso!`);
      navigate(createPageUrl('Comercial'));
    } catch (error) {
      toast.error('Erro ao criar OP');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Criar Nova OP</h1>
            <p className="text-slate-500">Preencha os dados da Ordem de Produção</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Dados Principais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dados da OP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Equipamento Principal *</Label>
                <Input
                  value={formData.equipamento_principal}
                  onChange={(e) => setFormData({ ...formData, equipamento_principal: e.target.value })}
                  placeholder="Ex: Bomba Centrífuga"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Cliente *</Label>
                <Input
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  placeholder="Nome do cliente"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Responsável pela OP *</Label>
              <Select
                value={formData.responsavel_email}
                onValueChange={(value) => setFormData({ ...formData, responsavel_email: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((user) => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Arquivos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Arquivos Anexos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-slate-300 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                )}
                <p className="mt-2 text-sm text-slate-600">
                  {uploading ? 'Enviando...' : 'Clique para enviar arquivos'}
                </p>
              </label>
            </div>
            
            {formData.arquivos.length > 0 && (
              <div className="mt-4 space-y-2">
                {formData.arquivos.map((url, index) => (
                  <div key={index} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <FileText className="w-5 h-5 text-slate-500" />
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-blue-600 hover:underline truncate"
                    >
                      Arquivo {index + 1}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Itens */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Itens da OP</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {itens.map((item, index) => (
                <div key={index} className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-600">Item {index + 1}</span>
                    {itens.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Descrição *</Label>
                      <Input
                        value={item.descricao}
                        onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                        placeholder="Descrição do item"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Código GA</Label>
                      <Input
                        value={item.codigo_ga}
                        onChange={(e) => updateItem(index, 'codigo_ga', e.target.value)}
                        placeholder="Código"
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Peso (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.peso}
                          onChange={(e) => updateItem(index, 'peso', e.target.value)}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Qtd *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => updateItem(index, 'quantidade', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate(createPageUrl('Comercial'))}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Criar OP
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}