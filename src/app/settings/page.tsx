
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
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ gemini: [''] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      const [details, keys] = await Promise.all([getUserDetails(), getApiKeys()]);
      setUserDetails(details);
      setApiKeys(keys.gemini && keys.gemini.length > 0 ? keys : { gemini: [''] });
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handleUserDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setUserDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApiKeyChange = (index: number, value: string) => {
    const newKeys = [...apiKeys.gemini];
    newKeys[index] = value;
    setApiKeys({ gemini: newKeys });
  };
  
  const handleAddKey = () => {
    if (apiKeys.gemini.length >= 5) {
      toast({ variant: 'destructive', title: 'Limit Reached', description: 'You can add a maximum of 5 API keys.' });
      return;
    }
    if (apiKeys.gemini[apiKeys.gemini.length - 1].trim() === '') {
      toast({ variant: 'destructive', title: 'Empty Field', description: 'Please fill in the current API key before adding a new one.' });
      return;
    }
    setApiKeys({ gemini: [...apiKeys.gemini, ''] });
  };

  const handleRemoveKey = (index: number) => {
    const newKeys = apiKeys.gemini.filter((_, i) => i !== index);
    if (newKeys.length === 0) {
      setApiKeys({ gemini: [''] });
    } else {
      setApiKeys({ gemini: newKeys });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const keysToSave = {
        gemini: apiKeys.gemini.map(k => k.trim()).filter(Boolean),
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
              <div className="space-y-3">
                {apiKeys.gemini.map((key, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Label htmlFor={`gemini-${index}`} className="sr-only">
                      Gemini API Key {index + 1}
                    </Label>
                    <Input
                      id={`gemini-${index}`}
                      name="gemini"
                      type="password"
                      value={key}
                      onChange={(e) => handleApiKeyChange(index, e.target.value)}
                      placeholder={`Enter Gemini key ${index + 1}`}
                      className="flex-grow"
                    />
                    {apiKeys.gemini.length > 1 && (
                       <Button variant="ghost" size="icon" onClick={() => handleRemoveKey(index)} aria-label={`Remove key ${index + 1}`}>
                         <Trash2 className="h-4 w-4 text-muted-foreground" />
                       </Button>
                    )}
                  </div>
                ))}
                {apiKeys.gemini.length < 5 && (
                  <Button variant="outline" onClick={handleAddKey} className="w-full justify-start text-muted-foreground">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add another API key
                  </Button>
                )}
                 <p className="text-xs text-muted-foreground pt-1">
                   Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>. Keys are stored locally on your device.
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
