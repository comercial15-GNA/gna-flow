import React from 'react';

const ETAPA_CONFIG = {
  comercial: { label: 'Comercial', color: '#3b82f6' },
  engenharia: { label: 'Engenharia', color: '#22c55e' },
  modelagem: { label: 'Modelagem', color: '#eab308' },
  suprimentos: { label: 'Suprimentos', color: '#f97316' },
  fundicao: { label: 'Fundição', color: '#ef4444' },
  usinagem: { label: 'Usinagem', color: '#06b6d4' },
  liberacao: { label: 'Liberação', color: '#10b981' },
  expedicao: { label: 'Expedição', color: '#14b8a6' },
  finalizado: { label: 'Finalizado', color: '#a855f7' }
};

const ETAPA_ORDER = ['comercial', 'engenharia', 'modelagem', 'suprimentos', 'fundicao', 'usinagem', 'liberacao', 'expedicao', 'finalizado'];

export default function EtapaChart({ itens, onEtapaClick, etapaSelecionada }) {
  // Contar itens por etapa
  const itensPorEtapa = ETAPA_ORDER.reduce((acc, etapa) => {
    acc[etapa] = itens.filter(i => i.etapa_atual === etapa).length;
    return acc;
  }, {});

  const maxCount = Math.max(...Object.values(itensPorEtapa), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Distribuição por Etapa</h3>
      <div className="space-y-3">
        {ETAPA_ORDER.map((etapa) => {
          const count = itensPorEtapa[etapa];
          const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const config = ETAPA_CONFIG[etapa];
          const isSelected = etapaSelecionada === etapa;
          
          return (
            <button
              key={etapa}
              onClick={() => onEtapaClick(etapa)}
              className={`w-full text-left transition-all ${isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>
                  {config.label}
                </span>
                <span className={`text-xs font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                  {count}
                </span>
              </div>
              <div className={`w-full bg-slate-100 rounded-full h-2.5 ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}>
                <div 
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${percent}%`, 
                    backgroundColor: config.color,
                    minWidth: count > 0 ? '8px' : '0'
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">Total de itens:</span>
        <span className="text-sm font-bold text-slate-800">{itens.length}</span>
      </div>
    </div>
  );
}