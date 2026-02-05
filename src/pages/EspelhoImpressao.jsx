import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EspelhoImpressao() {
  const urlParams = new URLSearchParams(window.location.search);
  const opId = urlParams.get('opId');

  const { data: op, isLoading: isLoadingOp } = useQuery({
    queryKey: ['ordemProducao', opId],
    queryFn: async () => {
      const ops = await base44.entities.OrdemProducao.filter({ id: opId });
      return ops[0];
    },
    enabled: !!opId,
  });

  const { data: itens = [], isLoading: isLoadingItens } = useQuery({
    queryKey: ['itensOP', opId],
    queryFn: () => base44.entities.ItemOP.filter({ op_id: opId }),
    enabled: !!opId,
  });

  useEffect(() => {
    if (op && !isLoadingOp && !isLoadingItens) {
      setTimeout(() => window.print(), 500);
    }
  }, [op, isLoadingOp, isLoadingItens]);

  if (isLoadingOp || isLoadingItens) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!op) {
    return <div className="p-8 text-center text-red-600">Ordem de Produção não encontrada.</div>;
  }

  const etapaLabels = {
    comercial: 'Comercial',
    engenharia: 'Engenharia',
    modelagem: 'Modelagem',
    suprimentos: 'Suprimentos',
    fundicao: 'Fundição',
    acabamento: 'Acabamento',
    usinagem: 'Usinagem',
    liberacao: 'Liberação',
    expedicao: 'Expedição',
    coleta: 'Coleta',
    suporte_industrial: 'Suporte Industrial',
    finalizado: 'Finalizado'
  };

  return (
    <>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container, .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page {
              margin: 1cm;
              size: A4;
            }
          }
        `}
      </style>
      
      <div className="print-container max-w-4xl mx-auto bg-white p-8">
        {/* Cabeçalho */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">ORDEM DE PRODUÇÃO</h1>
          <p className="text-sm text-gray-600">Espelho de Impressão - Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
        </div>

        {/* Dados da OP */}
        <div className="grid grid-cols-2 gap-6 mb-6 border border-gray-300 p-4 rounded">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Número da OP</p>
            <p className="text-lg font-bold text-gray-900">{op.numero_op}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</p>
            <p className="text-base font-semibold text-gray-900">{op.status === 'em_andamento' ? 'Em Andamento' : op.status === 'coleta' ? 'Coleta' : op.status === 'finalizado' ? 'Finalizado' : 'Cancelada'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Cliente</p>
            <p className="text-base text-gray-900">{op.cliente}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Equipamento Principal</p>
            <p className="text-base text-gray-900">{op.equipamento_principal}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Responsável</p>
            <p className="text-base text-gray-900">{op.responsavel}</p>
          </div>
          {op.ordem_compra && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Ordem de Compra</p>
              <p className="text-base text-gray-900">{op.ordem_compra}</p>
            </div>
          )}
          {op.data_lancamento && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Data de Lançamento</p>
              <p className="text-base text-gray-900">{format(new Date(op.data_lancamento), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </div>
          )}
        </div>

        {/* Itens */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
            Itens da Ordem ({itens.length})
          </h2>
          
          {itens.length === 0 ? (
            <p className="text-gray-600 italic">Nenhum item associado a esta OP.</p>
          ) : (
            <div className="space-y-3">
              {itens.map((item, index) => (
                <div key={item.id} className="border border-gray-300 p-4 rounded">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-base mb-1">{index + 1}. {item.descricao}</p>
                      <p className="text-sm text-gray-600">Código GA: {item.codigo_ga || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">Qtd: {item.quantidade}</p>
                      {item.peso && <p className="text-sm text-gray-600">{item.peso} kg</p>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                    {item.data_entrega && (
                      <div>
                        <span className="text-gray-500">Entrega: </span>
                        <span className="font-medium text-gray-900">{format(new Date(item.data_entrega), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Etapa: </span>
                      <span className="font-medium text-gray-900">{etapaLabels[item.etapa_atual] || item.etapa_atual}</span>
                    </div>
                  </div>

                  {item.observacao && (
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Observação</p>
                      <p className="text-sm text-gray-900">{item.observacao}</p>
                    </div>
                  )}

                  {item.retornado && item.justificativa_retorno && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs text-red-600 uppercase font-semibold mb-1">Item Retornado</p>
                      <p className="text-sm text-red-900">{item.justificativa_retorno}</p>
                    </div>
                  )}

                  {item.peso_expedicao && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Peso Expedição: </span>
                      <span className="font-medium text-gray-900">{item.peso_expedicao} kg</span>
                      {item.volume_expedicao && (
                        <>
                          <span className="text-gray-500 ml-4">Volume: </span>
                          <span className="font-medium text-gray-900">{item.volume_expedicao}</span>
                        </>
                      )}
                    </div>
                  )}

                  {item.categoria_suporte && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Categoria Suporte: </span>
                      <span className="font-medium text-gray-900">{item.categoria_suporte}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-gray-300 pt-4 mt-8 text-xs text-gray-500 text-center">
          <p>Sistema de Controle de Produção GNA</p>
        </div>
      </div>
    </>
  );
}