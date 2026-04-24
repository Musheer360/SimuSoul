'use client';

import { useState, useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryItemProps {
  memory: string;
  onDelete: (memory: string) => void;
}

export function MemoryItem({ memory, onDelete }: MemoryItemProps) {
  const [isMultiLine, setIsMultiLine] = useState(false);
  const pRef = useRef<HTMLParagraphElement>(null);

  const formattedMemory = memory.replace(/^\d{4}-\d{2}-\d{2}: /, '');

  useLayoutEffect(() => {
    const el = pRef.current;
    if (!el) return;
    const check = () => {
      const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight);
      setIsMultiLine(el.scrollHeight > lineHeight * 1.2);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [formattedMemory]);

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto] gap-3 text-sm p-3 rounded-md group bg-secondary/50 hover:bg-secondary/80',
        // Align items to the top for multi-line, and center for single-line.
        isMultiLine ? 'items-start' : 'items-center'
      )}
    >
      <p ref={pRef} className="min-w-0 break-words leading-relaxed">
        {formattedMemory}
      </p>
      <Button
        variant="ghost"
        className="shrink-0 h-7 w-7 p-0 text-muted-foreground hover:bg-transparent hover:text-destructive focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity md:opacity-0 group-hover:opacity-100"
        onClick={() => onDelete(memory)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
