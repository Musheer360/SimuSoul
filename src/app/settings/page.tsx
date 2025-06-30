'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { UserDetails, ApiKeys } from '@/lib/types';
import { getUserDetails, saveUserDetails, getApiKeys, saveApiKeys } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [userDetails, setUserDetails] = useState<UserDetails>({ name: '', about: '' });
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ gemini: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      const [details, keys] = await Promise.all([getUserDetails(), getApiKeys()]);
      setUserDetails(details);
      setApiKeys(keys);
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handleUserDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setUserDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeys(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([saveUserDetails(userDetails), saveApiKeys(apiKeys)]);
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
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold font-headline text-xl text-foreground">API Keys</h3>
              <div className="space-y-2">
                <Label htmlFor="gemini">Gemini API Key</Label>
                <Input
                  id="gemini"
                  name="gemini"
                  type="password"
                  value={apiKeys.gemini}
                  onChange={handleApiKeyChange}
                  placeholder="Enter your custom Gemini key"
                />
                 <p className="text-xs text-muted-foreground pt-1">
                   Your key is stored locally and used for all AI requests. If left empty, a server-provided key will be used.
                 </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" onClick={() => router.back()} disabled={isSaving}>
                <ArrowLeft className="mr-2 h-4 w-4" />
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
