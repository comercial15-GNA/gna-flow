import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Weight, Box, ChevronDown, ChevronUp, ArrowRight, RotateCcw, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const ETAPA_COLORS = {
  expedicao: 'bg-teal-100 text-teal-800',
  coleta: 'bg-purple-100 text-purple-800',
};

export default function VolumeCard({ volume, itensDoVolume, etapaAtual, onAcao, onRetornar, loadingVolume }) {
  const [expanded, setExpanded] = useState(false);

  const acaoLabel = etapaAtual === 'expedicao' ? 'Enviar p/ Coleta' : 'Finalizar Volume';
  const acaoColor = etapaAtual === 'expedicao' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-purple-600 hover:bg-purple-700';
  const retornarLabel = etapaAtual === 'expedicao' ? 'Retornar p/ Liberação' : 'Retornar p/ Expedição';

  return (
    <div className="rounded-xl border-2 border-blue-300 bg-blue-50 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800">{volume.numero_volume}</span>
                <Badge className="bg-blue-600 text-white text-xs">Volume</Badge>
                <Badge variant="outline" className="text-xs">{itensDoVolume.length} itens</Badge>
              </div>
              {volume.descricao && (
                <p className="text-sm text-slate-600 mt-0.5">{volume.descricao}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
                <Weight className="w-4 h-4 text-slate-400" />
                {volume.peso_expedicao} kg
              </div>
              {volume.volume_expedicao && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Box className="w-3 h-3" />
                  {volume.volume_expedicao}
                </div>
              )}
            </div>
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-blue-200 p-4 bg-white">
          {/* Informações do volume */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 p-3 bg-blue-50 rounded-lg text-sm">
            <div>
              <span className="text-slate-500">Peso Expedição:</span>
              <span className="font-semibold text-slate-800 ml-1">{volume.peso_expedicao} kg</span>
            </div>
            {volume.peso_total_itens && (
              <div>
                <span className="text-slate-500">Peso Itens:</span>
                <span className="font-semibold text-slate-800 ml-1">{volume.peso_total_itens.toFixed(2)} kg</span>
              </div>
            )}
            {volume.volume_expedicao && (
              <div>
                <span className="text-slate-500">Volume:</span>
                <span className="font-semibold text-slate-800 ml-1">{volume.volume_expedicao}</span>
              </div>
            )}
            {volume.informacoes_expedicao && (
              <div className="col-span-full">
                <span className="text-slate-500">Informações:</span>
                <span className="text-slate-700 ml-1">{volume.informacoes_expedicao}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500">Criado por:</span>
              <span className="text-slate-700 ml-1">{volume.criado_por_nome || '-'}</span>
            </div>
          </div>

          {/* Itens do volume */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">Itens neste volume:</p>
            <div className="space-y-2">
              {itensDoVolume.map(item => (
                <div key={item.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{item.descricao}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                        <span>GA: {item.codigo_ga || '-'}</span>
                        <span>Qtd: {item.quantidade}</span>
                        <span>Peso unit.: {item.peso ? `${item.peso} kg` : '-'}</span>
                        {item.data_entrega && (
                          <span>Entrega: {format(parseISO(item.data_entrega), 'dd/MM/yy')}</span>
                        )}
                        {item.responsavel_op && <span>Resp.: {item.responsavel_op}</span>}
                        {item.observacao && <span className="text-blue-600">Obs: {item.observacao}</span>}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-700 ml-3">
                      {item.peso ? `${((item.peso || 0) * (item.quantidade || 1)).toFixed(2)} kg` : '-'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => onAcao(volume, itensDoVolume)}
              disabled={loadingVolume === volume.id}
              className={acaoColor}
            >
              {etapaAtual === 'expedicao' ? <Check className="w-3 h-3 mr-1" /> : <Check className="w-3 h-3 mr-1" />}
              {acaoLabel}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetornar(volume, itensDoVolume)}
              disabled={loadingVolume === volume.id}
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {retornarLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}