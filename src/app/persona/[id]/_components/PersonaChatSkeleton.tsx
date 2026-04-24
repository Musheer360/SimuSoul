import { Skeleton } from '@/components/ui/skeleton';

export function PersonaChatSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar Skeleton */}
      <div className="w-80 flex flex-col bg-card border-r hidden md:flex">
        {/* Profile Section */}
        <div className="pt-16 md:pt-0">
          <div className="p-2 mx-2">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="px-4 pb-2 pt-3">
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>
          
          {/* Chat List */}
          <div className="flex-1 px-4 pb-4">
            <div className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area Skeleton */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <header className="p-4 border-b flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </header>
        
        {/* Messages Area */}
        <div className="flex-1 p-4 space-y-4">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* User message */}
            <div className="flex justify-end">
              <Skeleton className="h-12 w-64 rounded-2xl" />
            </div>
            {/* AI message */}
            <div className="flex justify-start">
              <Skeleton className="h-16 w-80 rounded-2xl" />
            </div>
            {/* User message */}
            <div className="flex justify-end">
              <Skeleton className="h-8 w-48 rounded-2xl" />
            </div>
          </div>
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
