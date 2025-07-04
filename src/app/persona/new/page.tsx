
'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { generatePersonaDetails } from '@/ai/flows/generate-persona-details';
import { generatePersonaFromPrompt, GeneratePersonaFromPromptOutput } from '@/ai/flows/generate-full-persona';
import { generatePersonaProfilePicture } from '@/ai/flows/generate-persona-profile-picture';
import { moderatePersonaContent } from '@/ai/flows/moderate-persona-content';
import type { Persona, ChatSession, UserDetails } from '@/lib/types';
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
import { savePersona, getUserDetails } from '@/lib/db';

const GENERIC_MODERATION_ERROR = 'This content does not meet the safety guidelines. Please modify it and try again.';
const GENERIC_MODERATION_ERROR_PROMPT = 'The generated content does not meet the safety guidelines. Please try a different prompt.';
const GENERIC_MODERATION_ERROR_DETAILS = 'The generated content does not meet the safety guidelines. Please modify your inputs and try again.';

const emptyStringAsUndefined = (val: string | number | undefined) => (val === '' || val === undefined ? undefined : Number(val));

const compressImage = (dataUri: string, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        return resolve(dataUri);
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
      img.src = dataUri;
    });
};


export default function NewPersonaPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [formKey, setFormKey] = useState(Date.now());
  const [formData, setFormData] = useState<Partial<GeneratePersonaFromPromptOutput> & { age?: number }>({
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
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const relationRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadUserDetails() {
        const details = await getUserDetails();
        setUserDetails(details);
    }
    loadUserDetails();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'age' ? (value === '' ? undefined : Number(value)) : value,
    }));
  };

  const handleGenerateFullPersona = async () => {
    if (!prompt) return;
    setIsGeneratingFull(true);
    setError(null);
    try {
      const result = await generatePersonaFromPrompt({
        prompt,
        userName: userDetails?.name,
        userAbout: userDetails?.about,
      });
      const moderationResult = await moderatePersonaContent({ ...result, age: result.age || undefined });

      if (!moderationResult.isSafe) {
        throw new Error(GENERIC_MODERATION_ERROR_PROMPT);
      }

      setFormData(result);
      setFormKey(Date.now()); // Force re-render of form with new default values
      setActiveTab('manual');
      toast({
        title: 'Persona Generated!',
        description: 'Review the details below and create your persona.',
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: e.message || 'An unknown error occurred.' });
    } finally {
      setIsGeneratingFull(false);
    }
  };

  const handleGenerateDetails = async () => {
    const name = nameRef.current?.value;
    const relation = relationRef.current?.value;

    if (!name || !relation) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a Name and Relationship to generate details.' });
      return;
    }

    setIsGeneratingDetails(true);
    setError(null);
    try {
      const result = await generatePersonaDetails({
        personaName: name,
        personaRelation: relation,
        userName: userDetails?.name,
        userAbout: userDetails?.about
      });
      const moderationResult = await moderatePersonaContent({ name, relation, ...result });

      if (!moderationResult.isSafe) {
        throw new Error(GENERIC_MODERATION_ERROR_DETAILS);
      }
      
      setFormData(prev => ({ ...prev, name, relation, ...result }));
      setFormKey(Date.now());
      toast({ title: 'Details Generated!', description: 'The traits, backstory, and other details have been filled out.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: e.message || 'An unknown error occurred.' });
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    const dataToValidate = {
        name: formData.name || '',
        relation: formData.relation || '',
        age: emptyStringAsUndefined(formData.age),
        traits: formData.traits || '',
        backstory: formData.backstory || '',
        goals: formData.goals || '',
        responseStyle: formData.responseStyle || '',
        minWpm: formData.minWpm || 0,
        maxWpm: formData.maxWpm || 0,
    };
    
    // Basic validation
    for (const [key, value] of Object.entries(dataToValidate)) {
        if (key !== 'age' && !value) {
            setError(`${key.charAt(0).toUpperCase() + key.slice(1)} is required.`);
            setIsCreating(false);
            return;
        }
    }

    try {
      const moderationResult = await moderatePersonaContent(dataToValidate);
      if (!moderationResult.isSafe) {
        throw new Error(GENERIC_MODERATION_ERROR);
      }
      
      toast({
        title: 'Generating Profile Picture...',
        description: 'This may take a moment. Please wait.',
      });

      const profilePictureResponse = await generatePersonaProfilePicture({
        personaName: dataToValidate.name,
        personaTraits: dataToValidate.traits,
        personaBackstory: dataToValidate.backstory,
      });

      if (!profilePictureResponse.profilePictureDataUri) {
        throw new Error('Failed to generate profile picture.');
      }
      
      const compressedDataUri = await compressImage(profilePictureResponse.profilePictureDataUri);

      const now = Date.now();
      const newChat: ChatSession = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        messages: [],
        createdAt: now,
        updatedAt: now,
      };

      const newPersona: Persona = {
        id: crypto.randomUUID(),
        ...dataToValidate,
        profilePictureUrl: compressedDataUri,
        chats: [newChat],
        memories: [],
      };

      await savePersona(newPersona);
      router.push(`/persona/${newPersona.id}?chat=${newChat.id}`);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during persona creation.');
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: err.message || 'An unknown error occurred.',
      });
    } finally {
      setIsCreating(false);
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
                  <form onSubmit={handleSubmit} className="space-y-6" key={formKey}>
                  <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        ref={nameRef}
                        defaultValue={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g., Captain Eva Rostova"
                        required
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="relation">Relationship</Label>
                        <Input
                          id="relation"
                          name="relation"
                          ref={relationRef}
                          defaultValue={formData.relation}
                          onChange={handleInputChange}
                          placeholder="e.g., Best friend, mentor"
                          required
                        />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age (Optional)</Label>
                      <Input
                        id="age"
                        name="age"
                        type="number"
                        min="18"
                        defaultValue={formData.age}
                        onChange={handleInputChange}
                        placeholder="e.g., 28"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="traits">Traits & Details</Label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleGenerateDetails}
                            disabled={isGeneratingDetails}
                            className="text-primary hover:text-primary"
                        >
                            {isGeneratingDetails ? <Loader2 className="animate-spin" /> : <Wand2 />}
                            Generate Details
                        </Button>
                      </div>
                      <Label htmlFor="traits" className="text-xs font-normal text-muted-foreground">Traits</Label>
                      <Textarea
                        id="traits"
                        name="traits"
                        defaultValue={formData.traits}
                        onChange={handleInputChange}
                        placeholder="e.g., Stoic, resourceful, former-spy, haunted by the past..."
                        required
                        rows={3}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        This will be used to generate the profile picture and influence their personality.
                      </p>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="backstory">Backstory</Label>
                      <Textarea
                        id="backstory"
                        name="backstory"
                        defaultValue={formData.backstory}
                        onChange={handleInputChange}
                        placeholder="Describe the character's history and experiences."
                        required
                        rows={5}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        This provides context for the AI's knowledge and memories.
                      </p>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="goals">Goals</Label>
                      <Textarea
                        id="goals"
                        name="goals"
                        defaultValue={formData.goals}
                        onChange={handleInputChange}
                        placeholder="What does this character want to achieve?"
                        required
                        rows={3}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        This defines the persona's motivations and drives conversations.
                      </p>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="responseStyle">Response Style</Label>
                      <Textarea
                        id="responseStyle"
                        name="responseStyle"
                        defaultValue={formData.responseStyle}
                        onChange={handleInputChange}
                        placeholder="e.g., Talks like a Gen-Z, uses a lot of slang and emojis. Formal and professional. Gets sarcastic when annoyed."
                        required
                        rows={4}
                        className="resize-none"
                      />
                       <p className="text-xs text-muted-foreground">
                          Define how the persona communicates. This guides their tone, language, and personality in chat.
                      </p>
                  </div>

                  {error && (
                      <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                      </Alert>
                  )}
                  
                  <Button type="submit" disabled={isCreating} size="lg" className="w-full">
                      {isCreating ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Persona...</>
                      ) : (
                          <><Sparkles className="mr-2 h-4 w-4" /> Create Persona</>
                      )}
                  </Button>
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
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Wand2 className="mr-2 h-4 w-4" /> Generate Persona from Prompt</>
                      )}
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
