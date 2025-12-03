import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { 
  Cog, 
  Search,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import ItemCard from '@/components/producao/ItemCard';

export default function Engenharia() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Buscar itens na etapa de engenharia, ordenados por data de entrada (mais antigos primeiro)
  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-engenharia'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'engenharia' }, 'data_entrada_etapa');
      return items;
    }
  });

  const movimentarItem = async (item, novaEtapa) => {
    setLoadingItem(item.id);
    try {
      // Atualizar item
      await base44.entities.ItemOP.update(item.id, {
        etapa_atual: novaEtapa,
        data_entrada_etapa: new Date().toISOString()
      });

      // Registrar histórico
      await base44.entities.HistoricoMovimentacao.create({
        item_id: item.id,
        op_id: item.op_id,
        numero_op: item.numero_op,
        descricao_item: item.descricao,
        setor_origem: 'engenharia',
        setor_destino: novaEtapa,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['itens-engenharia'] });
      toast.success(`Item enviado para ${novaEtapa === 'modelagem' ? 'Modelagem' : novaEtapa === 'suprimentos' ? 'Suprimentos' : 'Comercial'}`);
    } catch (error) {
      toast.error('Erro ao movimentar item');
    } finally {
      setLoadingItem(null);
    }
  };

  const itensFiltrados = itens.filter(item =>
    item.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo_ga?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Cog className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Engenharia</h1>
            <p className="text-slate-500">Itens aguardando análise técnica</p>
          </div>
        </div>
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
          {itens.length} itens na fila
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por descrição, OP, cliente ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de Itens */}
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
            <ItemCard
              key={item.id}
              item={item}
              loading={loadingItem === item.id}
              avancarOpcoes={[
                { value: 'modelagem', label: 'Enviar p/ Modelagem' },
                { value: 'suprimentos', label: 'Enviar p/ Suprimentos' }
              ]}
              retornarOpcoes={[
                { value: 'comercial', label: 'Retornar p/ Comercial' }
              ]}
              onAvancar={(item, etapa) => movimentarItem(item, etapa)}
              onRetornar={(item, etapa) => movimentarItem(item, etapa)}
            />
          ))}
        </div>
      )}
    </div>
  );
}