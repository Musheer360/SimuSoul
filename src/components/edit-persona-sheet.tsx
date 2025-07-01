
'use client';

import { useState, useEffect, FormEvent } from 'react';
import type { Persona } from '@/lib/types';
import { moderatePersonaContent } from '@/ai/flows/moderate-persona-content';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';

const GENERIC_MODERATION_ERROR = 'This content does not meet the safety guidelines. Please modify it and try again.';
const emptyStringAsUndefined = (val: string | number | undefined | null) => (val === '' || val === undefined || val === null ? undefined : Number(val));

interface EditPersonaSheetProps {
  persona: Persona;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonaUpdate: (updatedPersonaData: Omit<Persona, 'chats' | 'memories'>) => void;
}

export function EditPersonaSheet({ persona, open, onOpenChange, onPersonaUpdate }: EditPersonaSheetProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState(persona);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When a new persona is passed in, reset the form data.
    setFormData(persona);
  }, [persona]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'age' ? (value === '' ? undefined : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    const dataToValidate = {
        name: formData.name || '',
        relation: formData.relation || '',
        age: emptyStringAsUndefined(formData.age),
        traits: formData.traits || '',
        backstory: formData.backstory || '',
        goals: formData.goals || '',
        responseStyle: formData.responseStyle || '',
    };
    
    try {
        const moderationResult = await moderatePersonaContent(dataToValidate);
        if (!moderationResult.isSafe) {
            throw new Error(GENERIC_MODERATION_ERROR);
        }

        const updatedPersonaData: Omit<Persona, 'chats' | 'memories'> = {
            id: persona.id,
            ...dataToValidate,
            minWpm: persona.minWpm,
            maxWpm: persona.maxWpm,
            profilePictureUrl: persona.profilePictureUrl
        };

        onPersonaUpdate(updatedPersonaData);
        toast({ title: 'Success!', description: 'Persona updated successfully.' });
        onOpenChange(false);

    } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
        toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col p-0">
        <SheetHeader className="p-6">
          <SheetTitle className="font-headline">Edit {persona.name}</SheetTitle>
          <SheetDescription>
            Make changes to your persona's details below. Changes are saved upon submission.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 px-6">
                <div className="space-y-4 pb-6">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Name</Label>
                        <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-relation">Relationship</Label>
                            <Input id="edit-relation" name="relation" value={formData.relation} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-age">Age (Optional)</Label>
                            <Input id="edit-age" name="age" type="number" min="18" value={formData.age || ''} onChange={handleInputChange} placeholder="e.g., 28" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-traits">Traits</Label>
                        <Textarea id="edit-traits" name="traits" value={formData.traits} onChange={handleInputChange} required rows={3} className="resize-none" />
                        <p className="text-xs text-muted-foreground">
                        These details influence the persona's behavior.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-backstory">Backstory</Label>
                        <Textarea id="edit-backstory" name="backstory" value={formData.backstory} onChange={handleInputChange} required rows={5} className="resize-none" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-goals">Goals</Label>
                        <Textarea id="edit-goals" name="goals" value={formData.goals} onChange={handleInputChange} required rows={3} className="resize-none" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-responseStyle">Response Style</Label>
                        <Textarea id="edit-responseStyle" name="responseStyle" value={formData.responseStyle} onChange={handleInputChange} required rows={4} className="resize-none" />
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
                </div>
            </ScrollArea>
            <SheetFooter className="p-6 border-t bg-background">
                <SheetClose asChild>
                    <Button type="button" variant="outline" size="lg">Cancel</Button>
                </SheetClose>
                 <Button type="submit" disabled={isSaving} size="lg">
                    {isSaving ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                        <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                    )}
                </Button>
            </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
