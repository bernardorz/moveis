"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { faGripVertical } from "@fortawesome/free-solid-svg-icons";
import { createContext, useContext, useId } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// Lista reordenável por arrastar (alça ⠿), também operável pelo teclado.

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  disabled,
  children,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    if (from >= 0 && to >= 0) onReorder(arrayMove(items, from, to));
  }
  if (disabled) return <>{children}</>;
  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

const HandleCtx = createContext<React.HTMLAttributes<HTMLButtonElement> | null>(null);

export function SortableItem({
  id,
  disabled,
  className,
  children,
}: {
  id: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(className, isDragging && "relative z-10 opacity-80 shadow-popover")}
    >
      <HandleCtx.Provider value={disabled ? null : { ...attributes, ...listeners }}>{children}</HandleCtx.Provider>
    </div>
  );
}

/** Alça de arrastar (grip-vertical). Some quando a lista está bloqueada. */
export function DragHandle({ label, size = 12 }: { label: string; size?: number }) {
  const props = useContext(HandleCtx);
  if (!props) return <span className="w-4" />;
  return (
    <button
      type="button"
      aria-label={label}
      className="flex w-4 cursor-grab touch-none justify-center rounded-sm text-navy-300 hover:text-navy-600 focus-visible:shadow-focus focus-visible:outline-none active:cursor-grabbing"
      {...props}
    >
      <Icon icon={faGripVertical} size={size} />
    </button>
  );
}
