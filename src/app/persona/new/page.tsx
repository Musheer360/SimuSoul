
'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { generatePersonaDetails } from '@/ai/flows/generate-persona-details';
import { generatePersonaFromPrompt, GeneratePersonaFromPromptOutput } from '@/ai/flows/generate-full-persona';
import { generatePersonaFromChat } from '@/ai/flows/generate-persona-from-chat';
import { 
  generatePersonaProfilePicture, 
  ImageGenerationQuotaError,
  buildProfilePicturePrompt,
  generatePlaceholderAvatar 
} from '@/ai/flows/generate-persona-profile-picture';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, Wand2, Upload, Copy, ImageIcon, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { savePersona, getUserDetails, saveChatSession } from '@/lib/db';
import { isTestModeActive } from '@/lib/api-key-manager';
import { compressImage } from '@/lib/utils';

const GENERIC_MODERATION_ERROR = 'This content does not meet the safety guidelines. Please modify it and try again.';
const GENERIC_MODERATION_ERROR_PROMPT = 'The generated content does not meet the safety guidelines. Please try a different prompt.';
const GENERIC_MODERATION_ERROR_DETAILS = 'The generated content does not meet the safety guidelines. Please modify your inputs and try again.';

const emptyStringAsUndefined = (val: string | number | undefined) => (val === '' || val === undefined ? undefined : Number(val));


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
  
  // Chat clone state
  const [chatContent, setChatContent] = useState('');
  const [personNameForClone, setPersonNameForClone] = useState('');
  const [isGeneratingFromChat, setIsGeneratingFromChat] = useState(false);
  
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar fallback dialog state
  const [showAvatarFallbackDialog, setShowAvatarFallbackDialog] = useState(false);
  const [avatarFallbackPrompt, setAvatarFallbackPrompt] = useState('');
  const [pendingPersonaData, setPendingPersonaData] = useState<any>(null);
  const avatarUploadRef = useRef<HTMLInputElement>(null);

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
      const testMode = await isTestModeActive();
      const result = await generatePersonaFromPrompt({
        prompt,
        userName: userDetails?.name,
        userAbout: userDetails?.about,
        isTestMode: testMode,
      });
      const moderationResult = await moderatePersonaContent({ ...result, age: result.age || undefined, isTestMode: testMode });

      if (!moderationResult.isSafe) {
        throw new Error(GENERIC_MODERATION_ERROR_PROMPT);
      }

      setFormData(result);
      setFormKey(Date.now());
      setActiveTab('manual');
      toast({
        title: 'Persona Generated!',
        description: 'Review the details below and create your persona.',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate persona.');
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: err.message || 'An error occurred.',
      });
    } finally {
      setIsGeneratingFull(false);
    }
  };

  const handleGenerateFromChat = async () => {
    if (!chatContent || !personNameForClone) return;
    setIsGeneratingFromChat(true);
    setError(null);
    try {
      const result = await generatePersonaFromChat({
        chatContent,
        personName: personNameForClone,
        userName: userDetails?.name,
        userAbout: userDetails?.about,
      });
      
      // Map chat analysis fields to persona format for moderation
      const mappedForModeration = {
        name: result.name,
        relation: result.relation,
        age: result.age || undefined,
        traits: result.traits,
        backstory: result.backstory,
        goals: result.interests, // Use interests as goals
        responseStyle: `${result.communicationStyle}\n\nEmotional Tone: ${result.emotionalTone}\n\nValues: ${result.values}\n\nQuirks: ${result.quirks}`,
      };
      
      const testMode = await isTestModeActive();
      const moderationResult = await moderatePersonaContent({ ...mappedForModeration, isTestMode: testMode });

      if (!moderationResult.isSafe) {
        throw new Error(GENERIC_MODERATION_ERROR);
      }

      // Map chat analysis fields to form fields
      setFormData({
        name: result.name,
        age: result.age,
        relation: result.relation,
        traits: result.traits,
        backstory: result.backstory,
        goals: result.interests, // Use interests as goals
        responseStyle: `${result.communicationStyle}\n\nEmotional Tone: ${result.emotionalTone}\n\nValues: ${result.values}\n\nQuirks: ${result.quirks}`,
        minWpm: 40,
        maxWpm: 80,
      });
      
      setFormKey(Date.now());
      setActiveTab('manual');
      toast({
        title: 'Persona Cloned!',
        description: `Successfully analyzed ${personNameForClone}'s chat. Review and create.`,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to analyze chat.');
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: err.message || 'An error occurred.',
      });
    } finally {
      setIsGeneratingFromChat(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setChatContent(content);
      toast({
        title: 'File Loaded',
        description: `${file.name} loaded successfully.`,
      });
    };
    reader.readAsText(file);
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
      const testMode = await isTestModeActive();
      const result = await generatePersonaDetails({
        personaName: name,
        personaRelation: relation,
        userName: userDetails?.name,
        userAbout: userDetails?.about,
        isTestMode: testMode
      });
      const moderationResult = await moderatePersonaContent({ name, relation, ...result, isTestMode: testMode });

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
        if (key !== 'age' && key !== 'minWpm' && key !== 'maxWpm' && !value) {
            setError(`${key.charAt(0).toUpperCase() + key.slice(1)} is required.`);
            setIsCreating(false);
            return;
        }
    }

    try {
      const testMode = await isTestModeActive();
      const moderationResult = await moderatePersonaContent({...dataToValidate, isTestMode: testMode});
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

      await createPersonaWithAvatar(dataToValidate, compressedDataUri);

    } catch (err: any) {
      // Check if this is a quota error - show fallback dialog
      if (err instanceof ImageGenerationQuotaError) {
        setPendingPersonaData(dataToValidate);
        setAvatarFallbackPrompt(err.prompt);
        setShowAvatarFallbackDialog(true);
        setIsCreating(false);
        return;
      }
      
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

  // Helper function to create persona with a given avatar
  const createPersonaWithAvatar = async (dataToValidate: any, avatarDataUri: string) => {
    const personaId = crypto.randomUUID();
    const now = Date.now();
    
    // Create new chat with personaId
    const newChat: ChatSession = {
      id: crypto.randomUUID(),
      personaId: personaId,
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    const newPersona: Persona = {
      id: personaId,
      ...dataToValidate,
      profilePictureUrl: avatarDataUri,
      memories: [],
    };

    // Save persona and chat separately
    await Promise.all([
      savePersona(newPersona),
      saveChatSession(newChat),
    ]);
    
    toast({
      title: 'Persona Created!',
      description: 'Your new persona is ready to chat.',
    });
    
    router.push(`/persona/${newPersona.id}?chat=${newChat.id}`);
  };

  // Handle using placeholder avatar from fallback dialog
  const handleUsePlaceholderAvatar = async () => {
    if (!pendingPersonaData) return;
    
    setIsCreating(true);
    setShowAvatarFallbackDialog(false);
    
    try {
      const placeholderAvatar = generatePlaceholderAvatar(pendingPersonaData.name);
      await createPersonaWithAvatar(pendingPersonaData, placeholderAvatar);
    } catch (err: any) {
      setError(err.message || 'Failed to create persona.');
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: err.message || 'An unknown error occurred.',
      });
    } finally {
      setIsCreating(false);
      setPendingPersonaData(null);
    }
  };

  // Handle avatar file upload from fallback dialog
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingPersonaData) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please upload an image file (PNG, JPG, etc.)',
      });
      return;
    }

    setIsCreating(true);
    setShowAvatarFallbackDialog(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataUri = event.target?.result as string;
        const compressedDataUri = await compressImage(dataUri);
        await createPersonaWithAvatar(pendingPersonaData, compressedDataUri);
      } catch (err: any) {
        setError(err.message || 'Failed to create persona.');
        toast({
          variant: 'destructive',
          title: 'Creation Failed',
          description: err.message || 'An unknown error occurred.',
        });
      } finally {
        setIsCreating(false);
        setPendingPersonaData(null);
      }
    };
    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'File Read Error',
        description: 'Failed to read the uploaded file.',
      });
      setIsCreating(false);
    };
    reader.readAsDataURL(file);
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(avatarFallbackPrompt);
      toast({
        title: 'Copied!',
        description: 'The prompt has been copied to your clipboard.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Could not copy to clipboard. Please select and copy manually.',
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
              <TabsList className="grid w-full grid-cols-3 h-8 p-0.5">
                  <TabsTrigger value="manual" className="h-7">Manual</TabsTrigger>
                  <TabsTrigger value="ai" className="h-7">
                  <Wand2 className="mr-2 h-4 w-4 hidden sm:inline-block" /> AI Generate
                  </TabsTrigger>
                  <TabsTrigger value="clone" className="h-7">
                  <Upload className="mr-2 h-4 w-4 hidden sm:inline-block" /> Clone Chat
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
              <TabsContent value="clone" className="pt-6">
                  <div className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="personName">Person's Name in Chat</Label>
                      <Input
                        id="personName"
                        value={personNameForClone}
                        onChange={(e) => setPersonNameForClone(e.target.value)}
                        placeholder="e.g., Sarah, John"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the exact name as it appears in the WhatsApp chat.
                      </p>
                  </div>
                  
                  <div className="space-y-2">
                      <Label>Upload Chat File</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".txt,.zip"
                          onChange={handleFileUpload}
                          className="cursor-pointer"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Upload WhatsApp chat export (.txt or .zip file)
                      </p>
                  </div>

                  <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or paste chat</span>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="chatContent">Paste Chat Content</Label>
                      <Textarea
                        id="chatContent"
                        value={chatContent}
                        onChange={(e) => setChatContent(e.target.value)}
                        placeholder="Paste your WhatsApp chat export here...&#10;&#10;Example format:&#10;02/09/2025, 8:34 PM - John: Hey, how are you?&#10;02/09/2025, 8:35 PM - Sarah: I'm good! How about you?"
                        rows={8}
                        className="resize-none font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste the exported WhatsApp chat. Minimum 10 messages required.
                      </p>
                  </div>

                  {error && (
                      <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                      </Alert>
                  )}

                  <Button
                      className="w-full"
                      onClick={handleGenerateFromChat}
                      disabled={isGeneratingFromChat || !chatContent || !personNameForClone}
                      size="lg"
                  >
                      {isGeneratingFromChat ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Chat...</>
                      ) : (
                        <><Sparkles className="mr-2 h-4 w-4" /> Clone Persona from Chat</>
                      )}
                  </Button>
                  </div>
              </TabsContent>
              </Tabs>
          </CardContent>
          </Card>
      </div>

      {/* Avatar Fallback Dialog - shown when image generation fails due to quota */}
      <Dialog open={showAvatarFallbackDialog} onOpenChange={setShowAvatarFallbackDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">Image Generation Unavailable</DialogTitle>
            <DialogDescription>
              The AI image generation feature is currently unavailable due to API quota limits. 
              You can still create your persona using one of these options:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Option 1: Upload custom image */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Option 1: Upload Your Own Image</Label>
              <p className="text-xs text-muted-foreground">
                Upload a custom avatar image for your persona.
              </p>
              <input
                ref={avatarUploadRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => avatarUploadRef.current?.click()}
                disabled={isCreating}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Upload Image
              </Button>
            </div>

            {/* Option 2: Use placeholder */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Option 2: Use Placeholder Avatar</Label>
              <p className="text-xs text-muted-foreground">
                Create the persona with a simple initials-based avatar. You can update it later.
              </p>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleUsePlaceholderAvatar}
                disabled={isCreating}
              >
                {isCreating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><User className="mr-2 h-4 w-4" /> Use Placeholder Avatar</>
                )}
              </Button>
            </div>

            {/* Option 3: Copy prompt for external generation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Option 3: Generate Externally</Label>
              <p className="text-xs text-muted-foreground">
                Copy this prompt to use with another AI image generator (like DALL-E, Midjourney, or Stable Diffusion), 
                then upload the result.
              </p>
              <div className="relative">
                <Textarea 
                  value={avatarFallbackPrompt}
                  readOnly
                  rows={4}
                  className="resize-none text-xs pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1"
                  onClick={handleCopyPrompt}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowAvatarFallbackDialog(false);
                setPendingPersonaData(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
