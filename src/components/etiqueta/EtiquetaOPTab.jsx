import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Printer, Loader2, Package, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { gerarZPL, imprimirViaBrowserPrint } from '@/components/producao/ImprimirEtiquetaZebra';
import NumeroOpColorido from '@/components/producao/NumeroOpColorido';
import TipoOrdemBadge from '@/components/producao/TipoOrdemBadge';

const ETAPA_LABEL = {
  comercial: 'Comercial',
  engenharia: 'Engenharia',
  modelagem: 'Modelagem',
  suprimentos: 'Suprimentos',
  fundicao: 'Fundição',
  acabamento: 'Acabamento',
  usinagem: 'Usinagem',
  caldeiraria: 'Caldeiraria',
  montagem: 'Montagem',
  liberacao: 'Liberação',
  expedicao: 'Expedição',
  suporte_industrial: 'Suporte Industrial',
  coleta: 'Coleta',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

const ETAPA_COLORS = {
  comercial: 'bg-blue-100 text-blue-800 border-blue-200',
  engenharia: 'bg-green-100 text-green-800 border-green-200',
  modelagem: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  suprimentos: 'bg-orange-100 text-orange-800 border-orange-200',
  fundicao: 'bg-red-100 text-red-800 border-red-200',
  acabamento: 'bg-pink-100 text-pink-800 border-pink-200',
  usinagem: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  caldeiraria: 'bg-amber-100 text-amber-800 border-amber-200',
  montagem: 'bg-violet-100 text-violet-800 border-violet-200',
  liberacao: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  expedicao: 'bg-teal-100 text-teal-800 border-teal-200',
  suporte_industrial: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  coleta: 'bg-violet-100 text-violet-800 border-violet-200',
  finalizado: 'bg-purple-100 text-purple-800 border-purple-200',
  cancelado: 'bg-red-900 text-white border-red-900',
};

export default function EtiquetaOPTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clienteFilter, setClienteFilter] = useState('all');
  const [equipamentoFilter, setEquipamentoFilter] = useState('all');
  const [selectedOP, setSelectedOP] = useState(null);
  const [printingId, setPrintingId] = useState(null);

  const { data: ops = [], isLoading: loadingOPs } = useQuery({
    queryKey: ['ops-etiqueta'],
    queryFn: () => base44.entities.OrdemProducao.list('-data_lancamento'),
  });

  const { data: itens = [], isLoading: loadingItens } = useQuery({
    queryKey: ['itens-etiqueta', selectedOP?.id],
    queryFn: () => base44.entities.ItemOP.filter({ op_id: selectedOP.id }),
    enabled: !!selectedOP,
  });

  const clientes = useMemo(() => [...new Set(ops.map(o => o.cliente).filter(Boolean))].sort(), [ops]);
  const equipamentos = useMemo(() => [...new Set(ops.map(o => o.equipamento_principal).filter(Boolean))].sort(), [ops]);

  const opsFiltradas = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return ops.filter(op => {
      const matchSearch = !termo ||
        op.numero_op?.toLowerCase().includes(termo) ||
        op.cliente?.toLowerCase().includes(termo) ||
        op.equipamento_principal?.toLowerCase().includes(termo) ||
        op.ordem_compra?.toLowerCase().includes(termo);
      const matchCliente = clienteFilter === 'all' || op.cliente === clienteFilter;
      const matchEquipamento = equipamentoFilter === 'all' || op.equipamento_principal === equipamentoFilter;
      return matchSearch && matchCliente && matchEquipamento;
    });
  }, [ops, searchTerm, clienteFilter, equipamentoFilter]);

  const itensOrdenados = useMemo(
    () => [...itens].sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
    [itens]
  );

  const imprimir = async (item) => {
    setPrintingId(item.id);
    try {
      await imprimirViaBrowserPrint(gerarZPL(item));
      toast.success('Etiqueta enviada para impressão!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao imprimir etiqueta');
    } finally {
      setPrintingId(null);
    }
  };

  if (selectedOP) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="outline" size="sm" onClick={() => setSelectedOP(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <NumeroOpColorido numero_op={selectedOP.numero_op} tipo_ordem={selectedOP.tipo_ordem} />
                <TipoOrdemBadge tipo_ordem={selectedOP.tipo_ordem} numero_op={selectedOP.numero_op} />
              </div>
              <p className="text-sm text-slate-600 truncate">
                {selectedOP.equipamento_principal} • {selectedOP.cliente}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {itensOrdenados.length} {itensOrdenados.length === 1 ? 'item' : 'itens'}
          </Badge>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {loadingItens ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div>
            </div>
          ) : itensOrdenados.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Esta ordem não possui itens.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
              {itensOrdenados.map((item) => (
                <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className={`text-xs ${ETAPA_COLORS[item.etapa_atual] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {ETAPA_LABEL[item.etapa_atual] || item.etapa_atual}
                      </Badge>
                      {item.codigo_ga && <span className="text-xs text-slate-500">GA: {item.codigo_ga}</span>}
                      <span className="text-xs text-slate-500">Qtd: {item.quantidade}</span>
                      {item.peso ? <span className="text-xs text-slate-500">{item.peso} kg</span> : null}
                    </div>
                    <p className="text-sm font-medium text-slate-800">{item.descricao}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => imprimir(item)}
                    disabled={printingId === item.id}
                    className="shrink-0"
                  >
                    {printingId === item.id ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4 mr-1" />
                    )}
                    Imprimir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="OP, cliente, equipamento, O.C..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={clienteFilter} onValueChange={setClienteFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clientes</SelectItem>
              {clientes.map((cliente) => (
                <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={equipamentoFilter} onValueChange={setEquipamentoFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Equipamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Equipamentos</SelectItem>
              {equipamentos.map((equipamento) => (
                <SelectItem key={equipamento} value={equipamento}>{equipamento}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Ordens de Produção ({opsFiltradas.length})</h2>
        </div>
        {loadingOPs ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div>
          </div>
        ) : opsFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Nenhuma ordem encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
            {opsFiltradas.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setSelectedOP(op)}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <NumeroOpColorido numero_op={op.numero_op} tipo_ordem={op.tipo_ordem} />
                  <TipoOrdemBadge tipo_ordem={op.tipo_ordem} numero_op={op.numero_op} />
                  {op.ordem_compra && (
                    <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">
                      O.C: {op.ordem_compra}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">{op.equipamento_principal} • {op.cliente}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}