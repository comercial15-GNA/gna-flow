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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Settings, 
  Search,
  Edit2,
  UserX,
  UserCheck,
  Mail,
  Shield,
  Key
} from 'lucide-react';
import { toast } from 'sonner';

const SETORES = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'engenharia', label: 'Engenharia' },
  { value: 'modelagem', label: 'Modelagem' },
  { value: 'suprimentos', label: 'Suprimentos' },
  { value: 'fundicao', label: 'Fundição' },
  { value: 'acabamento', label: 'Acabamento' },
  { value: 'usinagem', label: 'Usinagem' },
  { value: 'caldeiraria', label: 'Caldeiraria' },
  { value: 'liberacao', label: 'Liberação' },
  { value: 'expedicao', label: 'Expedição' },
  { value: 'lideranca', label: 'Liderança' },
];

const AVAILABLE_PAGES = [
  { value: 'Comercial', label: 'Comercial' },
  { value: 'RelatoriosPeso', label: 'Relatório de Peso' },
  { value: 'Engenharia', label: 'Engenharia' },
  { value: 'Modelagem', label: 'Modelagem' },
  { value: 'Suprimentos', label: 'Suprimentos' },
  { value: 'Fundicao', label: 'Fundição' },
  { value: 'Acabamento', label: 'Acabamento' },
  { value: 'Usinagem', label: 'Usinagem' },
  { value: 'Caldeiraria', label: 'Caldeiraria' },
  { value: 'Liberacao', label: 'Liberação' },
  { value: 'Expedicao', label: 'Expedição' },
  { value: 'SuporteIndustrial', label: 'Suporte Industrial' },
  { value: 'Coleta', label: 'Coleta' },
  { value: 'Lideranca', label: 'Liderança' },
  { value: 'Administracao', label: 'Administração' },
];

const SETOR_COLORS = {
  administrador: 'bg-purple-100 text-purple-800',
  comercial: 'bg-blue-100 text-blue-800',
  engenharia: 'bg-green-100 text-green-800',
  modelagem: 'bg-yellow-100 text-yellow-800',
  suprimentos: 'bg-orange-100 text-orange-800',
  fundicao: 'bg-red-100 text-red-800',
  acabamento: 'bg-pink-100 text-pink-800',
  usinagem: 'bg-cyan-100 text-cyan-800',
  caldeiraria: 'bg-amber-100 text-amber-800',
  liberacao: 'bg-emerald-100 text-emerald-800',
  expedicao: 'bg-teal-100 text-teal-800',
  lideranca: 'bg-indigo-100 text-indigo-800',
};

