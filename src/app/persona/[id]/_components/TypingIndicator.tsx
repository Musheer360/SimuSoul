import { memo } from 'react';
import { cn } from '@/lib/utils';

export const TypingIndicator = memo(function TypingIndicator({ 
  isFirstBubble, 
  isTransitioning 
}: { 
  isFirstBubble: boolean;
  isTransitioning?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label="AI is typing"
      className={cn(
        "flex justify-start transition-all duration-200 ease-out",
        isFirstBubble ? 'mt-4' : 'mt-1',
        isTransitioning && "opacity-0 scale-95"
      )}
    >
      <div className={cn(
        "flex h-11 items-center justify-center rounded-lg bg-secondary px-4 transition-all duration-200 ease-out",
        "rounded-tl-none rounded-br-lg",
        isTransitioning && "scale-98"
      )}>
        <div className={cn(
          "flex items-center justify-center space-x-1.5 transition-opacity duration-200",
          isTransitioning && "opacity-0"
        )}>
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-1"></div>
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-2"></div>
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-3"></div>
        </div>
      </div>
    </div>
  );
});
