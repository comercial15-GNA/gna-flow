import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Calendar, 
  User, 
  Weight,
  Hash,
  ArrowRight,
  RotateCcw,
  FileText,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ETAPA_COLORS = {
  comercial: 'bg-blue-100 text-blue-800',
  engenharia: 'bg-green-100 text-green-800',
  modelagem: 'bg-yellow-100 text-yellow-800',
  suprimentos: 'bg-orange-100 text-orange-800',
  fundicao: 'bg-red-100 text-red-800',
  usinagem: 'bg-cyan-100 text-cyan-800',
  liberacao: 'bg-emerald-100 text-emerald-800',
  expedicao: 'bg-teal-100 text-teal-800',
  finalizado: 'bg-purple-100 text-purple-800'
};

const ETAPA_LABELS = {
  comercial: 'Comercial',
  engenharia: 'Engenharia',
  modelagem: 'Modelagem',
  suprimentos: 'Suprimentos',
  fundicao: 'Fundição',
  usinagem: 'Usinagem',
  liberacao: 'Liberação',
  expedicao: 'Expedição',
  finalizado: 'Finalizado'
};

export default function ItemCardProducao({ 
  item, 
  arquivos = [],
  avancarOpcoes = [], 
  retornarOpcoes = [],
  onAvancar,
  onRetornar,
  loading = false
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{item.descricao}</p>
            <p className="text-xs text-slate-500">{item.numero_op} • {item.equipamento_principal || item.cliente}</p>
            {item.equipamento_principal && <p className="text-xs text-slate-400">{item.cliente}</p>}
          </div>
        </div>
        <Badge className={ETAPA_COLORS[item.etapa_atual]}>
          {ETAPA_LABELS[item.etapa_atual]}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">{item.codigo_ga || '-'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Weight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">{item.peso ? `${item.peso} kg` : '-'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">Qtd: {item.quantidade}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600">
            {item.data_entrega ? format(new Date(item.data_entrega), 'dd/MM/yy') : '-'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-slate-600 truncate">{item.responsavel_op || '-'}</span>
        </div>
      </div>

      {arquivos.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Arquivos da OP:</p>
          <div className="flex flex-wrap gap-2">
            {arquivos.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-xs text-blue-600 hover:bg-slate-200"
              >
                <FileText className="w-3 h-3" />
                Arquivo {idx + 1}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      )}

      {item.data_entrada_etapa && (
        <div className="text-xs text-slate-500 mb-4">
          Entrada: {format(new Date(item.data_entrada_etapa), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      )}

      {(avancarOpcoes.length > 0 || retornarOpcoes.length > 0) && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
          {avancarOpcoes.map((opcao) => (
            <Button
              key={opcao.value}
              size="sm"
              onClick={() => onAvancar(item, opcao.value)}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-900"
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              {opcao.label}
            </Button>
          ))}
          {retornarOpcoes.map((opcao) => (
            <Button
              key={opcao.value}
              size="sm"
              variant="outline"
              onClick={() => onRetornar(item, opcao.value)}
              disabled={loading}
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {opcao.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}