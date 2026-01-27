import { base44 } from '@/api/base44Client';

export async function updateOPStatus(opId) {
  try {
    const itens = await base44.entities.ItemOP.filter({ op_id: opId });
    
    const todosFinalizados = itens.every(i => i.etapa_atual === 'finalizado');
    const algumEmExpedicaoOuColeta = itens.some(i => ['expedicao', 'coleta'].includes(i.etapa_atual));
    
    let novoStatus = 'em_andamento';
    if (todosFinalizados) {
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