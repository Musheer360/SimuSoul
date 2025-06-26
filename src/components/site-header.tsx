import { Settings } from 'lucide-react';
import Link from 'next/link';
import { SettingsDialog } from './settings-dialog';
import { Button } from './ui/button';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 max-w-7xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2 group">
            <span className="font-bold text-2xl font-headline text-primary group-hover:text-white transition-colors duration-300">
              PersonaForge
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <SettingsDialog>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </SettingsDialog>
        </div>
      </div>
    </header>
  );
}
