'use client';

import { useFormStatus } from 'react-dom';
import { useEffect, useState, useRef, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import {
  createPersonaAction,
  generatePersonaDetailsAction,
  generatePersonaFromPromptAction,
} from '@/app/actions';
import type { Persona, CreatePersonaState } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [personas, setPersonas] = useLocalStorage<Persona[]>('personas', []);

  const [formKey, setFormKey] = useState(0);
  const [defaultValues, setDefaultValues] = useState({
    name: '',
    traits: '',
    backstory: '',
    goals: '',
  });

  const [activeTab, setActiveTab] = useState('manual');
  const [prompt, setPrompt] = useState('');
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);

  const initialState: CreatePersonaState = {
    message: null,
    errors: {},
    success: false,
    persona: null,
  };
  const [state, dispatch] = useActionState(createPersonaAction, initialState);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success && state.persona) {
      const newPersona = { ...state.persona, id: new Date().toISOString() };
      setPersonas((prev) => [...prev, newPersona]);
      router.push(`/persona/${newPersona.id}`);
    }
  }, [state, setPersonas, router]);

  const handleGenerateFullPersona = async () => {
    if (!prompt) return;
    setIsGeneratingFull(true);
    const result = await generatePersonaFromPromptAction(prompt);
    setIsGeneratingFull(false);

    if (result.success && result.personaData) {
      setDefaultValues(result.personaData);
      setFormKey((k) => k + 1);
      setActiveTab('manual');
      toast({
        title: 'Persona Generated!',
        description: 'Review the details below and create your persona.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: result.error || 'An unknown error occurred.',
      });
    }
  };

  const handleGenerateDetails = async () => {
    const name = nameRef.current?.value;
    if (!name) {
      toast({
        variant: 'destructive',
        title: 'Name is required',
        description: 'Please enter a name to generate details.',
      });
      return;
    }
    setIsGeneratingDetails(true);
    const result = await generatePersonaDetailsAction(name);
    setIsGeneratingDetails(false);

    if (result.success && result.details) {
      setDefaultValues((prev) => ({ ...prev, name, ...result.details }));
      setFormKey((k) => k + 1);
      toast({
        title: 'Details Generated!',
        description:
          'The traits, backstory and goals have been filled out for you.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: result.error || 'An unknown error occurred.',
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto animate-fade-in-up">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          Create a New Persona
        </CardTitle>
        <CardDescription>
          Bring your character to life. Fill out the details manually or use AI to
          generate them for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ai">
              <Wand2 className="mr-2" /> Generate with AI
            </TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="pt-6">
            <form action={dispatch} className="space-y-6" key={formKey}>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  ref={nameRef}
                  defaultValue={defaultValues.name}
                  placeholder="e.g., Captain Eva Rostova"
                  required
                />
                {state.errors?.name && (
                  <p className="text-sm font-medium text-destructive">
                    {state.errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="traits">Traits</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="text-primary hover:text-accent"
                    onClick={handleGenerateDetails}
                    disabled={isGeneratingDetails}
                  >
                    {isGeneratingDetails ? (
                      <Loader2 className="mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2" />
                    )}
                    Generate with AI
                  </Button>
                </div>
                <Textarea
                  id="traits"
                  name="traits"
                  defaultValue={defaultValues.traits}
                  placeholder="e.g., Stoic, resourceful, former-spy, haunted by the past..."
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be used to generate the profile picture.
                </p>
                {state.errors?.traits && (
                  <p className="text-sm font-medium text-destructive">
                    {state.errors.traits}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="backstory">Backstory</Label>
                <Textarea
                  id="backstory"
                  name="backstory"
                  defaultValue={defaultValues.backstory}
                  placeholder="Describe the character's history and experiences."
                  required
                />
                {state.errors?.backstory && (
                  <p className="text-sm font-medium text-destructive">
                    {state.errors.backstory}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals">Goals</Label>
                <Textarea
                  id="goals"
                  name="goals"
                  defaultValue={defaultValues.goals}
                  placeholder="What does this character want to achieve?"
                  required
                />
                {state.errors?.goals && (
                  <p className="text-sm font-medium text-destructive">
                    {state.errors.goals}
                  </p>
                )}
              </div>

              {state.message && !state.success && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )}

              <SubmitButton />
            </form>
          </TabsContent>
          <TabsContent value="ai" className="pt-6">
            <div className="space-y-4">
              <Label htmlFor="prompt">Describe your character idea</Label>
              <Textarea
                id="prompt"
                name="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A badass pokemon trainer from the future who time-traveled to the past."
                rows={4}
              />
              <Button
                className="w-full"
                onClick={handleGenerateFullPersona}
                disabled={isGeneratingFull || !prompt}
              >
                {isGeneratingFull ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Persona
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
