'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, Bot, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';
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

function PersonaCardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="aspect-[3/4] w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [personas, setPersonas] = useLocalStorage<Persona[]>('personas', []);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // One-time migration to add 'chats' and 'memories' array to existing personas
    setPersonas(prevPersonas => {
        const needsMigration = prevPersonas.some(p => !p.chats || !p.memories);
        if (needsMigration) {
            return prevPersonas.map(p => ({
              ...p,
              chats: p.chats || [],
              memories: p.memories || []
            }));
        }
        return prevPersonas;
    });
  }, [setPersonas]);

  if (!isMounted) {
    return (
      <div className="container py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10">
            <div className="mb-4 sm:mb-0">
                <h1 className="text-4xl font-bold font-headline tracking-tight">Your Personas</h1>
                <p className="text-muted-foreground mt-1">Create and manage your AI companions.</p>
            </div>
          <Button disabled size="lg">
            <PlusCircle className="mr-2" /> Create Persona
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <PersonaCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 animate-fade-in-up">
        <div className="mb-4 sm:mb-0">
            <h1 className="text-4xl font-bold font-headline tracking-tight">Your Personas</h1>
            <p className="text-muted-foreground mt-1">Create and manage your AI companions.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/persona/new">
            <PlusCircle className="mr-2" /> Create Persona
          </Link>
        </Button>
      </div>

      {personas.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {personas.map((persona, index) => (
            <div
              key={persona.id}
              className="relative group animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-4 right-4 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-100 scale-90"
                    aria-label={`Delete ${persona.name}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4" />
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
                      onClick={() => {
                        setPersonas((prev) => prev.filter((p) => p.id !== persona.id));
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Link
                href={`/persona/${persona.id}`}
                className="block"
              >
                <Card className="h-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/20 bg-card/50 backdrop-blur-sm group-hover:-translate-y-2">
                    <div className="aspect-[3/4] relative overflow-hidden">
                      <Image
                        src={persona.profilePictureUrl}
                        alt={persona.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
                        data-ai-hint="persona portrait"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    </div>
                    <div className="p-4">
                      <CardTitle className="font-headline text-xl text-white group-hover:text-primary transition-colors">
                        {persona.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {persona.traits}
                      </p>
                    </div>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-lg animate-fade-in flex flex-col items-center justify-center bg-card/20 backdrop-blur-sm">
          <Bot className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-2xl font-medium font-headline">No Personas Yet</h3>
          <p className="mt-2 text-base text-muted-foreground max-w-sm">
            Looks like your forge is empty. Let's create your first AI persona and start chatting!
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/persona/new">
              <PlusCircle className="mr-2" /> Create Your First Persona
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
