import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from "@/components/ui/textarea";
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CriarOP() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [tipoOrdem, setTipoOrdem] = useState('op');
  const [descricaoGeral, setDescricaoGeral] = useState('');
  const [dataEntregaGeral, setDataEntregaGeral] = useState('');
  const [formData, setFormData] = useState({
    equipamento_principal: '',
    ordem_compra: '',
    cliente: '',
    responsavel: '',
    arquivos: []
  });
  
  const [itens, setItens] = useState([
    { descricao: '', observacao: '', codigo_ga: '', peso: '', quantidade: 1, data_entrega: '', pronta_entrega: false }
  ]);
  
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erros, setErros] = useState({});

  // Buscar responsáveis ativos diretamente
  const { data: usuarios = [] } = useQuery({
    queryKey: ['responsaveis-op'],
    queryFn: async () => {
      const resp = await base44.entities.ResponsavelOP.filter({ ativo: true });
      return resp.sort((a, b) => {
        const nomeA = (a.apelido || a.nome_completo || a.email || '').toLowerCase();
        const nomeB = (b.apelido || b.nome_completo || b.email || '').toLowerCase();
        return nomeA.localeCompare(nomeB);
      });
    }
  });

  const { data: sequencias = [] } = useQuery({
    queryKey: ['sequencia-op'],
    queryFn: () => base44.entities.SequenciaOP.list()
  });

  // Gera o próximo número disponível sem incrementar o contador.
  // O contador só é atualizado após a OP ser criada com sucesso (evita gaps).
  const gerarNumeroOP = async (prefixo = 'OP') => {
    const anoAtual = new Date().getFullYear();

    // Buscar sequência por prefixo + ano (contadores independentes)
    const sequenciasAtuais = await base44.entities.SequenciaOP.filter({ ano: anoAtual, prefixo });
    const sequenciaAtual = sequenciasAtuais[0];
    let proximoNumero = sequenciaAtual ? (sequenciaAtual.ultimo_numero || 0) + 1 : 1;

    // Verificar se o número já existe; se sim, incrementar até achar um livre
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const numeroOP = `${prefixo}-${anoAtual}-${String(proximoNumero).padStart(4, '0')}`;
      const opExistente = await base44.entities.OrdemProducao.filter({ numero_op: numeroOP });
      if (opExistente.length === 0) {
        return { numeroOP, numeroSequencia: proximoNumero };
      }
      proximoNumero++;
    }

    throw new Error('Não foi possível gerar número único para OP');
  };

  // Atualiza o contador da sequência APÓS a OP ser criada com sucesso
  const atualizarSequencia = async (prefixo, numeroSequencia) => {
    const anoAtual = new Date().getFullYear();
    const sequenciasAtuais = await base44.entities.SequenciaOP.filter({ ano: anoAtual, prefixo });
    const sequenciaAtual = sequenciasAtuais[0];

    if (sequenciaAtual) {
      // Só atualiza se o novo número for maior (evita retroceder o contador)
      if ((sequenciaAtual.ultimo_numero || 0) < numeroSequencia) {
        await base44.entities.SequenciaOP.update(sequenciaAtual.id, {
          ultimo_numero: numeroSequencia
        });
      }
    } else {
      await base44.entities.SequenciaOP.create({
        ano: anoAtual,
        prefixo,
        ultimo_numero: numeroSequencia
      });
    }
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
    setItens([...itens, { descricao: '', observacao: '', codigo_ga: '', peso: '', quantidade: 1, data_entrega: '', pronta_entrega: false }]);
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
    if (field === 'data_entrega' && value) {
      // Limitar o ano a 4 dígitos (formato YYYY-MM-DD)
      const parts = value.split('-');
      if (parts[0] && parts[0].length > 4) return;
    }
    newItens[index][field] = value;
    setItens(newItens);
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const validarFormulario = () => {
    const novosErros = {};

    if (!formData.equipamento_principal?.trim())
      novosErros.equipamento_principal = 'Equipamento principal é obrigatório';
    if (!formData.cliente?.trim())
      novosErros.cliente = 'Cliente é obrigatório';
    if (!formData.responsavel)
      novosErros.responsavel = 'Responsável é obrigatório';

    if (tipoOrdem !== 'op') {
      if (!descricaoGeral?.trim())
        novosErros.descricaoGeral = 'Descrição geral é obrigatória';
      if (!dataEntregaGeral)
        novosErros.dataEntregaGeral = 'Data de entrega é obrigatória';
      setErros(novosErros);
      return novosErros;
    }

    itens.forEach((item, i) => {
      if (!item.descricao?.trim())
        novosErros[`item_${i}_descricao`] = `Item ${i + 1}: Descrição é obrigatória`;
      if (!item.quantidade || item.quantidade <= 0)
        novosErros[`item_${i}_quantidade`] = `Item ${i + 1}: Quantidade deve ser maior que zero`;
      if (!item.data_entrega)
        novosErros[`item_${i}_data_entrega`] = `Item ${i + 1}: Data de entrega é obrigatória`;
    });

    setErros(novosErros);
    return novosErros;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const novosErros = validarFormulario();
    if (Object.keys(novosErros).length > 0) {
      toast.error('Corrija os campos destacados antes de continuar');
      // Scroll para o primeiro erro
      setTimeout(() => {
        const el = document.querySelector('[data-erro="true"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    if (tipoOrdem === 'op') {
      const itensValidosPre = itens.filter(item => item.descricao && item.quantidade > 0 && item.data_entrega);
      if (itensValidosPre.length === 0) {
        toast.error('Adicione pelo menos um item válido');
        return;
      }
    }

    setSubmitting(true);
    try {
      const prefixo = tipoOrdem.toUpperCase();
      const { numeroOP, numeroSequencia } = await gerarNumeroOP(prefixo);
      const dataLancamento = new Date().toISOString();

      // Buscar ID do usuário selecionado
      const usuarioSelecionado = usuarios.find(u => 
        (u.apelido || u.nome_completo || u.email) === formData.responsavel
      );

      const op = await base44.entities.OrdemProducao.create({
        numero_op: numeroOP,
        tipo_ordem: tipoOrdem,
        ordem_compra: formData.ordem_compra || null,
        equipamento_principal: formData.equipamento_principal,
        cliente: formData.cliente,
        responsavel: formData.responsavel,
        responsavel_user_id: usuarioSelecionado?.user_id || null,
        arquivos: formData.arquivos,
        status: 'em_andamento',
        data_lancamento: dataLancamento
      });

      // Atualizar contador da sequência APÓS a OP ser criada com sucesso
      await atualizarSequencia(prefixo, numeroSequencia);

      if (tipoOrdem === 'op') {
        const itensValidos = itens.filter(item => item.descricao && item.quantidade > 0 && item.data_entrega);
        const itensParaCriar = itensValidos.map(item => ({
          op_id: op.id,
          numero_op: numeroOP,
          equipamento_principal: formData.equipamento_principal,
          descricao: item.descricao,
          observacao: item.observacao || '',
          codigo_ga: item.codigo_ga,
          peso: item.peso ? parseFloat(item.peso) : null,
          quantidade: parseInt(item.quantidade),
          data_entrega: item.data_entrega || null,
          etapa_atual: 'engenharia',
          cliente: formData.cliente,
          responsavel_op: formData.responsavel,
          data_entrada_etapa: dataLancamento,
          pronta_entrega: item.pronta_entrega || false
        }));

        const itensCriados = await base44.entities.ItemOP.bulkCreate(itensParaCriar);

        // Registrar histórico de criação para cada item
        const historicosParaCriar = itensCriados.map(item => ({
          item_id: item.id,
          op_id: op.id,
          numero_op: numeroOP,
          descricao_item: item.descricao,
          setor_origem: 'comercial',
          setor_destino: 'engenharia',
          usuario_email: currentUser?.email,
          usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
          data_movimentacao: dataLancamento
        }));

        await base44.entities.HistoricoMovimentacao.bulkCreate(historicosParaCriar);

        queryClient.invalidateQueries({ queryKey: ['sequencia-op'] });
        toast.success(`${numeroOP} criada com sucesso!`);
        navigate(createPageUrl('Comercial'), { state: { novaOp: numeroOP } });
      } else {
        // OR/OF: criar item único direto no Suporte Industrial
        const itemCriado = await base44.entities.ItemOP.create({
          op_id: op.id,
          numero_op: numeroOP,
          equipamento_principal: formData.equipamento_principal,
          descricao: descricaoGeral,
          quantidade: 1,
          data_entrega: dataEntregaGeral || null,
          etapa_atual: 'suporte_industrial',
          cliente: formData.cliente,
          responsavel_op: formData.responsavel,
          data_entrada_etapa: dataLancamento
        });

        await base44.entities.HistoricoMovimentacao.create({
          item_id: itemCriado.id,
          op_id: op.id,
          numero_op: numeroOP,
          descricao_item: descricaoGeral,
          setor_origem: 'comercial',
          setor_destino: 'suporte_industrial',
          usuario_email: currentUser?.email,
          usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
          data_movimentacao: dataLancamento
        });

        queryClient.invalidateQueries({ queryKey: ['sequencia-op'] });
        toast.success(`${numeroOP} criada com sucesso!`);
        navigate(createPageUrl('Comercial'), { state: { novaOp: numeroOP } });
      }
    } catch (error) {
      toast.error('Erro ao criar OP');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Criar Nova {tipoOrdem.toUpperCase()}</h1>
            <p className="text-slate-500">Preencha os dados da Ordem de {tipoOrdem === 'op' ? 'Produção' : tipoOrdem === 'or' ? 'Reforma' : 'Fabricação'}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tipo de Ordem */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Tipo de Ordem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'op', label: 'OP', sub: 'Produção', active: 'bg-slate-700 text-white border-slate-700' },
                { value: 'or', label: 'OR', sub: 'Reforma', active: 'bg-orange-500 text-white border-orange-500' },
                { value: 'of', label: 'OF', sub: 'Fabricação', active: 'bg-blue-600 text-white border-blue-600' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTipoOrdem(opt.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${tipoOrdem === opt.value ? opt.active + ' ring-2 ring-offset-1' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  <p className="text-2xl font-bold">{opt.label}</p>
                  <p className="text-xs mt-1">{opt.sub}</p>
                </button>
              ))}
            </div>
            {tipoOrdem !== 'op' && (
              <p className="text-xs text-slate-500 mt-3">
                Ordens {tipoOrdem.toUpperCase()} são direcionadas ao Suporte Industrial, onde os itens serão cadastrados posteriormente.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dados da OP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Equipamento Principal *</Label>
                <Input
                  value={formData.equipamento_principal}
                  onChange={(e) => { setFormData({ ...formData, equipamento_principal: e.target.value }); setErros(p => ({ ...p, equipamento_principal: undefined })); }}
                  placeholder="Ex: GA1300"
                  className={`mt-1 ${erros.equipamento_principal ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  data-erro={!!erros.equipamento_principal}
                />
                {erros.equipamento_principal && <p className="text-xs text-red-500 mt-1">{erros.equipamento_principal}</p>}
              </div>
              <div>
                <Label>Ordem de Compra (O.C)</Label>
                <Input
                  value={formData.ordem_compra}
                  onChange={(e) => setFormData({ ...formData, ordem_compra: e.target.value })}
                  placeholder="Ex: OC-2024-001"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Cliente *</Label>
                <Input
                  value={formData.cliente}
                  onChange={(e) => { setFormData({ ...formData, cliente: e.target.value }); setErros(p => ({ ...p, cliente: undefined })); }}
                  placeholder="Nome do cliente"
                  className={`mt-1 ${erros.cliente ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  data-erro={!!erros.cliente}
                />
                {erros.cliente && <p className="text-xs text-red-500 mt-1">{erros.cliente}</p>}
              </div>
            </div>
            <div>
              <Label>Responsável pela OP *</Label>
              <Select
                value={formData.responsavel}
                onValueChange={(value) => { setFormData({ ...formData, responsavel: value }); setErros(p => ({ ...p, responsavel: undefined })); }}
              >
                <SelectTrigger className={`mt-1 ${erros.responsavel ? 'border-red-500 ring-red-500' : ''}`} data-erro={!!erros.responsavel}>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((resp) => (
                    <SelectItem key={resp.id} value={resp.apelido || resp.nome_completo || resp.email}>
                      {resp.apelido || resp.nome_completo} ({resp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {erros.responsavel && <p className="text-xs text-red-500 mt-1">{erros.responsavel}</p>}
              {!erros.responsavel && <p className="text-xs text-slate-500 mt-1">Selecione um usuário cadastrado como responsável pela OP</p>}
            </div>
          </CardContent>
        </Card>

        {tipoOrdem !== 'op' ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dados do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Descrição Geral *</Label>
              <Textarea
                value={descricaoGeral}
                onChange={(e) => { setDescricaoGeral(e.target.value); setErros(p => ({ ...p, descricaoGeral: undefined })); }}
                placeholder="Descrição geral do pedido (reforma/fabricação)"
                className={`mt-1 ${erros.descricaoGeral ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                data-erro={!!erros.descricaoGeral}
                rows={3}
              />
              {erros.descricaoGeral && <p className="text-xs text-red-500 mt-1">{erros.descricaoGeral}</p>}
            </div>
            <div>
              <Label>Data de Entrega *</Label>
              <Input
                type="date"
                value={dataEntregaGeral}
                onChange={(e) => { setDataEntregaGeral(e.target.value); setErros(p => ({ ...p, dataEntregaGeral: undefined })); }}
                className={`mt-1 ${erros.dataEntregaGeral ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                data-erro={!!erros.dataEntregaGeral}
              />
              {erros.dataEntregaGeral && <p className="text-xs text-red-500 mt-1">{erros.dataEntregaGeral}</p>}
            </div>
          </CardContent>
        </Card>
        ) : (
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
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Descrição *</Label>
                        <Input
                          value={item.descricao}
                          onChange={(e) => { updateItem(index, 'descricao', e.target.value); setErros(p => ({ ...p, [`item_${index}_descricao`]: undefined })); }}
                          placeholder="Descrição do item"
                          className={`mt-1 ${erros[`item_${index}_descricao`] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          data-erro={!!erros[`item_${index}_descricao`]}
                        />
                        {erros[`item_${index}_descricao`] && <p className="text-xs text-red-500 mt-1">Obrigatório</p>}
                      </div>
                      <div>
                        <Label className="text-xs">Observação</Label>
                        <Input
                          value={item.observacao}
                          onChange={(e) => updateItem(index, 'observacao', e.target.value)}
                          placeholder="Observações sobre o item"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-xs">Código GA</Label>
                        <Input
                          value={item.codigo_ga}
                          onChange={(e) => updateItem(index, 'codigo_ga', e.target.value)}
                          placeholder="Código"
                          className="mt-1"
                        />
                      </div>
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
                          onChange={(e) => { updateItem(index, 'quantidade', e.target.value); setErros(p => ({ ...p, [`item_${index}_quantidade`]: undefined })); }}
                          className={`mt-1 ${erros[`item_${index}_quantidade`] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          data-erro={!!erros[`item_${index}_quantidade`]}
                        />
                        {erros[`item_${index}_quantidade`] && <p className="text-xs text-red-500 mt-1">Obrigatório</p>}
                      </div>
                      <div>
                        <Label className="text-xs">Data Entrega *</Label>
                        <Input
                          type="date"
                          value={item.data_entrega}
                          onChange={(e) => { updateItem(index, 'data_entrega', e.target.value); setErros(p => ({ ...p, [`item_${index}_data_entrega`]: undefined })); }}
                          className={`mt-1 ${erros[`item_${index}_data_entrega`] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          data-erro={!!erros[`item_${index}_data_entrega`]}
                        />
                        {erros[`item_${index}_data_entrega`] && <p className="text-xs text-red-500 mt-1">Obrigatório</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id={`pronta-${index}`}
                        checked={item.pronta_entrega || false}
                        onChange={(e) => updateItem(index, 'pronta_entrega', e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor={`pronta-${index}`} className="text-xs cursor-pointer flex items-center gap-1 text-slate-700">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Pronta Entrega (pula etapas intermediárias — vai direto para Liberação após Engenharia)
                      </Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

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
                Criar {tipoOrdem.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}