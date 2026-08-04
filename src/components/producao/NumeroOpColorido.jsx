import React from 'react';
import { cn } from '@/lib/utils';

const TIPO_STYLES = {
  op: 'bg-slate-700 text-white',
  or: 'bg-orange-500 text-white',
  of: 'bg-blue-600 text-white',
};

export function inferTipoOrdem(numeroOp) {
  if (!numeroOp) return 'op';
  if (numeroOp.startsWith('OR-')) return 'or';
  if (numeroOp.startsWith('OF-')) return 'of';
  return 'op';
}

export default function NumeroOpColorido({ numero_op, tipo_ordem, className }) {
  const tipo = tipo_ordem || inferTipoOrdem(numero_op);
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-semibold',
      TIPO_STYLES[tipo],
      className
    )}>
      {numero_op}
    </span>
  );
}