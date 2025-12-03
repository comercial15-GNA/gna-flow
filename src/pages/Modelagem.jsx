import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { 
  Box, 
  Search,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import ItemCard from '@/components/producao/ItemCard';

export default function Modelagem() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingItem, setLoadingItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['itens-modelagem'],
    queryFn: async () => {
      const items = await base44.entities.ItemOP.filter({ etapa_atual: 'modelagem' }, 'data_entrada_etapa');
      return items;
    }
  });

  const movimentarItem = async (item, novaEtapa) => {
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
        setor_origem: 'modelagem',
        setor_destino: novaEtapa,
        usuario_email: currentUser?.email,
        usuario_nome: currentUser?.full_name || currentUser?.email,
        data_movimentacao: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['itens-modelagem'] });
      toast.success('Item movimentado com sucesso');
    } catch (error) {
      toast.error('Erro ao movimentar item');
    } finally {
      setLoadingItem(null);
    }
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
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Box className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Modelagem</h1>
            <p className="text-slate-500">Itens em processo de modelagem</p>
          </div>
        </div>
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium">
          {itens.length} itens na fila
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
            <ItemCard
              key={item.id}
              item={item}
              loading={loadingItem === item.id}
              avancarOpcoes={[
                { value: 'fundicao', label: 'Enviar p/ Fundição' }
              ]}
              retornarOpcoes={[
                { value: 'engenharia', label: 'Retornar p/ Engenharia' }
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