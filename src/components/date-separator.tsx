/**
 * Date separator component for messaging app style chat UI
 */

interface DateSeparatorProps {
  label: string;
}

export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex-1 border-t border-border/30" />
      <span className="px-4 py-1 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full">
        {label}
      </span>
      <div className="flex-1 border-t border-border/30" />
    </div>
  );
}
