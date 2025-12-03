import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ClipboardList, 
  Plus, 
  Search,
  FileText,
  Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import OPCard from '@/components/producao/OPCard';

export default function Comercial() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Buscar OPs ordenadas pela data de lançamento (mais antigas primeiro)
  const { data: ops = [], isLoading: loadingOPs } = useQuery({
    queryKey: ['ops-comercial'],
    queryFn: () => base44.entities.OrdemProducao.list('data_lancamento'),
  });

  // Buscar todos os itens
  const { data: itens = [] } = useQuery({
    queryKey: ['itens-all'],
    queryFn: () => base44.entities.ItemOP.list(),
  });

  // Filtrar OPs que o usuário pode ver (criadas por ele ou é responsável)
  const opsVisiveis = ops.filter(op => {
    if (currentUser?.setor === 'administrador') return true;
    return op.created_by === currentUser?.email || op.responsavel_email === currentUser?.email;
  });

  // Filtro por busca
  const opsFiltradas = opsVisiveis.filter(op =>
    op.numero_op?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.equipamento_principal?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Comercial</h1>
            <p className="text-slate-500">Suas Ordens de Produção</p>
          </div>
        </div>
        <Link to={createPageUrl('CriarOP')}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova OP
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{opsVisiveis.length}</p>
              <p className="text-xs text-slate-500">Total OPs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {opsVisiveis.filter(op => op.status === 'em_andamento').length}
              </p>
              <p className="text-xs text-slate-500">Em Andamento</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {opsVisiveis.filter(op => op.status === 'finalizada').length}
              </p>
              <p className="text-xs text-slate-500">Finalizadas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {itens.filter(i => opsVisiveis.some(op => op.id === i.op_id)).length}
              </p>
              <p className="text-xs text-slate-500">Total Itens</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por OP, cliente ou equipamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lista de OPs */}
      {loadingOPs ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
        </div>
      ) : opsFiltradas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhuma OP encontrada</h3>
          <p className="text-slate-500 mb-4">Crie sua primeira Ordem de Produção</p>
          <Link to={createPageUrl('CriarOP')}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova OP
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {opsFiltradas.map((op) => (
            <OPCard key={op.id} op={op} itens={itens} showItens={true} />
          ))}
        </div>
      )}
    </div>
  );
}