export default function Administracao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', apelido: '', setor: '', ativo: true });
  const [selectedPages, setSelectedPages] = useState([]);
  
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Sincronizar automaticamente usuários com ResponsavelOP ao carregar
  React.useEffect(() => {
    const sincronizarResponsaveis = async () => {
      if (!users || users.length === 0) return;
      
      try {
        const responsaveisExistentes = await base44.entities.ResponsavelOP.list();
        const idsExistentes = responsaveisExistentes.map(r => r.user_id);
        
        // Criar registros para usuários que não existem ainda em ResponsavelOP
        for (const user of users) {
          if (!idsExistentes.includes(user.id)) {
            await base44.entities.ResponsavelOP.create({
              user_id: user.id,
              apelido: user.apelido || user.full_name || user.email.split('@')[0],
              nome_completo: user.full_name || '',
              email: user.email,
              ativo: user.ativo !== false
            });
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['responsaveis-op'] });
      } catch (error) {
        console.error('Erro ao sincronizar responsáveis:', error);
      }
    };
    
    sincronizarResponsaveis();
  }, [users]);

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.User.update(id, data);
      
      // Sincronizar com ResponsavelOP apenas se houver mudanças relevantes
      if (data.apelido !== undefined || data.full_name !== undefined || data.ativo !== undefined) {
        const user = users.find(u => u.id === id);
        if (user) {
          const existingResp = await base44.entities.ResponsavelOP.filter({ user_id: id });
          
          const respData = {
            apelido: data.apelido !== undefined ? data.apelido : user.apelido,
            nome_completo: data.full_name !== undefined ? data.full_name : user.full_name,
            ativo: data.ativo !== undefined ? data.ativo : (user.ativo !== false)
          };
          
          if (existingResp.length > 0) {
            await base44.entities.ResponsavelOP.update(existingResp[0].id, respData);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['responsaveis-op'] });
      toast.success('Usuário atualizado com sucesso');
      setEditDialogOpen(false);
      setPermissionsDialogOpen(false);
      setEditingUser(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar usuário');
    }
  });

  if (currentUser && currentUser.setor !== 'administrador') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-500">Esta área é exclusiva para Administradores.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.apelido?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      apelido: user.apelido || '',
      setor: user.setor || '',
      ativo: user.ativo !== false
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.setor) {
      toast.error('É obrigatório definir um setor');
      return;
    }
    updateUserMutation.mutate({
      id: editingUser.id,
      data: {
        full_name: editForm.full_name,
        apelido: editForm.apelido,
        setor: editForm.setor,
        ativo: editForm.ativo
      }
    });
  };

  const handleToggleActive = (user) => {
    updateUserMutation.mutate({
      id: user.id,
      data: { ativo: user.ativo === false ? true : false }
    });
  };

  const handleManagePermissions = (user) => {
    setEditingUser(user);
    setSelectedPages(user.allowed_pages || []);
    setPermissionsDialogOpen(true);
  };

  const handleTogglePage = (pageValue) => {
    setSelectedPages(prev => {
      if (prev.includes(pageValue)) {
        return prev.filter(p => p !== pageValue);
      } else {
        return [...prev, pageValue];
      }
    });
  };

  const handleSavePermissions = () => {
    updateUserMutation.mutate({
      id: editingUser.id,
      data: { allowed_pages: selectedPages.length > 0 ? selectedPages : null }
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Administração do Sistema</h1>
            <p className="text-slate-500">Gerencie usuários e permissões</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{users.length}</p>
              <p className="text-xs text-slate-500">Total de Usuários</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {users.filter(u => u.ativo !== false && u.setor).length}
              </p>
              <p className="text-xs text-slate-500">Ativos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {users.filter(u => u.ativo === false).length}
              </p>
              <p className="text-xs text-slate-500">Inativos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {users.filter(u => !u.setor).length}
              </p>
              <p className="text-xs text-slate-500">Sem Setor</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, email ou apelido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Mail className="w-4 h-4" />
            <span>Para adicionar novos usuários, use "Convidar Usuários" no menu do Base44</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nome</TableHead>
              <TableHead>Apelido (Responsável)</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-600">
                          {(user.full_name || user.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-slate-800">
                        {user.full_name || 'Sem nome'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {user.apelido || '-'}
                  </TableCell>
                  <TableCell className="text-slate-600">{user.email}</TableCell>
                  <TableCell>
                    {user.setor ? (
                      <Badge className={SETOR_COLORS[user.setor]}>
                        {SETORES.find(s => s.value === user.setor)?.label || user.setor}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Sem setor
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.ativo !== false ? (
                      <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        className="text-slate-600 hover:text-slate-800"
                        title="Editar usuário"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleManagePermissions(user)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Gerenciar permissões de páginas"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                        className={user.ativo !== false ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                        title={user.ativo !== false ? "Desativar usuário" : "Ativar usuário"}
                      >
                        {user.ativo !== false ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-sm text-slate-500">Email</Label>
              <p className="font-medium text-slate-800">{editingUser?.email}</p>
            </div>
            <div>
              <Label>Nome Completo</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Nome completo do usuário"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Apelido (Nome para vincular como Responsável nas OPs)</Label>
              <Input
                value={editForm.apelido}
                onChange={(e) => setEditForm({ ...editForm, apelido: e.target.value })}
                placeholder="Ex: João Silva"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Setor *</Label>
              <Select
                value={editForm.setor}
                onValueChange={(value) => setEditForm({ ...editForm, setor: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {SETORES.map((setor) => (
                    <SelectItem key={setor.value} value={setor.value}>
                      {setor.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={editForm.ativo}
                onChange={(e) => setEditForm({ ...editForm, ativo: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="ativo">Usuário Ativo</Label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Gerenciar Permissões de Páginas
            </DialogTitle>
            <DialogDescription>
              Selecione as páginas que <strong>{editingUser?.full_name || editingUser?.email}</strong> poderá acessar. Se nenhuma página for selecionada, o usuário terá acesso apenas às páginas do seu setor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Atenção:</strong> Ao selecionar páginas específicas, o acesso padrão por setor será substituído pelas páginas escolhidas aqui.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-base font-semibold">Páginas Disponíveis:</Label>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_PAGES.map((page) => (
                  <div
                    key={page.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPages.includes(page.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => handleTogglePage(page.value)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPages.includes(page.value)}
                      onChange={() => handleTogglePage(page.value)}
                      className="rounded"
                    />
                    <Label className="cursor-pointer flex-1">{page.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {selectedPages.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-2">
                  <strong>Páginas selecionadas ({selectedPages.length}):</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPages.map((pageValue) => {
                    const page = AVAILABLE_PAGES.find(p => p.value === pageValue);
                    return (
                      <Badge key={pageValue} className="bg-blue-100 text-blue-800">
                        {page?.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSavePermissions} 
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? 'Salvando...' : 'Salvar Permissões'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}