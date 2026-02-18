import React, { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ItensRetornados({ itens, onReenviar, loadingItem, etapaAtual }) {
  const [itensOcultos, setItensOcultos] = useState([]);

  const itensRetornados = itens.filter(item => item.retornado === true && !itensOcultos.includes(item.id));

  if (itensRetornados.length === 0) return null;

  const ocultarItem = (itemId) => {
    setItensOcultos(prev => [...prev, itemId]);
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
                  onClick={() => ocultarItem(item.id)}
                  variant="outline"
                  className="w-full mt-2"
                >
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