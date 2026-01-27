import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Shield, Edit2, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

const TODAS_PAGINAS = [
  { name: 'Administracao', label: 'Administração', setor: 'administrador' },
  { name: 'CriarOP', label: 'Criar OP', setores: ['administrador', 'comercial'] },
  { name: 'Comercial', label: 'Comercial', setores: ['administrador', 'comercial'] },
  { name: 'RelatoriosPeso', label: 'Relatórios', setores: ['administrador', 'comercial'] },
  { name: 'Engenharia', label: 'Engenharia', setores: ['administrador', 'engenharia'] },
  { name: 'PainelEngenharia', label: 'Painel Engenharia', setores: ['administrador', 'engenharia'] },
  { name: 'Modelagem', label: 'Modelagem', setores: ['administrador', 'modelagem'] },
  { name: 'PainelModelagem', label: 'Painel Modelagem', setores: ['administrador', 'modelagem'] },
  { name: 'Suprimentos', label: 'Suprimentos', setores: ['administrador', 'suprimentos'] },
  { name: 'PainelSuprimentos', label: 'Painel Suprimentos', setores: ['administrador', 'suprimentos'] },
  { name: 'Fundicao', label: 'Fundição', setores: ['administrador', 'fundicao'] },
  { name: 'PainelFundicao', label: 'Painel Fundição', setores: ['administrador', 'fundicao'] },
  { name: 'Acabamento', label: 'Acabamento', setores: ['administrador', 'acabamento'] },
  { name: 'PainelAcabamento', label: 'Painel Acabamento', setores: ['administrador', 'acabamento'] },
  { name: 'Usinagem', label: 'Usinagem', setores: ['administrador', 'usinagem'] },
  { name: 'PainelUsinagem', label: 'Painel Usinagem', setores: ['administrador', 'usinagem'] },
  { name: 'Liberacao', label: 'Liberação', setores: ['administrador', 'liberacao'] },
  { name: 'PainelLiberacao', label: 'Painel Liberação', setores: ['administrador', 'liberacao'] },
  { name: 'Expedicao', label: 'Expedição', setores: ['administrador', 'expedicao'] },
  { name: 'PainelExpedicao', label: 'Painel Expedição', setores: ['administrador', 'expedicao'] },
  { name: 'Coleta', label: 'Coleta', setores: ['administrador', 'expedicao', 'liberacao', 'acabamento'] },
  { name: 'SuporteIndustrial', label: 'Suporte Industrial', setores: ['administrador', 'lideranca', 'liberacao'] },
  { name: 'Lideranca', label: 'Liderança', setores: ['administrador', 'lideranca'] },
];

export default function PermissoesTab({ users, queryClient, updateUserMutation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPages, setSelectedPages] = useState([]);

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.apelido?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditPermissions = (user) => {
    setSelectedUser(user);
    setSelectedPages(user.allowed_pages || []);
    setDialogOpen(true);
  };

  const handleTogglePage = (pageName) => {
    setSelectedPages(prev => {
      if (prev.includes(pageName)) {
        return prev.filter(p => p !== pageName);
      } else {
        return [...prev, pageName];
      }
    });
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;

    updateUserMutation.mutate({
      id: selectedUser.id,
      data: { allowed_pages: selectedPages }
    }, {
      onSuccess: () => {
        toast.success('Permissões atualizadas');
        setDialogOpen(false);
        setSelectedUser(null);
        setSelectedPages([]);
      }
    });
  };

  const handleSelectAll = () => {
    if (!selectedUser || !selectedUser.setor) return;
    
    const paginasDoSetor = TODAS_PAGINAS.filter(p => {
      if (p.setor) return p.setor === selectedUser.setor;
      if (p.setores) return p.setores.includes(selectedUser.setor);
      return false;
    }).map(p => p.name);
    
    setSelectedPages(paginasDoSetor);
  };

  const handleClearAll = () => {
    setSelectedPages([]);
  };

  // Páginas disponíveis para o setor do usuário selecionado
  const paginasDisponiveis = selectedUser && selectedUser.setor 
    ? TODAS_PAGINAS.filter(p => {
        if (p.setor) return p.setor === selectedUser.setor;
        if (p.setores) return p.setores.includes(selectedUser.setor);
        return false;
      })
    : [];

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const allowedCount = user.allowed_pages?.length || 0;
          const hasRestrictions = user.allowed_pages && user.allowed_pages.length > 0;
          
          return (
            <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-600">
                      {(user.full_name || user.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{user.full_name || 'Sem nome'}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-3">
                {user.setor ? (
                  <Badge variant="outline" className="text-xs">
                    {user.setor}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                    Sem setor
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {hasRestrictions ? (
                    <>
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-slate-600">
                        {allowedCount} {allowedCount === 1 ? 'página' : 'páginas'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-slate-600">Acesso total</span>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditPermissions(user)}
                  disabled={!user.setor}
                  className="text-slate-600 hover:text-slate-800"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Permissões de Acesso</DialogTitle>
            <DialogDescription>
              Defina quais páginas {selectedUser?.full_name || selectedUser?.email} pode acessar
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 pt-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-800">{selectedUser.full_name}</p>
                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                    <Badge className="mt-2" variant="outline">{selectedUser.setor}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      Selecionar Todas
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearAll}>
                      <X className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {selectedPages.length === 0 
                    ? 'Acesso total (todas as páginas do setor)' 
                    : `${selectedPages.length} ${selectedPages.length === 1 ? 'página selecionada' : 'páginas selecionadas'}`
                  }
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-slate-700 mb-3">Páginas Disponíveis</h4>
                <div className="space-y-2">
                  {paginasDisponiveis.map((pagina) => (
                    <div key={pagina.name} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                      <Checkbox
                        id={pagina.name}
                        checked={selectedPages.includes(pagina.name)}
                        onCheckedChange={() => handleTogglePage(pagina.name)}
                      />
                      <label
                        htmlFor={pagina.name}
                        className="flex-1 text-sm font-medium text-slate-700 cursor-pointer"
                      >
                        {pagina.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePermissions} disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? 'Salvando...' : 'Salvar Permissões'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}