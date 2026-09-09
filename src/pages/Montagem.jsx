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
import {
  Layers,
  Search,
  Package,
  FileSpreadsheet,
  AlertTriangle,
  Filter,
  X,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ItensRetornados from '@/components/producao/ItensRetornados';
import { updateOPStatus } from '@/components/producao/UpdateOPStatus';
import RetornarItemDialog from '@/components/producao/RetornarItemDialog';
import MontagemOPCard from '@/components/montagem/MontagemOPCard';
import MontagemDraggableList from '@/components/montagem/MontagemDraggableList';

export default function Montagem() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('todos');
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
  const [filtroData, setFiltroData] = useState('');
  const [filtroAtrasados, setFiltroAtrasados] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [loadingItem, setLoadingItem] = useState(null);
  const [retornarDialogOpen, setRetornarDialogOpen] = useState(false);
  const [retornarItem, setRetornarItem] = useState(null);
  const [retornarDestino, setRetornarDestino] = useState('');
  const [expandedOPs, setExpandedOPs] = useState({});
  const queryClient = useQueryClient();

  const toggleOP = (opId) => {
    setExpandedOPs(prev => ({ ...prev, [opId]: !prev[opId] }));
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-montagem'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'montagem' });
      return items.sort((a, b) => {
        if (!a.data_entrega) return 1;
        if (!b.data_entrega) return -1;
        return new Date(a.data_entrega) - new Date(b.data_entrega);
      });
    }
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-all'],
    queryFn: () => base44.entities.OrdemProducao.list('data_lancamento'),
  });

  const { data: todosItens = [] } = useQuery({
    queryKey: ['todos-itens-montagem'],
    queryFn: () => base44.entities.ItemOP.list(),
  });

  const movimentarItem = async (item, novaEtapa, justif = '', retornado = false) => {
    setLoadingItem(item.id);
    try {
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: novaEtapa,
        data_entrada_etapa: new Date().toISOString(),
        retornado: retornado,
        justificativa_retorno: retornado ? justif : '',
        iniciado: false
      });

      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'montagem',
        setor_destino: novaEtapa,
        justificativa: justif,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.apelido || currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      await updateOPStatus(item.op_id);

      queryClient.invalidateQueries({ queryKey: ['itens-montagem'] });
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
      toast.success('Item movimentado com sucesso');
    } catch (error) {
      toast.error('Erro ao movimentar item');
    } finally {
      setLoadingItem(null);
      setRetornarDialogOpen(false);
    }
  };

  const handleRetornar = (item, destino) => {
    setRetornarItem(item);
    setRetornarDestino(destino);
    setRetornarDialogOpen(true);
  };

  const confirmarRetorno = (justificativa) => {
    movimentarItem(retornarItem, retornarDestino, justificativa, true);
  };

  const handleEnviar = async (item, destino) => {
    if (item.retornado) {
      const justif = prompt('Este item foi retornado. Informe a justificativa para reenvio:');
      if (!justif || !justif.trim()) {
        toast.error('Justificativa é obrigatória');
        return;
      }
      await movimentarItem(item, destino, justif, false);
    } else {
      await movimentarItem(item, destino, '', false);
    }
  };

  const gerarRelatorio = () => {
    const dados = itensFiltrados.map(item => ({
      'OP': item.numero_op,
      'O.C': getOP(item.op_id)?.ordem_compra || '-',
      'Equipamento': item.equipamento_principal || '-',
      'Descrição': item.descricao,
      'Observação': item.observacao || '-',
      'Código GA': item.codigo_ga || '-',
      'Peso (kg)': item.peso || '-',
      'Quantidade': item.quantidade,
      'Cliente': item.cliente,
      'Responsável': item.responsavel_op || '-',
      'Data Entrega': item.data_entrega ? format(parseISO(item.data_entrega), 'dd/MM/yyyy') : '-',
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
    link.download = `relatorio_montagem_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
    link.click();
    toast.success('Relatório gerado');
  };

  const getOP = (opId) => ops.find(o => o.id === opId);

  const clientesUnicos = [...new Set(ops.map(o => o.cliente))].filter(Boolean).sort();
  const responsaveisUnicos = [...new Set(ops.map(o => o.responsavel))].filter(Boolean).sort();

  const itensFiltrados = itens.filter(item => {
    const matchSearch = !searchTerm ||
      item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo_ga?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCliente = filtroCliente === 'todos' || item.cliente === filtroCliente;
    const matchResponsavel = filtroResponsavel === 'todos' || item.responsavel_op === filtroResponsavel;
    const matchData = !filtroData ||
      (item.data_entrega && new Date(item.data_entrega).toISOString().split('T')[0] === filtroData);
    const matchAtrasado = !filtroAtrasados ||
      (item.data_entrega && new Date(item.data_entrega) < new Date());

    return matchSearch && matchCliente && matchResponsavel && matchData && matchAtrasado;
  });

  const matchOpSearch = (op) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return op.numero_op?.toLowerCase().includes(t) ||
      op.cliente?.toLowerCase().includes(t) ||
      op.equipamento_principal?.toLowerCase().includes(t) ||
      op.ordem_compra?.toLowerCase().includes(t) ||
      op.responsavel?.toLowerCase().includes(t);
  };

  const opsComItens = ops.filter(op => {
    // Somente OR e OF na Montagem
    if (op.tipo_ordem === 'op') return false;
    if (filtroTipo !== 'todos' && op.tipo_ordem !== filtroTipo) return false;
    if (!matchOpSearch(op)) return false;
    if (filtroCliente !== 'todos' && op.cliente !== filtroCliente) return false;
    if (filtroResponsavel !== 'todos' && op.responsavel !== filtroResponsavel) return false;
    // OR/OF ativas aparecem mesmo sem itens na montagem (para priorização do admin)
    return op.status !== 'finalizado' && op.status !== 'cancelada';
  }).map(op => {
    const itensOP = itensFiltrados.filter(i => i.op_id === op.id);
    return { op, itens: itensOP };
  }).sort((a, b) => {
    // Fila única definida pelo admin (ordem_montagem) — independente do Suporte Industrial
    const ordA = a.op.ordem_montagem ?? Infinity;
    const ordB = b.op.ordem_montagem ?? Infinity;
    if (ordA !== ordB) return ordA - ordB;
    const dataA = a.itens.length > 0 ? Math.min(...a.itens.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity)) : Infinity;
    const dataB = b.itens.length > 0 ? Math.min(...b.itens.map(i => i.data_entrega ? new Date(i.data_entrega).getTime() : Infinity)) : Infinity;
    if (dataA !== dataB) return dataA - dataB;
    return new Date(a.op.data_lancamento) - new Date(b.op.data_lancamento);
  });

  const limparFiltros = () => {
    setSearchTerm('');
    setFiltroCliente('todos');
    setFiltroResponsavel('todos');
    setFiltroData('');
    setFiltroAtrasados(false);
    setFiltroTipo('todos');
  };

  const temFiltrosAtivos = searchTerm || filtroCliente !== 'todos' || filtroResponsavel !== 'todos' || filtroData || filtroAtrasados || filtroTipo !== 'todos';

  const isAdmin = currentUser?.setor === 'administrador';
  const podeArrastar = isAdmin && !temFiltrosAtivos;

  const renderCard = ({ op, itens: itensOP }, dragHandleProps, isDragging) => (
    <MontagemOPCard
      op={op}
      itens={itensOP}
      isExpanded={!!expandedOPs[op.id]}
      onToggle={() => toggleOP(op.id)}
      loadingItem={loadingItem}
      onEnviar={handleEnviar}
      onRetornar={handleRetornar}
      todosItens={todosItens}
      onItemUpdate={() => queryClient.invalidateQueries({ queryKey: ['itens-montagem'] })}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    />
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-[#f3f7ff] via-[#eef2fa] to-[#f8faff] rounded-3xl p-6 lg:p-8 min-h-[80vh]">
        {/* Topbar */}
        <div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          style={{ animation: 'montagem-rise 0.65s cubic-bezier(0.2,0.8,0.2,1) both' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#e4e5ff] text-[#5d58bd] grid place-items-center shadow-sm">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">Montagem</h1>
              <p className="text-slate-500 text-sm mt-1">Itens em processo de montagem</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 rounded-full bg-[#dedfff] text-[#504aab] text-sm font-bold shadow-inner">
              {itensFiltrados.length} itens • {opsComItens.length} OPs
            </span>
            {itensFiltrados.length > 0 && (
              <Button
                onClick={gerarRelatorio}
                variant="outline"
                className="bg-white/70 backdrop-blur-sm border-slate-200/90 hover:bg-white hover:text-[#4e48ae]"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Relatório
              </Button>
            )}
          </div>
        </div>

        <ItensRetornados
          itens={itensFiltrados}
          onReenviar={async (item, justif) => {
            setLoadingItem(item.id);
            await movimentarItem(item, item.etapa_atual, justif, false);
          }}
          loadingItem={loadingItem}
          etapaAtual="montagem"
        />

        {/* Filters */}
        <div
          className="bg-white/70 backdrop-blur-md border border-slate-200/90 rounded-2xl p-5 mb-6 shadow-sm"
          style={{ animation: 'montagem-rise 0.65s 0.15s cubic-bezier(0.2,0.8,0.2,1) both' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-[#6b65c7]" />
            <span className="font-bold text-slate-700">Filtros</span>
            {temFiltrosAtivos && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limparFiltros}
                className="ml-auto text-[#6964bd] hover:bg-[#ececff] hover:text-[#46409f]"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs font-bold text-slate-500">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="OP, O.C, cliente, equipamento, item, código GA..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500">Cliente</Label>
              <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {clientesUnicos.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500">Responsável</Label>
              <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {responsaveisUnicos.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500">Data Entrega</Label>
              <Input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500">Tipo</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="of">OF</SelectItem>
                  <SelectItem value="or">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="atrasados"
              checked={filtroAtrasados}
              onChange={(e) => setFiltroAtrasados(e.target.checked)}
              className="rounded accent-[#6c68c7]"
            />
            <label htmlFor="atrasados" className="text-sm text-slate-600 cursor-pointer flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Mostrar apenas atrasados
            </label>
          </div>
        </div>

        {/* Queue */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
          </div>
        ) : opsComItens.length === 0 ? (
          <div className="text-center py-12 bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/85">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhuma OP encontrada</h3>
            <p className="text-slate-500">Ajuste os filtros ou aguarde novos itens</p>
          </div>
        ) : podeArrastar ? (
          <>
            {opsComItens.length > 1 && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                <GripVertical className="w-3 h-3" />
                Arraste os cards para reordenar a fila de montagem.
              </p>
            )}
            <MontagemDraggableList ops={opsComItens} renderCard={renderCard} />
          </>
        ) : (
          <div className="space-y-4">
            {opsComItens.map(opData => renderCard(opData))}
          </div>
        )}

        <RetornarItemDialog
          open={retornarDialogOpen}
          onOpenChange={setRetornarDialogOpen}
          onConfirm={confirmarRetorno}
          loading={!!loadingItem}
        />
      </div>
    </div>
  );
}