'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { UserDetails, ApiKeys } from '@/lib/types';
import { getUserDetails, saveUserDetails, getApiKeys, saveApiKeys } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

export function SettingsDialog({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails>({ name: '', about: '' });
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ gemini: '' });

  useEffect(() => {
    if (open) {
      async function loadSettings() {
        const [details, keys] = await Promise.all([getUserDetails(), getApiKeys()]);
        setUserDetails(details);
        setApiKeys(keys);
      }
      loadSettings();
    }
  }, [open]);

  const handleUserDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setUserDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeys(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      await Promise.all([saveUserDetails(userDetails), saveApiKeys(apiKeys)]);
      toast({
        title: 'Settings Saved',
        description: 'Your details and API keys have been updated.',
      });
      setOpen(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save your settings. Please try again.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Settings</DialogTitle>
          <DialogDescription>
            Customize your experience. Your details are saved locally in your browser's database.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <h3 className="font-semibold font-headline">Your Details</h3>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={userDetails.name}
                onChange={handleUserDetailsChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="about" className="text-right">
                About You
              </Label>
              <Textarea
                id="about"
                name="about"
                value={userDetails.about}
                onChange={handleUserDetailsChange}
                className="col-span-3 resize-none"
                placeholder="A short description of you, can also be a URL."
                rows={3}
              />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold font-headline">API Keys</h3>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gemini" className="text-right">
                Gemini
              </Label>
              <Input
                id="gemini"
                name="gemini"
                type="password"
                value={apiKeys.gemini}
                onChange={handleApiKeyChange}
                className="col-span-3"
                placeholder="Enter your custom Gemini key"
              />
            </div>
             <p className="text-xs text-muted-foreground px-1 text-center col-span-4">
               Your key is stored locally and used for all AI requests. If left empty, a server-provided key will be used.
             </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
