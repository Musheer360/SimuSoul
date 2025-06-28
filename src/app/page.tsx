'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserDetails, saveUserDetails } from '@/lib/db';
import { TermsDialog } from '@/components/terms-dialog';
import type { UserDetails } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [userDetails, setUserDetailsState] = useState<UserDetails | null>(null);

  useEffect(() => {
    async function checkInitialState() {
      const storedUserDetails = await getUserDetails();
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
          <Button
            size="lg"
            className="rounded-full text-lg py-6 px-10"
            onClick={() => router.push('/personas')}
          >
            <Rocket className="mr-2" />
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
