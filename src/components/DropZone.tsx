import type { DragEvent, ReactNode } from "react";

type DropZoneProps = {
  accept: string;
  onDropValue: (value: string) => void;
  children: ReactNode;
  className?: string;
};

export function DragSource({ type, value, children, className = "" }: { type: string; value: string; children: ReactNode; className?: string }) {
  return <div className={`drag-source ${className}`} draggable onDragStart={(event) => {
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData(type, value);
  }}>{children}</div>;
}

export function DropZone({ accept, onDropValue, children, className = "" }: DropZoneProps) {
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const value = event.dataTransfer.getData(accept);
    if (value) onDropValue(value);
  }

  return <div className={`drop-zone ${className}`} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>{children}</div>;
}
