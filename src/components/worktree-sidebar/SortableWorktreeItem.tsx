import { type FC, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableWorktreeItemProps {
  id: string;
  children: ReactNode;
}

export const SortableWorktreeItem: FC<SortableWorktreeItemProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-stretch">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex items-center px-1 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none"
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3 h-3" />
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
};
