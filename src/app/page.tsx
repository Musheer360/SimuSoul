'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Persona } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function PersonaCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 p-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const [personas, setPersonas] = useLocalStorage<Persona[]>('personas', []);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold font-headline">Your Personas</h2>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Persona
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <PersonaCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8 animate-fade-in-up">
        <h2 className="text-3xl font-bold font-headline">Your Personas</h2>
        <Button asChild>
          <Link href="/persona/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Persona
          </Link>
        </Button>
      </div>

      {personas.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {personas.map((persona, index) => (
            <Link
              key={persona.id}
              href={`/persona/${persona.id}`}
              className="block group animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card className="h-full transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-4 p-4">
                  <Image
                    src={persona.profilePictureUrl}
                    alt={persona.name}
                    width={64}
                    height={64}
                    className="rounded-full object-cover aspect-square border-2 border-primary/50"
                    data-ai-hint="persona portrait"
                  />
                  <CardTitle className="font-headline text-xl text-primary group-hover:text-accent transition-colors">
                    {persona.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {persona.traits}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-lg animate-fade-in flex flex-col items-center justify-center">
          <Bot className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-2xl font-medium font-headline">No Personas Yet</h3>
          <p className="mt-2 text-base text-muted-foreground">
            Get started by creating your first AI persona.
          </p>
          <Button asChild className="mt-6">
            <Link href="/persona/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Persona
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
