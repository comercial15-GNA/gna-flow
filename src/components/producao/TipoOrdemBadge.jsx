import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { inferTipoOrdem } from './NumeroOpColorido';

const TIPO_CONFIG = {
  op: { label: 'Produção', color: 'bg-slate-100 text-slate-800' },
  or: { label: 'Reforma', color: 'bg-orange-100 text-orange-800' },
  of: { label: 'Fabricação', color: 'bg-blue-100 text-blue-800' },
};

export default function TipoOrdemBadge({ tipo_ordem, numero_op, className }) {
  const tipo = tipo_ordem || inferTipoOrdem(numero_op);
  const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.op;
  return (
    <Badge className={cn(config.color, className)}>
      {config.label}
    </Badge>
  );
}