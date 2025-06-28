'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllPersonas, getUserDetails, saveUserDetails } from '@/lib/db';
import { TermsDialog } from '@/components/terms-dialog';
import type { UserDetails } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const [hasPersonas, setHasPersonas] = useState<boolean | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [userDetails, setUserDetailsState] = useState<UserDetails | null>(null);

  useEffect(() => {
    async function checkInitialState() {
      const [storedPersonas, storedUserDetails] = await Promise.all([
        getAllPersonas(),
        getUserDetails(),
      ]);
      setHasPersonas(storedPersonas.length > 0);
      setUserDetailsState(storedUserDetails);

      if (!storedUserDetails.hasAcceptedTerms) {
        setShowTermsDialog(true);
      }
    }
    checkInitialState();
  }, []);

  const handleAcceptTerms = async () => {
    if (!userDetails) return;
    const updatedDetails = { ...userDetails, hasAcceptedTerms: true };
    await saveUserDetails(updatedDetails);
    setUserDetailsState(updatedDetails);
    setShowTermsDialog(false);
  };

  return (
    <div className="flex h-full items-center justify-center">
      <TermsDialog open={showTermsDialog} onAccept={handleAcceptTerms} />
      <div className="container text-center">
        <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight text-transparent bg-clip-text animate-gradient">
          Create, Converse, Connect.
        </h1>
        <p className="max-w-2xl mx-auto mt-4 text-lg md:text-xl text-muted-foreground">
          Craft unique AI personas and engage in dynamic, memorable conversations. Your imagination is the only limit.
        </p>
        <div className="mt-8 h-16 flex items-center justify-center">
            {hasPersonas === null ? (
              <Skeleton className="h-16 w-72 mx-auto rounded-full" />
            ) : (
              <Button asChild size="lg" className="rounded-full text-lg py-6 px-10">
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
