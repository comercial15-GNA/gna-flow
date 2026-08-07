import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, X, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function AlertaNovaOP() {
  const location = useLocation();
  const [numeroOp, setNumeroOp] = useState(null);

  useEffect(() => {
    if (location.state?.novaOp) {
      setNumeroOp(location.state.novaOp);
    }
  }, [location.state]);

  const fechar = () => setNumeroOp(null);

  const copiar = () => {
    navigator.clipboard?.writeText(numeroOp);
    toast.success('Número copiado');
  };

  if (!numeroOp) return null;

  return (
    <div className="mb-6 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-emerald-800">Ordem criada com sucesso!</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-emerald-900 tracking-wide">{numeroOp}</span>
              <button
                onClick={copiar}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-md transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copiar
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={fechar}
          className="text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg p-1.5 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}