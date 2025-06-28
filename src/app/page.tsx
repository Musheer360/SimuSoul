'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllPersonas } from '@/lib/db';

export default function HomePage() {
  const [hasPersonas, setHasPersonas] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkPersonas() {
      setIsLoading(true);
      const storedPersonas = await getAllPersonas();
      setHasPersonas(storedPersonas.length > 0);
      setIsLoading(false);
    }
    checkPersonas();
  }, []);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="container text-center">
        <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight text-transparent bg-clip-text animate-gradient">
          Create, Converse, Connect.
        </h1>
        <p className="max-w-2xl mx-auto mt-4 text-lg md:text-xl text-muted-foreground">
          Craft unique AI personas and engage in dynamic, memorable conversations. Your imagination is the only limit.
        </p>
        <div className="mt-8">
            {isLoading ? (
            <Skeleton className="h-14 w-72 mx-auto rounded-full" />
          ) : (
            <Button asChild size="lg" className="rounded-full text-lg py-7 px-10">
              {hasPersonas ? (
                <Link href="/personas">
                  <Users className="mr-2" /> View Your Personas
                </Link>
              ) : (
                <Link href="/persona/new">
                  <PlusCircle className="mr-2" /> Create Your First Persona
                </Link>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
