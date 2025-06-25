'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { createPersonaAction } from '@/app/actions';
import type { Persona } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Persona...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Create Persona
        </>
      )}
    </Button>
  );
}

export default function NewPersonaPage() {
  const router = useRouter();
  const [personas, setPersonas] = useLocalStorage<Persona[]>('personas', []);
  const initialState = { message: null, errors: {} };
  const [state, dispatch] = useFormState(createPersonaAction, initialState);

  useEffect(() => {
    if (state.success && state.persona) {
      const newPersona = { ...state.persona, id: new Date().toISOString() };
      setPersonas(prev => [...prev, newPersona]);
      router.push(`/persona/${newPersona.id}`);
    }
  }, [state, setPersonas, router]);

  return (
    <Card className="max-w-2xl mx-auto animate-fade-in-up">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Create a New Persona</CardTitle>
        <CardDescription>
          Bring your character to life. The AI will generate a profile picture based on the traits you provide.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={dispatch} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g., Captain Eva Rostova" required />
            {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="traits">Traits</Label>
            <Textarea id="traits" name="traits" placeholder="e.g., Stoic, resourceful, former-spy, haunted by the past..." required />
            <p className="text-xs text-muted-foreground">This will be used to generate the profile picture.</p>
            {state.errors?.traits && <p className="text-sm font-medium text-destructive">{state.errors.traits}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="backstory">Backstory</Label>
            <Textarea id="backstory" name="backstory" placeholder="Describe the character's history and experiences." required />
             {state.errors?.backstory && <p className="text-sm font-medium text-destructive">{state.errors.backstory}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="goals">Goals</Label>
            <Textarea id="goals" name="goals" placeholder="What does this character want to achieve?" required />
             {state.errors?.goals && <p className="text-sm font-medium text-destructive">{state.errors.goals}</p>}
          </div>

          {state.message && !state.success && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
