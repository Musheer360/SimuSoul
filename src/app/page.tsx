'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Wand2, MessageCircle, DatabaseZap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllPersonas } from '@/lib/db';

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
    <div className="scroll-snap-container">
      {/* Hero Section */}
      <section className="h-full snap-start flex items-center justify-center">
        <div className="container text-center">
          <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-white">
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
      </section>

      {/* Features Section */}
      <section className="h-full snap-start flex items-center justify-center bg-background/50 backdrop-blur-sm">
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
  );
}
