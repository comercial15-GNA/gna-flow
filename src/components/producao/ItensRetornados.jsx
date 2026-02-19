import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ItensRetornados({ itens, onReenviar, loadingItem, etapaAtual, onAcknowledge }) {
  const queryClient = useQueryClient();

  const itensRetornados = itens.filter(item => item.retornado === true);

  if (itensRetornados.length === 0) return null;

  const handleAcknowledge = async (item) => {
    try {
      await base44.entities.ItemOP.update(item.id, {
        retornado: false,
        justificativa_retorno: ''
      });
      
      // Invalida as queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: ['itens-acabamento'] });
      queryClient.invalidateQueries({ queryKey: ['itens-engenharia'] });
      queryClient.invalidateQueries({ queryKey: ['itens-modelagem'] });
      queryClient.invalidateQueries({ queryKey: ['itens-suprimentos'] });
      queryClient.invalidateQueries({ queryKey: ['itens-fundicao'] });
      queryClient.invalidateQueries({ queryKey: ['itens-usinagem'] });
      queryClient.invalidateQueries({ queryKey: ['itens-caldeiraria'] });
      queryClient.invalidateQueries({ queryKey: ['todos-itens-ops'] });
      
      if (onAcknowledge) {
        onAcknowledge();
      }
      
      toast.success('Item reconhecido com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item');
    }
  };

  return (
    <>
      <Alert variant="destructive" className="mb-6 border-2 border-red-500">
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription>
          <div className="space-y-4 mt-2">
            <p className="font-semibold text-lg">
              {itensRetornados.length} {itensRetornados.length === 1 ? 'item retornado' : 'itens retornados'} nesta etapa
            </p>
            
            {itensRetornados.map(item => (
              <div key={item.id} className="bg-white rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{item.descricao}</p>
                    <p className="text-sm text-slate-600">OP: {item.numero_op}</p>
                    {item.codigo_ga && (
                      <p className="text-sm text-slate-600">Código GA: {item.codigo_ga}</p>
                    )}
                  </div>
                  <Badge variant="destructive">Retornado</Badge>
                </div>
                
                {item.justificativa_retorno && (
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="text-sm font-semibold text-red-800 mb-1">Motivo do retorno:</p>
                    <p className="text-sm text-red-700">{item.justificativa_retorno}</p>
                    {item.data_entrada_etapa && (
                      <p className="text-xs text-red-600 mt-2">
                        Retornado em: {format(new Date(item.data_entrada_etapa), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                )}
                
                <Button 
                  onClick={() => handleAcknowledge(item)}
                  disabled={loadingItem === item.id}
                  className="w-full mt-2 bg-green-600 hover:bg-green-700"
                >
                  <Check className="mr-2 w-4 h-4" />
                  OK
                </Button>
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    </>
  );
}