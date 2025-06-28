
import { Settings, Info } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-16 items-center px-4">
        <div className="flex flex-1 items-center justify-start">
           <Link href="/" className="flex items-center space-x-2 group">
            <span className="font-bold text-2xl font-headline text-primary group-hover:text-foreground transition-colors duration-300">
                PersonaForge
            </span>
            </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-end gap-2">
            <Button asChild variant="secondary" size="icon" aria-label="About">
                <Link href="/about">
                    <Info className="h-5 w-5" />
                </Link>
            </Button>
            <ThemeToggle />
            <Button asChild variant="secondary" size="icon" aria-label="Settings">
                <Link href="/settings">
                    <Settings className="h-5 w-5" />
                </Link>
            </Button>
        </div>
      </div>
    </header>
  );
}

    