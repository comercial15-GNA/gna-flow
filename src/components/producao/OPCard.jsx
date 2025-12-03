import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Calendar, 
  User, 
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  finalizada: { label: 'Finalizada', color: 'bg-green-100 text-green-800' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800' }
};

export default function OPCard({ op, itens = [], onClickItem, showItens = false }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[op.status] || STATUS_CONFIG.em_andamento;

  const itensOP = itens.filter(item => item.op_id === op.id);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800">{op.numero_op}</h3>
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
              <p className="text-sm text-slate-500">{op.equipamento_principal}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Quick Info */}
        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>{op.cliente}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <User className="w-4 h-4 text-slate-400" />
            <span>{op.responsavel_nome || op.responsavel_email}</span>
          </div>
          {op.data_lancamento && (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{format(new Date(op.data_lancamento), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-600">
            <Package className="w-4 h-4 text-slate-400" />
            <span>{itensOP.length} itens</span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50">
          {/* Arquivos */}
          {op.arquivos && op.arquivos.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Arquivos Anexos</p>
              <div className="flex flex-wrap gap-2">
                {op.arquivos.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Arquivo {index + 1}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Itens */}
          {showItens && itensOP.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Itens da OP</p>
              <div className="space-y-2">
                {itensOP.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors"
                    onClick={() => onClickItem && onClickItem(item)}
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-800">{item.descricao}</p>
                        <p className="text-xs text-slate-500">
                          {item.codigo_ga && `${item.codigo_ga} • `}
                          Qtd: {item.quantidade}
                          {item.peso && ` • ${item.peso} kg`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.etapa_atual}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}