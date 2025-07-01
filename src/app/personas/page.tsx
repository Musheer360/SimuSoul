
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, Bot, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import type { Persona } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getAllPersonas, deletePersona } from '@/lib/db';

// Updated skeleton to match card aspect ratio, preventing layout shifts.
function PersonaCardSkeleton() {
  return (
    <Skeleton className="w-full h-[60vh] rounded-lg" />
  );
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPersonas() {
      setIsLoading(true);
      const storedPersonas = await getAllPersonas();
      setPersonas(storedPersonas);
      setIsLoading(false);
    }
    loadPersonas();
  }, []);

  const handleDelete = useCallback(async (personaId: string) => {
    await deletePersona(personaId);
    setPersonas((prev) => prev.filter((p) => p.id !== personaId));
  }, []);

  return (
    // Removed h-full to allow the page to scroll vertically
    <div className="flex flex-col">
      <div className="container py-8 flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <div className="text-center sm:text-left mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Your Personas</h1>
            <p className="text-muted-foreground mt-1">Manage your AI companions or create new ones.</p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/persona/new">
              <PlusCircle className="mr-2" /> Create New Persona
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Display 3 skeletons for loading state */}
            <PersonaCardSkeleton />
            <PersonaCardSkeleton />
            <PersonaCardSkeleton />
          </div>
        ) : personas.length > 0 ? (
          // Grid layout with 3 columns on desktop
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className="relative group" // Removed h-full
              >
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      // Button is always visible on mobile, appears on hover on desktop
                      className="absolute top-3 right-3 z-10 h-8 w-8 p-0 text-white/90 hover:text-destructive focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity md:opacity-0 group-hover:opacity-100"
                      aria-label={`Delete ${persona.name}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the persona "{persona.name}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => handleDelete(persona.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Link href={`/persona/${persona.id}`} className="block">
                  {/* Card now has a fixed height relative to viewport height */}
                  <Card className="w-full h-[60vh] overflow-hidden border border-border/20 group-hover:border-primary transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/20 bg-card/80 backdrop-blur-sm">
                      <div className="h-full relative overflow-hidden">
                        <Image
                          src={persona.profilePictureUrl}
                          alt={persona.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw" // Optimized for responsive grid
                          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
                          data-ai-hint="persona portrait"
                        />
                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4">
                          <CardTitle className="font-headline text-xl text-white group-hover:text-primary transition-colors">
                            {persona.name}
                          </CardTitle>
                          <p className="text-sm text-white/80 line-clamp-2 mt-1">
                            {persona.relation}
                          </p>
                        </div>
                      </div>
                    </Card>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20 flex-1">
            <div className="p-6 rounded-full bg-primary/10 mb-6">
              <Bot className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-2xl font-medium font-headline">Your Forge is Empty</h3>
            <p className="mt-2 text-base text-muted-foreground max-w-sm">
              You haven't created any personas yet. Click the button above to bring your first character to life.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
