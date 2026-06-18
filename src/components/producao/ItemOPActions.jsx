import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, History, ChevronDown, ChevronUp } from 'lucide-react';
import EditObservacaoDialog from './EditObservacaoDialog';
import HistoricoMovimentacoes from './HistoricoMovimentacoes';

export default function ItemOPActions({ item, onUpdate }) {
  const [editingObservacao, setEditingObservacao] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);

  return (
    <div className="mt-3 space-y-3">
      {/* Observação */}
      <div>
        {item.observacao ? (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-start justify-between">
              <strong className="text-xs text-blue-900">Observações:</strong>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingObservacao(true)}
                className="h-6 px-2 ml-2"
                title="Adicionar observação"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="mt-1 space-y-1">
              {item.observacao.split('\n').filter(Boolean).map((linha, idx) => (
                <p key={idx} className="text-xs text-blue-900 leading-relaxed whitespace-pre-wrap">
                  {linha}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingObservacao(true)}
            className="h-7 px-2 text-xs text-slate-500"
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar Observação
          </Button>
        )}
      </div>

      {/* Histórico */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHistorico(!showHistorico)}
          className="text-slate-600 hover:text-slate-800 p-0 h-auto text-xs"
        >
          <History className="w-3 h-3 mr-1" />
          {showHistorico ? 'Ocultar' : 'Ver'} Histórico
          {showHistorico ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
        {showHistorico && (
          <div className="mt-2 p-3 bg-slate-50 rounded-lg">
            <HistoricoMovimentacoes itemId={item.id} />
          </div>
        )}
      </div>

      <EditObservacaoDialog
        item={item}
        open={editingObservacao}
        onOpenChange={setEditingObservacao}
        onSuccess={onUpdate}
      />
    </div>
  );
}