
'use client';

import { useFormStatus } from 'react-dom';
import { useEffect, useState, useRef, useActionState } from 'react';
import { useRouter } from 'next/navigation';
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
import { savePersona, getApiKeys } from '@/lib/db';
import type { GeneratePersonaFromPromptOutput } from '@/ai/flows/generate-full-persona';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full">
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
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<string[]>([]);

  useEffect(() => {
    getApiKeys().then(keys => setApiKeys(keys.gemini));
  }, []);

  const [formKey, setFormKey] = useState(0);
  const [defaultValues, setDefaultValues] = useState<GeneratePersonaFromPromptOutput & { age?: number }>({
    name: '',
    relation: '',
    age: undefined,
    traits: '',
    backstory: '',
    goals: '',
    responseStyle: '',
    minWpm: 0,
    maxWpm: 0,
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
  const relationRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success && state.persona) {
      const newPersona: Persona = { ...state.persona, id: crypto.randomUUID(), chats: [], memories: [] };
      savePersona(newPersona).then(() => {
        router.push(`/persona/${newPersona.id}`);
      });
    }
  }, [state, router]);

  if (isLoading) {
    return (
      <div className="container py-12 flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleGenerateFullPersona = async () => {
    if (!prompt) return;
    setIsGeneratingFull(true);
    const { gemini: userApiKeys } = await getApiKeys();
    const result = await generatePersonaFromPromptAction({ prompt, apiKey: userApiKeys });
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
    const relation = relationRef.current?.value;
    if (!name) {
      toast({
        variant: 'destructive',
        title: 'Name is required',
        description: 'Please enter a name to generate details.',
      });
      return;
    }
    if (!relation) {
      toast({
        variant: 'destructive',
        title: 'Relationship is required',
        description: 'Please enter a relationship to generate details.',
      });
      return;
    }
    setIsGeneratingDetails(true);
    const { gemini: userApiKeys } = await getApiKeys();
    const result = await generatePersonaDetailsAction({ name, relation, apiKey: userApiKeys });
    setIsGeneratingDetails(false);

    if (result.success && result.details) {
      setDefaultValues((prev) => ({ ...prev, name, relation, ...result.details }));
      setFormKey((k) => k + 1);
      toast({
        title: 'Details Generated!',
        description:
          'The traits, backstory, goals, and response style have been filled out for you.',
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
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="container py-12">
          <Card className="max-w-2xl mx-auto bg-card/80 backdrop-blur-sm border border-border/20">
          <CardHeader className="text-center">
              <CardTitle className="font-headline text-3xl">
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
                  <Wand2 className="mr-2 h-4 w-4 hidden sm:inline-block" /> Generate with AI
                  </TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="pt-6">
                  <form action={dispatch} className="space-y-6" key={formKey}>
                    <input type="hidden" name="minWpm" value={defaultValues.minWpm} />
                    <input type="hidden" name="maxWpm" value={defaultValues.maxWpm} />
                    <input type="hidden" name="apiKeys" value={JSON.stringify(apiKeys)} />
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="relation">Relationship</Label>
                        <Input
                        id="relation"
                        name="relation"
                        ref={relationRef}
                        defaultValue={defaultValues.relation}
                        placeholder="e.g., Best friend, mentor"
                        required
                        />
                        {state.errors?.relation && (
                        <p className="text-sm font-medium text-destructive">
                            {state.errors.relation}
                        </p>
                        )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age (Optional)</Label>
                      <Input
                        id="age"
                        name="age"
                        type="number"
                        min="18"
                        defaultValue={defaultValues.age}
                        placeholder="e.g., 28"
                      />
                      {state.errors?.age && (
                        <p className="text-sm font-medium text-destructive">
                          {state.errors.age}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                      <div className="flex justify-between items-center">
                      <Label htmlFor="traits">Traits & Details</Label>
                      <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={handleGenerateDetails}
                          disabled={isGeneratingDetails}
                      >
                          {isGeneratingDetails ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                          <Wand2 className="mr-2 h-4 w-4" />
                          )}
                          Generate Details
                      </Button>
                      </div>
                      <Label htmlFor="traits" className="text-xs font-normal text-muted-foreground">Traits</Label>
                      <Textarea
                      id="traits"
                      name="traits"
                      defaultValue={defaultValues.traits}
                      placeholder="e.g., Stoic, resourceful, former-spy, haunted by the past..."
                      required
                      rows={3}
                      className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                      This will be used to generate the profile picture and influence their personality.
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
                      rows={5}
                      className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        This provides context for the AI's knowledge and memories.
                      </p>
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
                      rows={3}
                      className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        This defines the persona's motivations and drives conversations.
                      </p>
                      {state.errors?.goals && (
                      <p className="text-sm font-medium text-destructive">
                          {state.errors.goals}
                      </p>
                      )}
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="responseStyle">Response Style</Label>
                      <Textarea
                      id="responseStyle"
                      name="responseStyle"
                      defaultValue={defaultValues.responseStyle}
                      placeholder="e.g., Talks like a Gen-Z, uses a lot of slang and emojis. Formal and professional. Gets sarcastic when annoyed."
                      required
                      rows={4}
                      className="resize-none"
                      />
                       <p className="text-xs text-muted-foreground">
                          Define how the persona communicates. This guides their tone, language, and personality in chat.
                      </p>
                      {state.errors?.responseStyle && (
                      <p className="text-sm font-medium text-destructive">
                          {state.errors.responseStyle}
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
                      className="resize-none"
                  />
                  <Button
                      className="w-full"
                      onClick={handleGenerateFullPersona}
                      disabled={isGeneratingFull || !prompt}
                      size="lg"
                  >
                      {isGeneratingFull ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                      <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      Generate Persona from Prompt
                  </Button>
                  </div>
              </TabsContent>
              </Tabs>
          </CardContent>
          </Card>
      </div>
    </div>
  );
}
