import { base44 } from '@/api/base44Client';

/**
 * Recalcula o status de uma OP com base nas etapas de seus itens.
 *
 * Prioridade (do mais restritivo ao menos):
 * 1. cancelada    — TODOS os itens estão cancelados
 * 2. finalizado   — NENHUM item em andamento (todos em finalizado/cancelado, com ≥1 finalizado)
 * 3. expedicao    — algum item ativo (não cancelado) em expedicao
 * 4. coleta       — algum item ativo em coleta
 * 5. em_andamento — resto (itens em etapas de produção)
 */
export async function updateOPStatus(opId) {
  try {
    const itens = await base44.entities.ItemOP.filter({ op_id: opId });

    if (itens.length === 0) {
      await base44.entities.OrdemProducao.update(opId, { status: 'em_andamento' });
      return 'em_andamento';
    }

    const todosCancelados = itens.every(i => i.etapa_atual === 'cancelado');
    const todosFinalizadosOuCancelados = itens.every(i => ['finalizado', 'cancelado'].includes(i.etapa_atual));
    const algumFinalizado = itens.some(i => i.etapa_atual === 'finalizado');
    const itensAtivos = itens.filter(i => i.etapa_atual !== 'cancelado');
    const algumEmExpedicao = itensAtivos.some(i => i.etapa_atual === 'expedicao');
    const algumEmColeta = itensAtivos.some(i => i.etapa_atual === 'coleta');

    let novoStatus = 'em_andamento';
    if (todosCancelados) {
      novoStatus = 'cancelada';
    } else if (todosFinalizadosOuCancelados && algumFinalizado) {
      novoStatus = 'finalizado';
    } else if (algumEmExpedicao) {
      novoStatus = 'expedicao';
    } else if (algumEmColeta) {
      novoStatus = 'coleta';
    }

    await base44.entities.OrdemProducao.update(opId, { status: novoStatus });

    return novoStatus;
  } catch (error) {
    console.error('Erro ao atualizar status da OP:', error);
    throw error;
  }
}