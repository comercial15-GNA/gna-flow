import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Edit2, History, ChevronDown, ChevronUp } from 'lucide-react';
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
          <div className="p-2 bg-blue-50 border border-blue-200 rounded flex items-start justify-between">
            <p className="text-xs text-blue-900 flex-1">
              <strong>Observação:</strong> {item.observacao}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingObservacao(true)}
              className="h-6 px-2 ml-2"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingObservacao(true)}
            className="h-7 px-2 text-xs text-slate-500"
          >
            <Edit2 className="w-3 h-3 mr-1" />
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