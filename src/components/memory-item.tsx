'use client';

import { useState, useRef, useLayoutEffect } from 'react';
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

  useLayoutEffect(() => {
    const checkMultiLine = () => {
      if (pRef.current) {
        const hasWrapped = pRef.current.scrollHeight > pRef.current.clientHeight;
        if (hasWrapped !== isMultiLine) {
          setIsMultiLine(hasWrapped);
        }
      }
    };
    
    // Initial check
    checkMultiLine();
    
    // Re-check on resize
    const observer = new ResizeObserver(checkMultiLine);
    if (pRef.current) {
      observer.observe(pRef.current);
    }
    
    return () => observer.disconnect();
  }, [memory, isMultiLine]);

  const formattedMemory = memory.replace(/^\d{4}-\d{2}-\d{2}: /, '');

  return (
    <div
      className={cn(
        'flex justify-between gap-3 text-sm p-3 rounded-md group bg-secondary/50 hover:bg-secondary/80',
        isMultiLine ? 'items-start' : 'items-center'
      )}
    >
      <p ref={pRef} className="min-w-0 flex-1 break-words">
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
