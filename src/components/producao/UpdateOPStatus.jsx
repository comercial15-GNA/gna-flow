import { base44 } from '@/api/base44Client';

export async function updateOPStatus(opId) {
  try {
    const itens = await base44.entities.ItemOP.filter({ op_id: opId });

    const itensAtivos = itens.filter(i => i.etapa_atual !== 'cancelado');
    const todosCancelados = itens.every(i => i.etapa_atual === 'cancelado');
    const todosFinalizadosOuCancelados = itens.every(i => ['finalizado', 'cancelado'].includes(i.etapa_atual));
    const algumFinalizado = itens.some(i => i.etapa_atual === 'finalizado');
    const algumEmExpedicaoOuColeta = itensAtivos.some(i => ['expedicao', 'coleta'].includes(i.etapa_atual));

    let novoStatus = 'em_andamento';
    if (todosCancelados) {
      novoStatus = 'cancelada';
    } else if (todosFinalizadosOuCancelados && algumFinalizado) {
      novoStatus = 'finalizado';
    } else if (algumEmExpedicaoOuColeta) {
      novoStatus = 'coleta';
    }

    await base44.entities.OrdemProducao.update(opId, { status: novoStatus });

    return novoStatus;
  } catch (error) {
    console.error('Erro ao atualizar status da OP:', error);
    throw error;
  }
}