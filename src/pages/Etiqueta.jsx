import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Printer, Shield, Monitor } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EtiquetaOPTab from '@/components/etiqueta/EtiquetaOPTab';
import EtiquetaPersonalizadaTab from '@/components/etiqueta/EtiquetaPersonalizadaTab';

export default function Etiqueta() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (!isDesktop) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <Monitor className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Uso exclusivo em computador</h2>
          <p className="text-slate-500">
            A impressão de etiquetas está disponível apenas em computadores desktop, para garantir o
            dimensionamento correto e a compatibilidade com as impressoras Zebra.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  const temAcesso = currentUser?.setor === 'administrador' ||
    (Array.isArray(currentUser?.allowed_pages) && currentUser.allowed_pages.includes('Etiqueta'));

  if (!temAcesso) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Acesso Restrito</h2>
          <p className="text-slate-500">Solicite ao Administrador a liberação da tela Imprimir Etiqueta.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
          <Printer className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Imprimir Etiqueta</h1>
          <p className="text-slate-500">Identificação de peças prontas na Expedição</p>
        </div>
      </div>

      <Tabs defaultValue="op" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="op">Etiqueta da OP</TabsTrigger>
          <TabsTrigger value="personalizada">Etiqueta Personalizada</TabsTrigger>
        </TabsList>
        <TabsContent value="op">
          <EtiquetaOPTab />
        </TabsContent>
        <TabsContent value="personalizada">
          <EtiquetaPersonalizadaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}