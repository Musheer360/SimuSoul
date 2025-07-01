'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { UserDetails, ApiKeys } from '@/lib/types';
import { getUserDetails, saveUserDetails, getApiKeys, saveApiKeys } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [userDetails, setUserDetails] = useState<UserDetails>({ name: '', about: '' });
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ gemini: [''] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
            <CardTitle className="font-headline text-3xl">Settings</CardTitle>
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
                   Your keys are stored locally and used for all AI requests. If left empty, a server-provided key will be used.
                 </p>
              </div>
            </div>

            <div className="flex w-full gap-4 pt-4">
              <Button variant="outline" onClick={() => router.back()} disabled={isSaving} size="lg" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSave} disabled={isSaving} size="lg" className="flex-1">
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
