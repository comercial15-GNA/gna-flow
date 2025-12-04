import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Wrench, 
  Search,
  Package,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ItemCardProducao from '@/components/producao/ItemCardProducao';

export default function Usinagem() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [retornarItem, setRetornarItem] = useState(null);
  const [retornarDestino, setRetornarDestino] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-usinagem'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'usinagem' }, 'data_entrada_etapa');
      return items;
    }
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-all'],
    queryFn: () => base44.entities.OrdemProducao.list(),
  });

  const getArquivos = (opId) => ops.find(o => o.id === opId)?.arquivos || [];

  const movimentarItem = async (item, novaEtapa, justif = '') => {
    setLoadingItem(item.id);
    try {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: novaEtapa,
        data_entrada_etapa: new Date().toISOString()
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'usinagem',
        setor_destino: novaEtapa,
        justificativa: justif,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.apelido || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['itens-usinagem'] });
      toast.success('Item movimentado com sucesso');
    } catch (error) {
      toast.error('Erro ao movimentar item');
    } finally {
      setLoadingItem(null);
      setRetornarDialogOpen(false);
      setJustificativa('');
    }
  };

  const handleRetornar = (item, destino) => {
    setRetornarItem(item);
    setRetornarDestino(destino);
    setJustificativa('');
    setRetornarDialogOpen(true);
  };

  const confirmarRetorno = () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória para retorno');
      return;
    }
    movimentarItem(retornarItem, retornarDestino, justificativa);
  };

  const gerarRelatorio = () => {
    const dados = itens.map(item => ({
      'OP': item.numero_op,
      'Descrição': item.descricao,
      'Código GA': item.codigo_ga || '-',
      'Peso (kg)': item.peso || '-',
      'Quantidade': item.quantidade,
      'Cliente': item.cliente,
      'Responsável': item.responsavel_op || '-',
      'Data Entrega': item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yyyy') : '-',
      'Entrada Etapa': item.data_entrada_etapa ? format(new Date(item.data_entrada_etapa), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'
    }));

    if (dados.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = Object.keys(dados[0]).join(';');
    const rows = dados.map(row => Object.values(row).join(';')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_usinagem_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  const itensFiltrados = itens.filter(item =>
    item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cliente?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
            <Wrench className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Usinagem</h1>
            <p className="text-slate-500">Itens em processo de usinagem</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-cyan-100 text-cyan-800 px-4 py-2 rounded-full text-sm font-medium">
            {itens.length} itens na fila
          </div>
          {itens.length > 0 && (
            <Button onClick={gerarRelatorio} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Gerar Relatório
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : itensFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum item na fila</h3>
          <p className="text-slate-500">Todos os itens foram processados</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {itensFiltrados.map((item) => (
            <ItemCardProducao
              key={item.id}
              item={item}
              arquivos={getArquivos(item.op_id)}
              loading={loadingItem === item.id}
              avancarOpcoes={[
                { value: 'liberacao', label: 'Enviar p/ Liberação' }
              ]}
              retornarOpcoes={[
                { value: 'fundicao', label: 'Retornar p/ Fundição' },
                { value: 'suprimentos', label: 'Retornar p/ Suprimentos' }
              ]}
              onAvancar={(item, etapa) => movimentarItem(item, etapa)}
              onRetornar={(item, etapa) => handleRetornar(item, etapa)}
            />
          ))}
        </div>
      )}

      <Dialog open={retornarDialogOpen} onOpenChange={setRetornarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Item</DialogTitle>
            <DialogDescription>Informe a justificativa do retorno</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Justificativa *</Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo do retorno..."
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRetornarDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarRetorno} className="bg-amber-600 hover:bg-amber-700">
                Confirmar Retorno
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}