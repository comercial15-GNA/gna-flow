import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function MontagemDraggableList({ ops, renderCard }) {
  const queryClient = useQueryClient();
  const [localOrderIds, setLocalOrderIds] = useState([]);
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);

  const opsIds = ops.map(o => o.op.id).join(',');
  useEffect(() => {
    if (ops.length > 0) {
      setLocalOrderIds(ops.map(o => o.op.id));
    }
  }, [opsIds]);

  const orderedOps = localOrderIds.length > 0
    ? [
        ...localOrderIds.map(id => ops.find(o => o.op.id === id)).filter(Boolean),
        ...ops.filter(o => !localOrderIds.includes(o.op.id))
      ]
    : ops;

  const onDragEnd = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;

    const newOrderIds = Array.from(localOrderIds);
    const [moved] = newOrderIds.splice(result.source.index, 1);
    newOrderIds.splice(result.destination.index, 0, moved);
    setLocalOrderIds(newOrderIds);

    setSalvandoOrdem(true);
    try {
      const updates = newOrderIds.map((id, idx) => ({ id, ordem_montagem: idx }));
      await base44.entities.OrdemProducao.bulkUpdate(updates);
      queryClient.invalidateQueries({ queryKey: ['ops-all'] });
    } catch (error) {
      toast.error('Erro ao salvar ordem');
      setLocalOrderIds(ops.map(o => o.op.id));
    } finally {
      setSalvandoOrdem(false);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="montagem-ops">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 relative">
            {salvandoOrdem && (
              <div className="absolute -top-6 right-0 flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Salvando ordem...
              </div>
            )}
            {orderedOps.map((opData, index) => (
              <Draggable key={opData.op.id} draggableId={opData.op.id} index={index}>
                {(prov, snapshot) => (
                  <div ref={prov.innerRef} {...prov.draggableProps}>
                    {renderCard(opData, prov.dragHandleProps, snapshot.isDragging)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}