import React, { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ItensRetornados({ itens, onReenviar, loadingItem, etapaAtual }) {
  const [itensOcultos, setItensOcultos] = useState([]);
  const [processando, setProcessando] = useState(null);
  const queryClient = useQueryClient();

  const itensRetornados = itens.filter((item) => item.alerta_retorno === true && !itensOcultos.includes(item.id));

  if (itensRetornados.length === 0) return null;

  const ocultarItem = async (item) => {
    setProcessando(item.id);
    try {
      await base44.entities.ItemOP.update(item.id, {
        alerta_retorno: false
      });
      
      queryClient.invalidateQueries({ queryKey: ['itens-' + etapaAtual] });
      toast.success('Alerta removido');
      setItensOcultos((prev) => [...prev, item.id]);
    } catch (error) {
      toast.error('Erro ao remover alerta');
    } finally {
      setProcessando(null);
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
            
            {itensRetornados.map((item) =>
            <div key={item.id} className="bg-white rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{item.descricao}</p>
                    <p className="text-sm text-slate-600">OP: {item.numero_op}</p>
                    {item.codigo_ga &&
                  <p className="text-sm text-slate-600">Código GA: {item.codigo_ga}</p>
                  }
                  </div>
                  <Badge variant="destructive">Retornado</Badge>
                </div>
                
                {item.justificativa_retorno &&
              <div className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="text-sm font-semibold text-red-800 mb-1">Motivo do retorno:</p>
                    <p className="text-sm text-red-700">{item.justificativa_retorno}</p>
                    {item.data_entrada_etapa &&
                <p className="text-xs text-red-600 mt-2">
                        Retornado em: {format(new Date(item.data_entrada_etapa), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                }
                  </div>
              }
                
                <Button
                onClick={() => ocultarItem(item)}
                disabled={processando === item.id}
                variant="outline" 
                className="bg-slate-700 text-white hover:bg-slate-600 mt-2 w-full">
                  {processando === item.id ? 'Processando...' : 'OK'}
                </Button>
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </>);

}