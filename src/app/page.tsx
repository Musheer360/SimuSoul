'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, Bot, Trash2, Wand2, MessageCircle, DatabaseZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
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

function PersonaCardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-card/30 rounded-lg backdrop-blur-sm border border-border/20">
      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary/10 text-primary">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold font-headline mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}


export default function HomePage() {
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

  const handleDelete = async (personaId: string) => {
    await deletePersona(personaId);
    setPersonas((prev) => prev.filter((p) => p.id !== personaId));
  };

  return (
    <div className="flex flex-col">
      <div className="w-full">
        {/* Hero Section */}
        <section className="py-20 md:py-32 text-center">
          <div className="container">
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-white animate-fade-in-up">
              Create, Converse, Connect.
            </h1>
            <p className="max-w-2xl mx-auto mt-4 text-lg md:text-xl text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Craft unique AI personas and engage in dynamic, memorable conversations. Your imagination is the only limit.
            </p>
            <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Button asChild size="lg" className="rounded-full text-lg py-7 px-10">
                <Link href="/persona/new">
                  <PlusCircle className="mr-2" /> Create Your First Persona
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Personas Section */}
        <section id="personas" className="py-16 bg-background/50 backdrop-blur-sm">
          <div className="container">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-3xl font-bold font-headline tracking-tight">Your Personas</h2>
                <p className="text-muted-foreground mt-1">Manage your AI companions or create new ones.</p>
              </div>
            </div>

            {isLoading ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => (
                  <PersonaCardSkeleton key={i} />
                ))}
              </div>
            ) : personas.length > 0 ? (
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
                          className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300"
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
                            onClick={() => handleDelete(persona.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Link href={`/persona/${persona.id}`} className="block">
                      <Card className="h-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/20 bg-card/50 backdrop-blur-sm group-hover:-translate-y-2">
                        <div className="aspect-square relative overflow-hidden">
                          <Image
                            src={persona.profilePictureUrl}
                            alt={persona.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
                            data-ai-hint="persona portrait"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
                        </div>
                        <div className="p-4">
                          <CardTitle className="font-headline text-xl text-white group-hover:text-primary transition-colors">
                            {persona.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {persona.relation}
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
                  Looks like your forge is empty. Click the button above to get started!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-24">
          <div className="container">
             <div className="text-center mb-12">
                <h2 className="text-3xl font-bold font-headline tracking-tight">How It Works</h2>
                <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                    PersonaForge is designed to be simple, powerful, and deeply personal.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={Wand2} 
                title="Design Deep Personas" 
                description="Define everything from backstories and traits to unique speaking styles."
              />
              <FeatureCard 
                icon={MessageCircle} 
                title="Dynamic Conversations" 
                description="Our AI remembers your chats, learns about you, and stays in character."
              />
              <FeatureCard 
                icon={DatabaseZap} 
                title="Own Your Data" 
                description="All your personas and chats are stored locally and securely in your browser."
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
