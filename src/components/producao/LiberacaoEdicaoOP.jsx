import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, ShieldOff, Loader2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DURACOES = [
  { value: '24', label: '24 horas' },
  { value: '48', label: '48 horas' },
  { value: '72', label: '72 horas' },
  { value: '168', label: '7 dias' },
];

/**
 * Painel do administrador para liberar temporariamente a edição de uma OP.
 * A liberação expira automaticamente e pode ser revogada a qualquer momento.
 */
export default function LiberacaoEdicaoOP({ op, currentUser, onChanged }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [duracao, setDuracao] = useState('48');

  const { data: responsaveis = [] } = useQuery({
    queryKey: ['responsaveis-ativos'],
    queryFn: () => base44.entities.ResponsavelOP.filter({ ativo: true }),
    enabled: !!op?.id,
  });

  const { data: opAtual } = useQuery({
    queryKey: ['op-liberacao', op?.id],
    queryFn: () => base44.entities.OrdemProducao.get(op.id),
    enabled: !!op?.id,
  });

  const alvo = opAtual || op;
  const expiraEm = alvo?.edicao_liberada_expira_em;
  const ativa = !!expiraEm && new Date(expiraEm).getTime() > Date.now();

  useEffect(() => {
    if (!alvo) return;
    if (userId) return;
    const criador = responsaveis.find(r => r.email === alvo.created_by);
    setUserId(criador?.user_id || alvo.edicao_liberada_para || '');
  }, [alvo, responsaveis, userId]);

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['op-liberacao', op?.id] });
    queryClient.invalidateQueries({ queryKey: ['ops-comercial'] });
    queryClient.invalidateQueries({ queryKey: ['ops-all'] });
    onChanged?.();
  };

  const liberarMutation = useMutation({
    mutationFn: async () => {
      const usuario = responsaveis.find(r => r.user_id === userId);
      if (!usuario) throw new Error('Selecione um usuário');
      const horas = parseInt(duracao);
      const expira = new Date(Date.now() + horas * 3600 * 1000).toISOString();
      await base44.entities.OrdemProducao.update(op.id, {
        edicao_liberada_para: usuario.user_id,
        edicao_liberada_email: usuario.email,
        edicao_liberada_expira_em: expira,
        edicao_liberada_por: currentUser?.email,
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Edição liberada com sucesso');
    },
    onError: (err) => toast.error(err?.message || 'Erro ao liberar edição'),
  });

  const revogarMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.OrdemProducao.update(op.id, {
        edicao_liberada_para: null,
        edicao_liberada_email: null,
        edicao_liberada_expira_em: null,
        edicao_liberada_por: null,
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Liberação revogada');
    },
    onError: () => toast.error('Erro ao revogar liberação'),
  });

  if (!op) return null;

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
        Libere temporariamente a edição desta OP para um usuário. Ele poderá ajustar os dados e adicionar/editar itens, sem alterar etapas nem cancelar/excluir. A liberação expira automaticamente.
      </div>

      <div className="text-sm text-slate-600">
        <span className="text-slate-400">Criador da OP:</span> {alvo?.created_by || '-'}
      </div>

      {ativa ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">Edição liberada</p>
          </div>
          <p className="text-sm text-emerald-700">
            {alvo.edicao_liberada_email} — até {format(new Date(expiraEm), 'dd/MM/yyyy HH:mm')}
          </p>
          {alvo.edicao_liberada_por && (
            <p className="text-xs text-emerald-600 mt-1">Liberado por {alvo.edicao_liberada_por}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3 text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => revogarMutation.mutate()}
            disabled={revogarMutation.isPending}
          >
            {revogarMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ShieldOff className="w-4 h-4 mr-2" />
            )}
            Revogar liberação
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label>Usuário</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map(r => (
                  <SelectItem key={r.user_id} value={r.user_id}>
                    {r.apelido || r.nome_completo} ({r.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Duração</Label>
            <Select value={duracao} onValueChange={setDuracao}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURACOES.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => liberarMutation.mutate()}
            disabled={liberarMutation.isPending || !userId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {liberarMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4 mr-2" />
            )}
            Liberar edição
          </Button>
        </div>
      )}
    </div>
  );
}