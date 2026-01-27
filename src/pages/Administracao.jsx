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
  ClipboardList,
  Plus,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OPCard from '@/components/producao/OPCard';
import AdminEditOPDialog from '@/components/producao/AdminEditOPDialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const SETORES = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'engenharia', label: 'Engenharia' },
  { value: 'modelagem', label: 'Modelagem' },
  { value: 'suprimentos', label: 'Suprimentos' },
  { value: 'fundicao', label: 'Fundição' },
  { value: 'acabamento', label: 'Acabamento' },
  { value: 'usinagem', label: 'Usinagem' },
  { value: 'liberacao', label: 'Liberação' },
  { value: 'expedicao', label: 'Expedição' },
  { value: 'lideranca', label: 'Liderança' },
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
  liberacao: 'bg-emerald-100 text-emerald-800',
  expedicao: 'bg-teal-100 text-teal-800',
  lideranca: 'bg-indigo-100 text-indigo-800',
};

export default function Administracao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', apelido: '', setor: '', ativo: true });
  const [adminEditOP, setAdminEditOP] = useState(null);
  const [adminEditOPOpen, setAdminEditOPOpen] = useState(false);
  const [searchOP, setSearchOP] = useState('');
  const [statusFilterOP, setStatusFilterOP] = useState('todos');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: ops = [] } = useQuery({
    queryKey: ['ops-admin'],
    queryFn: () => base44.entities.OrdemProducao.list('data_lancamento'),
  });

  const { data: itens = [] } = useQuery({
    queryKey: ['itens-admin'],
    queryFn: () => base44.entities.ItemOP.list(),
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
      
      // Sincronizar com ResponsavelOP
      const user = users.find(u => u.id === id);
      if (user) {
        const existingResp = await base44.entities.ResponsavelOP.filter({ user_id: id });
        
        const respData = {
          user_id: id,
          apelido: data.apelido || user.apelido,
          nome_completo: data.full_name || user.full_name,
          email: user.email,
          ativo: data.ativo !== undefined ? data.ativo : (user.ativo !== false)
        };
        
        if (existingResp.length > 0) {
          await base44.entities.ResponsavelOP.update(existingResp[0].id, respData);
        } else {
          await base44.entities.ResponsavelOP.create(respData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['responsaveis-op'] });
      toast.success('Usuário atualizado com sucesso');
      setEditDialogOpen(false);
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

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email é obrigatório');
      return;
    }
    
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast.success(`Convite enviado para ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      toast.error('Erro ao enviar convite');
    } finally {
      setInviting(false);
    }
  };

  const handleAdminEditOP = (op) => {
    setAdminEditOP(op);
    setAdminEditOPOpen(true);
  };

  const opsFiltradas = ops.filter(op => {
    const matchSearch = !searchOP || 
      op.numero_op?.toLowerCase().includes(searchOP.toLowerCase()) ||
      op.cliente?.toLowerCase().includes(searchOP.toLowerCase()) ||
      op.equipamento_principal?.toLowerCase().includes(searchOP.toLowerCase()) ||
      op.ordem_compra?.toLowerCase().includes(searchOP.toLowerCase());
    const matchStatus = statusFilterOP === 'todos' || op.status === statusFilterOP;
    return matchSearch && matchStatus;
  });

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

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="ops" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Todas as OPs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
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
          <Button onClick={() => setInviteDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Mail className="w-4 h-4 mr-2" />
            Convidar Usuário
          </Button>
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
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                        className={user.ativo !== false ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
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

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
            <DialogDescription>
              Envie um convite por email para um novo usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Função no Sistema</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Após aceitar o convite, você pode configurar o setor do usuário
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleInviteUser} disabled={inviting}>
                {inviting ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="ops">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{ops.length}</p>
                  <p className="text-xs text-slate-500">Total de OPs</p>
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
                    {ops.filter(op => op.status === 'em_andamento').length}
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
                    {ops.filter(op => op.status === 'coleta').length}
                  </p>
                  <p className="text-xs text-slate-500">Coleta</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{itens.length}</p>
                  <p className="text-xs text-slate-500">Total Itens</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por OP, O.C, cliente ou equipamento..."
                  value={searchOP}
                  onChange={(e) => setSearchOP(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilterOP} onValueChange={setStatusFilterOP}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="coleta">Coleta</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {ops.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhuma OP cadastrada</h3>
              <p className="text-slate-500 mb-4">Crie a primeira Ordem de Produção</p>
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
                <OPCard
                  key={op.id}
                  op={op}
                  itens={itens}
                  showItens={true}
                  isAdmin={true}
                  onAdminEdit={handleAdminEditOP}
                  onItemUpdate={() => {
                    queryClient.invalidateQueries({ queryKey: ['itens-admin'] });
                    queryClient.invalidateQueries({ queryKey: ['ops-admin'] });
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AdminEditOPDialog
        op={adminEditOP}
        open={adminEditOPOpen}
        onOpenChange={setAdminEditOPOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['ops-admin'] });
          queryClient.invalidateQueries({ queryKey: ['itens-admin'] });
        }}
      />
    </div>
  );
}