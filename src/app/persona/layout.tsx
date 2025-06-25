import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PersonaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Personas
          </Link>
        </Button>
      </div>
      {children}
    </div>
  );
}
