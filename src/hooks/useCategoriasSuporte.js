import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const COLOR_MAP = {
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  orange: 'bg-orange-100 text-orange-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  zinc: 'bg-zinc-200 text-zinc-800',
  stone: 'bg-stone-200 text-stone-800',
  red: 'bg-red-100 text-red-800',
  teal: 'bg-teal-100 text-teal-800',
  pink: 'bg-pink-100 text-pink-800',
  cyan: 'bg-cyan-100 text-cyan-800',
  slate: 'bg-slate-100 text-slate-800',
};

export const COLOR_OPTIONS = [
  { key: 'green', label: 'Verde' },
  { key: 'amber', label: 'Âmbar' },
  { key: 'orange', label: 'Laranja' },
  { key: 'blue', label: 'Azul' },
  { key: 'purple', label: 'Roxo' },
  { key: 'indigo', label: 'Índigo' },
  { key: 'zinc', label: 'Zinco' },
  { key: 'stone', label: 'Pedra' },
  { key: 'red', label: 'Vermelho' },
  { key: 'teal', label: 'Teal' },
  { key: 'pink', label: 'Rosa' },
  { key: 'cyan', label: 'Ciano' },
  { key: 'slate', label: 'Cinza' },
];

export function useCategoriasSuporte() {
  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias-suporte'],
    queryFn: () => base44.entities.CategoriaSuporte.filter({ ativo: true }),
  });

  const categoriasOrdenadas = [...categorias].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const getLabel = (valor) => {
    const cat = categorias.find(c => c.valor === valor);
    return cat?.nome || valor || '';
  };

  const getColor = (valor) => {
    const cat = categorias.find(c => c.valor === valor);
    return COLOR_MAP[cat?.cor] || COLOR_MAP.slate;
  };

  return { categorias: categoriasOrdenadas, isLoading, getLabel, getColor };
}