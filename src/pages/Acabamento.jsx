import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, ChevronDown, ChevronUp, FileDown, AlertTriangle, Package } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import ItemOPActions from '../components/producao/ItemOPActions';
import ItensRetornados from '../components/producao/ItensRetornados';
import { updateOPStatus } from '../components/producao/UpdateOPStatus';

export default function Acabamento() {
  const [search, setSearch] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('todos');
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
  const [filtroData, setFiltroData] = useState('');
  const [mostrarAtrasados, setMostrarAtrasados] = useState(false);
  const [opsExpandidas, setOpsExpandidas] = useState({});
  const [dialogRetorno, setDialogRetorno] = useState({ aberto: false, item: null });
  const [justificativa, setJustificativa] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-acabamento'],
    queryFn: () => base44.entities.ItemOP.filter({ etapa_atual: 'acabamento' })
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-all'],
    queryFn: () => base44.entities.OrdemProducao.list()
  });

  const movimentarMutation = useMutation({
    mutationFn: async ({ item, novaEtapa, justificativa, retornado }) => {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: novaEtapa,
        data_entrada_etapa: new Date().toISOString(),
        retornado: retornado || false,
        justificativa_retorno: retornado ? justificativa : ''
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'acabamento',
        setor_destino: novaEtapa,
        justificativa: justificativa || '',
        usuario_email: user?.email,
        usuario_nome: user?.full_name || user?.apelido,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(item.op_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens-acabamento'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('Item movimentado com sucesso');
      setDialogRetorno({ aberto: false, item: null });
      setJustificativa('');
      setLoadingItem(null);
    },
    onError: () => {
      toast.error('Erro ao movimentar item');
      setLoadingItem(null);
    }
  });

  const handleEnviar = async (item, destino) => {
    setLoadingItem(item.id);
    if (item.retornado) {
      const justif = prompt('Este item foi retornado. Informe a justificativa para reenvio:');
      if (!justif || !justif.trim()) {
        toast.error('Justificativa é obrigatória');
        setLoadingItem(null);
        return;
      }
      await movimentarMutation.mutateAsync({ item, novaEtapa: destino, justificativa: justif, retornado: false });
    } else {
      await movimentarMutation.mutateAsync({ item, novaEtapa: destino, justificativa: '', retornado: false });
    }
  };

  const handleRetornar = (item) => {
    setDialogRetorno({ aberto: true, item });
    setJustificativa('');
  };

  const confirmarRetorno = async () => {
    if (!justificativa.trim()) {
      toast.error('Justificativa é obrigatória');
      return;
    }
    setLoadingItem(dialogRetorno.item.id);
    await movimentarMutation.mutateAsync({
      item: dialogRetorno.item,
      novaEtapa: 'fundicao',
      justificativa,
      retornado: true
    });
  };

  const handleReenviarRetornado = async (item, justif) => {
    setLoadingItem(item.id);
    await movimentarMutation.mutateAsync({
      item,
      novaEtapa: 'acabamento',
      justificativa: justif,
      retornado: false
    });
  };

  const isAtrasado = (dataEntrega) => {
    if (!dataEntrega) return false;
    return isBefore(startOfDay(new Date(dataEntrega)), startOfDay(new Date()));
  };

  const itensFiltrados = itens.filter(item => {
    const matchSearch = search === '' || 
      item.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      item.numero_op?.toLowerCase().includes(search.toLowerCase()) ||
      item.codigo_ga?.toLowerCase().includes(search.toLowerCase());
    
    const matchCliente = filtroCliente === 'todos' || item.cliente === filtroCliente;
    const matchResponsavel = filtroResponsavel === 'todos' || item.responsavel_op === filtroResponsavel;
    const matchData = !filtroData || item.data_entrega === filtroData;
    const matchAtrasado = !mostrarAtrasados || isAtrasado(item.data_entrega);
    
    return matchSearch && matchCliente && matchResponsavel && matchData && matchAtrasado;
  });

  const opsComItens = ops
    .map(op => ({
      ...op,
      itens: itensFiltrados.filter(item => item.op_id === op.id)
    }))
    .filter(op => op.itens.length > 0)
    .sort((a, b) => {
      const dataA = Math.min(...a.itens.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity));
      const dataB = Math.min(...b.itens.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity));
      return dataA - dataB;
    });

  const clientes = [...new Set(itens.map(i => i.cliente).filter(Boolean))];
  const responsaveis = [...new Set(itens.map(i => i.responsavel_op).filter(Boolean))];

  const gerarRelatorio = () => {
    const headers = ['OP', 'Cliente', 'Equipamento', 'Item', 'Código GA', 'Quantidade', 'Peso', 'Data Entrega', 'Responsável', 'Observação'];
    const linhas = itensFiltrados.map(item => [
      item.numero_op,
      item.cliente,
      item.equipamento_principal,
      item.descricao,
      item.codigo_ga || '',
      item.quantidade,
      item.peso || '',
      item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yyyy') : '',
      item.responsavel_op,
      item.observacao || ''
    ]);

    const csv = [headers, ...linhas].map(linha => linha.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_acabamento_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Acabamento</h1>
            <p className="text-slate-600">Gerencie itens na etapa de acabamento</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Package className="w-4 h-4 mr-2" />
              {itensFiltrados.length} itens
            </Badge>
            <Button onClick={gerarRelatorio} variant="outline">
              <FileDown className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <ItensRetornados
          itens={itensFiltrados}
          onReenviar={handleReenviarRetornado}
          loadingItem={loadingItem}
          etapaAtual="acabamento"
        />

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar por OP, item ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {clientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos responsáveis</SelectItem>
                {responsaveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
            />

            <div className="flex items-center gap-2">
              <Checkbox
                id="atrasados"
                checked={mostrarAtrasados}
                onCheckedChange={setMostrarAtrasados}
              />
              <label htmlFor="atrasados" className="text-sm cursor-pointer">
                Apenas atrasados
              </label>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {opsComItens.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600">Nenhum item encontrado</p>
            </Card>
          ) : (
            opsComItens.map(op => (
              <Card key={op.id} className="p-6">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setOpsExpandidas({...opsExpandidas, [op.id]: !opsExpandidas[op.id]})}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-800">{op.numero_op}</h3>
                      <Badge className="bg-pink-500">{op.itens.length} itens</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Cliente:</span>
                        <span className="ml-2 font-medium">{op.cliente}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Equipamento:</span>
                        <span className="ml-2 font-medium">{op.equipamento_principal}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Responsável:</span>
                        <span className="ml-2 font-medium">{op.responsavel}</span>
                      </div>
                    </div>
                  </div>
                  {opsExpandidas[op.id] ? <ChevronUp /> : <ChevronDown />}
                </div>

                {opsExpandidas[op.id] && (
                  <div className="mt-6 space-y-4">
                    {op.itens.map(item => (
                      <div key={item.id} className="border-l-4 border-pink-500 pl-4 py-3 bg-slate-50 rounded">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-800">{item.descricao}</h4>
                              {item.retornado && <Badge variant="destructive">Retornado</Badge>}
                              {isAtrasado(item.data_entrega) && (
                                <Badge variant="destructive" className="animate-pulse">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Atrasado
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-4 gap-3 text-sm text-slate-600">
                              {item.codigo_ga && <div>Código: {item.codigo_ga}</div>}
                              <div>Qtd: {item.quantidade}</div>
                              {item.peso && <div>Peso: {item.peso} kg</div>}
                              {item.data_entrega && (
                                <div>Entrega: {format(new Date(item.data_entrega), 'dd/MM/yyyy')}</div>
                              )}
                            </div>
                            <ItemOPActions item={item} onUpdate={() => queryClient.invalidateQueries()} />
                          </div>
                          <div className="flex gap-2">
                            <Select onValueChange={(value) => handleEnviar(item, value)}>
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Enviar para..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="usinagem">Usinagem</SelectItem>
                                <SelectItem value="liberacao">Liberação</SelectItem>
                                <SelectItem value="suporte_industrial">Suporte Industrial</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              onClick={() => handleRetornar(item)}
                              disabled={loadingItem === item.id}
                            >
                              Retornar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogRetorno.aberto} onOpenChange={(open) => setDialogRetorno({ aberto: open, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retornar Item para Fundição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded">
              <p className="font-semibold">{dialogRetorno.item?.descricao}</p>
              <p className="text-sm text-slate-600">OP: {dialogRetorno.item?.numero_op}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Justificativa (obrigatória) *</label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo do retorno..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRetorno({ aberto: false, item: null })}>
              Cancelar
            </Button>
            <Button onClick={confirmarRetorno} disabled={movimentarMutation.isPending}>
              {movimentarMutation.isPending ? 'Retornando...' : 'Confirmar Retorno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}