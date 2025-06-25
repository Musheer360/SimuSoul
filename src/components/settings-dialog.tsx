'use client';

import React from 'react';
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
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { UserDetails, ApiKeys } from '@/lib/types';

export function SettingsDialog({ children }: { children: React.ReactNode }) {
  const [userDetails, setUserDetails] = useLocalStorage<UserDetails>('user-details', {
    name: '',
    about: '',
  });
  const [apiKeys, setApiKeys] = useLocalStorage<ApiKeys>('api-keys', {
    gemini: '',
  });

  const handleUserDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setUserDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeys(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Settings</DialogTitle>
          <DialogDescription>
            Customize your experience. Your details are saved locally on your device.
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
                className="col-span-3"
                placeholder="A short description of you, can also be a URL."
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
              />
            </div>
             <p className="text-xs text-muted-foreground px-1 text-center col-span-4">Note: The AI currently uses the server's environment variables. This input is for future use.</p>
          </div>
        </div>
        <DialogFooter>
          <DialogTrigger asChild>
            <Button type="button">Save changes</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
