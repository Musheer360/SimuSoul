
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { UserDetails, ApiKeys } from '@/lib/types';
import { getUserDetails, saveUserDetails, getApiKeys, saveApiKeys, clearDatabase } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [userDetails, setUserDetails] = useState<UserDetails>({ name: '', about: '' });
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ groq: [''], togetherAi: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      const [details, keys] = await Promise.all([getUserDetails(), getApiKeys()]);
      setUserDetails(details);
      setApiKeys({ groq: keys.groq?.length > 0 ? keys.groq : [''], togetherAi: keys.togetherAi || '' });
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handleUserDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setUserDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApiKeyChange = (provider: 'groq', index: number, value: string) => {
    setApiKeys(prev => {
      const newKeys = [...prev[provider]];
      newKeys[index] = value;
      return { ...prev, [provider]: newKeys };
    });
  };

  const handleTogetherAiKeyChange = (value: string) => {
    setApiKeys(prev => ({ ...prev, togetherAi: value }));
  };
  
  const handleAddKey = (provider: 'groq') => {
    const keys = apiKeys[provider];
    if (keys.length >= 5) {
      toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can add a maximum of 5 API keys.' });
      return;
    }
    if (keys[keys.length - 1].trim() === '') {
      toast({ variant: 'destructive', title: 'Empty Field', description: 'Please fill in the current API key before adding a new one.' });
      return;
    }
    setApiKeys(prev => ({ ...prev, [provider]: [...prev[provider], ''] }));
  };

  const handleRemoveKey = (provider: 'groq', index: number) => {
    const newKeys = apiKeys[provider].filter((_, i) => i !== index);
    setApiKeys(prev => ({ ...prev, [provider]: newKeys.length === 0 ? [''] : newKeys }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const keysToSave: ApiKeys = {
        groq: apiKeys.groq.map(k => k.trim()).filter(Boolean),
        togetherAi: apiKeys.togetherAi.trim(),
      };
      await Promise.all([saveUserDetails(userDetails), saveApiKeys(keysToSave)]);
      toast({
        title: 'Settings Saved',
        description: 'Your details and API keys have been updated.',
      });
      router.back();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDatabase = async () => {
    setIsClearing(true);
    try {
        await clearDatabase();
        toast({
            title: 'Application Reset',
            description: 'All data has been cleared. The application will now reload.',
        });
        // The clearDatabase function will handle page reload.
    } catch (error) {
        console.error('Failed to clear database:', error);
        toast({
            variant: 'destructive',
            title: 'Reset Failed',
            description: 'Could not clear all data. Please try again.',
        });
        setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="bg-card/80 backdrop-blur-sm border border-border/20">
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-3xl md:text-4xl">Settings</CardTitle>
            <CardDescription>
              Customize your experience. Your details are saved locally in your browser's database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <h3 className="font-semibold font-headline text-xl text-foreground">Your Details</h3>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={userDetails.name}
                  onChange={handleUserDetailsChange}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="about">About You</Label>
                <Textarea
                  id="about"
                  name="about"
                  value={userDetails.about}
                  onChange={handleUserDetailsChange}
                  className="resize-none"
                  placeholder="A short description of you, can also be a URL."
                  rows={6}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold font-headline text-xl text-foreground">API Keys</h3>
              <p className="text-sm text-muted-foreground">Add your API keys to enable AI features. All keys are stored locally on your device.</p>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">Groq API Keys (Chat & AI)</Label>
                {apiKeys.groq.map((key, index) => (
                  <div key={`groq-${index}`} className="flex items-center gap-2">
                    <Label htmlFor={`groq-${index}`} className="sr-only">Groq API Key {index + 1}</Label>
                    <Input
                      id={`groq-${index}`}
                      type="password"
                      value={key}
                      onChange={(e) => handleApiKeyChange('groq', index, e.target.value)}
                      placeholder={`Enter Groq key ${index + 1}`}
                      className="flex-grow"
                    />
                    {apiKeys.groq.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveKey('groq', index)} aria-label={`Remove Groq key ${index + 1}`}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
                {apiKeys.groq.length < 5 && (
                  <Button variant="outline" onClick={() => handleAddKey('groq')} className="w-full justify-start text-muted-foreground">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add another Groq key
                  </Button>
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  Get your free API key from <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Groq Console</a>. Powers all chat and AI features.
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Together AI Key (Avatar Generation)</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="together-ai" className="sr-only">Together AI API Key</Label>
                  <Input
                    id="together-ai"
                    type="password"
                    value={apiKeys.togetherAi}
                    onChange={(e) => handleTogetherAiKeyChange(e.target.value)}
                    placeholder="Enter Together AI key"
                    className="flex-grow"
                  />
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Get your free API key from <a href="https://api.together.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Together AI</a>. Used for AI-generated profile pictures. Optional — you can use placeholder avatars instead.
                </p>
              </div>
            </div>

            <Separator />
            
            <div className="space-y-4 rounded-lg border border-destructive/50 p-4">
                <h3 className="font-semibold font-headline text-xl text-destructive text-center">Danger Zone</h3>
                <div className="text-center space-y-4">
                    <div>
                        <p className="font-medium">Reset Application</p>
                        <p className="text-sm text-muted-foreground">
                            This will permanently delete all your personas, chats, settings, and API keys. This action is irreversible.
                        </p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                                <Trash2 className="mr-2 h-4 w-4" /> Clear All Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete everything, including all personas, chats, memories, and your user settings. This action cannot be undone and the application will reload.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={handleClearDatabase}
                                    disabled={isClearing}
                                >
                                    {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, delete everything'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Button variant="outline" onClick={() => router.back()} disabled={isSaving} size="lg">
                <ArrowLeft />
                Back
              </Button>
              <Button onClick={handleSave} disabled={isSaving} size="lg">
                 {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
