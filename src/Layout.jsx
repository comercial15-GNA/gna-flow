import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  Factory, 
  ClipboardList, 
  Settings, 
  Cog, 
  Box, 
  Truck, 
  Flame, 
  Wrench, 
  CheckCircle, 
  Users, 
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SETOR_CONFIG = {
  administrador: {
    label: 'Administrador',
    icon: Settings,
    color: 'bg-purple-500',
    pages: ['Administracao', 'CriarOP', 'Comercial', 'Engenharia', 'Modelagem', 'Suprimentos', 'Fundicao', 'Usinagem', 'Liberacao', 'Expedicao', 'Lideranca']
  },
  comercial: {
    label: 'Comercial',
    icon: ClipboardList,
    color: 'bg-blue-500',
    pages: ['CriarOP', 'Comercial']
  },
  engenharia: {
    label: 'Engenharia',
    icon: Cog,
    color: 'bg-green-500',
    pages: ['Engenharia']
  },
  modelagem: {
    label: 'Modelagem',
    icon: Box,
    color: 'bg-yellow-500',
    pages: ['Modelagem']
  },
  suprimentos: {
    label: 'Suprimentos',
    icon: Truck,
    color: 'bg-orange-500',
    pages: ['Suprimentos']
  },
  fundicao: {
    label: 'Fundição',
    icon: Flame,
    color: 'bg-red-500',
    pages: ['Fundicao']
  },
  usinagem: {
    label: 'Usinagem',
    icon: Wrench,
    color: 'bg-cyan-500',
    pages: ['Usinagem']
  },
  liberacao: {
    label: 'Liberação',
    icon: CheckCircle,
    color: 'bg-emerald-500',
    pages: ['Liberacao']
  },
  expedicao: {
    label: 'Expedição',
    icon: Truck,
    color: 'bg-teal-500',
    pages: ['Expedicao']
  },
  lideranca: {
    label: 'Liderança',
    icon: Users,
    color: 'bg-indigo-500',
    pages: ['Lideranca']
  }
};

const NAV_ITEMS = [
  { name: 'Administracao', label: 'Administração', icon: Settings, setor: 'administrador' },
  { name: 'CriarOP', label: 'Criar OP', icon: ClipboardList, setores: ['administrador', 'comercial'] },
  { name: 'Comercial', label: 'Comercial', icon: ClipboardList, setores: ['administrador', 'comercial'] },
  { name: 'Engenharia', label: 'Engenharia', icon: Cog, setores: ['administrador', 'engenharia'] },
  { name: 'Modelagem', label: 'Modelagem', icon: Box, setores: ['administrador', 'modelagem'] },
  { name: 'Suprimentos', label: 'Suprimentos', icon: Truck, setores: ['administrador', 'suprimentos'] },
  { name: 'Fundicao', label: 'Fundição', icon: Flame, setores: ['administrador', 'fundicao'] },
  { name: 'Usinagem', label: 'Usinagem', icon: Wrench, setores: ['administrador', 'usinagem'] },
  { name: 'Liberacao', label: 'Liberação', icon: CheckCircle, setores: ['administrador', 'liberacao'] },
  { name: 'Expedicao', label: 'Expedição', icon: Truck, setores: ['administrador', 'expedicao'] },
  { name: 'Lideranca', label: 'Liderança', icon: LayoutDashboard, setores: ['administrador', 'lideranca'] },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Redirecionar se usuário não tem setor ou está inativo
        if (!userData.setor) {
          // Se não tem setor, mostrar mensagem
        } else if (userData.ativo === false) {
          // Usuário inativo
        }
      } catch (error) {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Usuário sem setor
  if (!user.setor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Aguardando Configuração</h1>
          <p className="text-slate-600 mb-6">
            Seu usuário ainda não foi vinculado a um setor. Entre em contato com o Administrador do sistema.
          </p>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  // Usuário inativo
  if (user.ativo === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Desativado</h1>
          <p className="text-slate-600 mb-6">
            Seu acesso ao sistema foi desativado. Entre em contato com o Administrador.
          </p>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const userSetor = user.setor;
  const setorConfig = SETOR_CONFIG[userSetor];
  const SetorIcon = setorConfig?.icon || Settings;

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.setor) return userSetor === item.setor;
    if (item.setores) return item.setores.includes(userSetor);
    return false;
  });

  // Verificar se é uma página de painel (tela cheia)
  const isPainelPage = currentPageName && currentPageName.startsWith('Painel');

  // Se for página de painel, renderizar sem layout
  if (isPainelPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Factory className="w-6 h-6 text-slate-800" />
              <span className="font-bold text-slate-800">GNA</span>
            </div>
          </div>
          <div className={cn("px-2 py-1 rounded-full text-xs font-medium text-white", setorConfig?.color)}>
            {setorConfig?.label}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <div className="w-72 h-full bg-white" onClick={e => e.stopPropagation()}>
            <SidebarContent 
              user={user}
              setorConfig={setorConfig}
              SetorIcon={SetorIcon}
              visibleNavItems={visibleNavItems}
              currentPageName={currentPageName}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-72 lg:bg-white lg:border-r lg:border-slate-200">
        <SidebarContent 
          user={user}
          setorConfig={setorConfig}
          SetorIcon={SetorIcon}
          visibleNavItems={visibleNavItems}
          currentPageName={currentPageName}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content */}
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({ user, setorConfig, SetorIcon, visibleNavItems, currentPageName, onLogout, onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg">Controle GNA</h1>
              <p className="text-xs text-slate-500">Produção</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
        
        {/* User Info */}
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", setorConfig?.color)}>
              <SetorIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate text-sm">{user.full_name || user.email}</p>
              <p className="text-xs text-slate-500">{setorConfig?.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.name;
            
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-slate-800 text-white shadow-lg" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair do Sistema
        </Button>
      </div>
    </div>
  );
}