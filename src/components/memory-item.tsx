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
    const checkLines = () => {
      if (pRef.current) {
        const pElement = pRef.current;
        const computedStyle = window.getComputedStyle(pElement);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        // If the element's total height is greater than its line height, it must be wrapping.
        // We use a 1.2 multiplier for safety against floating point inaccuracies.
        setIsMultiLine(pElement.scrollHeight > lineHeight * 1.2);
      }
    };

    // Check on mount and also on window resize to handle responsive changes.
    checkLines();
    window.addEventListener('resize', checkLines);
    return () => window.removeEventListener('resize', checkLines);
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
