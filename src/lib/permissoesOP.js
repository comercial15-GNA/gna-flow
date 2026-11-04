// Regras de quem pode editar uma OP depois de criada.
// Modelo híbrido:
//  - Administrador: edição completa.
//  - Criador, enquanto a OP está "fresca" (nenhum item saiu de Comercial/Engenharia): edição reduzida.
//  - Usuário com liberação temporária ativa (concedida pelo admin e com expiração): edição reduzida.

export const ORDEM_ETAPAS = [
  'comercial',
  'engenharia',
  'modelagem',
  'suprimentos',
  'fundicao',
  'acabamento',
  'usinagem',
  'caldeiraria',
  'suporte_industrial',
  'montagem',
  'liberacao',
  'expedicao',
  'coleta',
  'finalizado',
];

const ETAPAS_ENCERRADAS = ['finalizado', 'cancelado'];

export function ehAdministrador(user) {
  return user?.setor === 'administrador';
}

// Janela automática: OP recém-criada, sem nenhum item que já tenha saído das etapas iniciais.
export function opNaJanelaInicial(op, itensOP) {
  if (!op || op.tipo_ordem !== 'op') return false;
  if (op.status === 'cancelada' || op.status === 'finalizado') return false;
  if (!itensOP || itensOP.length === 0) return true;
  return itensOP.every(i => ['comercial', 'engenharia'].includes(i.etapa_atual));
}

// Liberação temporária concedida pelo administrador e ainda dentro do prazo.
export function liberacaoAtiva(op, user) {
  if (!op?.edicao_liberada_expira_em || !user) return false;
  const expira = new Date(op.edicao_liberada_expira_em).getTime();
  if (!expira || expira <= Date.now()) return false;
  if (op.edicao_liberada_para && op.edicao_liberada_para === user.id) return true;
  if (op.edicao_liberada_email && op.edicao_liberada_email === user.email) return true;
  return false;
}

// Retorna 'admin' | 'limitado' | null
export function modoEdicaoOP(op, itensOP, user) {
  if (!user) return null;
  if (ehAdministrador(user)) return 'admin';
  if (liberacaoAtiva(op, user)) return 'limitado';
  const ehCriador =
    (op?.created_by_id && op.created_by_id === user.id) ||
    (op?.created_by && op.created_by === user.email);
  if (ehCriador && opNaJanelaInicial(op, itensOP)) return 'limitado';
  return null;
}

// Etapa em que um item novo deve entrar: a etapa mais inicial entre os itens ativos.
export function etapaEntradaItem(itensOP) {
  const ativos = (itensOP || []).filter(i => !ETAPAS_ENCERRADAS.includes(i.etapa_atual));
  if (ativos.length === 0) return 'engenharia';
  let menor = null;
  for (const item of ativos) {
    const idx = ORDEM_ETAPAS.indexOf(item.etapa_atual);
    if (idx === -1) continue;
    if (menor === null || idx < menor) menor = idx;
  }
  return menor === null ? 'engenharia' : ORDEM_ETAPAS[menor];
}