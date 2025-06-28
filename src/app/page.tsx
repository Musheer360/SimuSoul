'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllPersonas, getUserDetails, saveUserDetails } from '@/lib/db';
import { TermsDialog } from '@/components/terms-dialog';
import type { UserDetails } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const [hasPersonas, setHasPersonas] = useState<boolean | null>(null);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [userDetails, setUserDetailsState] = useState<UserDetails | null>(null);

  useEffect(() => {
    async function checkInitialState() {
      const [storedPersonas, storedUserDetails] = await Promise.all([
        getAllPersonas(),
        getUserDetails(),
      ]);
      
      // Artificial delay to make the animation noticeable
      setTimeout(() => {
        setHasPersonas(storedPersonas.length > 0);
      }, 500);

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

  const handleClick = () => {
    if (hasPersonas) {
      router.push('/personas');
    } else {
      router.push('/persona/new');
    }
  };

  const isLoading = hasPersonas === null;

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
          <Button
            size="lg"
            className={cn(
              'rounded-full text-lg py-6 transition-all duration-500 ease-out flex items-center justify-center',
              isLoading ? 'w-16 h-16 p-0' : (hasPersonas ? 'w-72 px-10' : 'w-80 px-10')
            )}
            disabled={isLoading}
            onClick={!isLoading ? handleClick : undefined}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="flex items-center justify-center opacity-0 animate-fade-in-delay">
                {hasPersonas ? (
                  <>
                    <Users className="mr-2" /> View Your Personas
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2" /> Create Your First Persona
                  </>
                )}
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
