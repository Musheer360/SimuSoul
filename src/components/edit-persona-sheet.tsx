'use client';

import { useFormStatus } from 'react-dom';
import { useEffect, useActionState, useRef } from 'react';
import type { Persona, UpdatePersonaState } from '@/lib/types';
import { updatePersonaAction } from '@/app/actions';
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </>
      )}
    </Button>
  );
}

interface EditPersonaSheetProps {
  persona: Persona;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonaUpdate: (updatedPersonaData: Omit<Persona, 'chats' | 'memories'>) => void;
}

export function EditPersonaSheet({ persona, open, onOpenChange, onPersonaUpdate }: EditPersonaSheetProps) {
  const { toast } = useToast();
  const initialState: UpdatePersonaState = {
    message: null,
    errors: {},
    success: false,
    persona: null,
  };
  const [state, dispatch] = useActionState(updatePersonaAction, initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    if (state.success && state.persona && state !== stateRef.current) {
      onPersonaUpdate(state.persona);
    } else if (state.message && !state.success && state !== stateRef.current) {
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: state.message,
        });
    }
    stateRef.current = state;
  }, [state, onPersonaUpdate, toast]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col p-0">
        <SheetHeader className="p-6">
          <SheetTitle className="font-headline">Edit {persona.name}</SheetTitle>
          <SheetDescription>
            Make changes to your persona's details below. Changes are saved upon submission.
          </SheetDescription>
        </SheetHeader>
        <form action={dispatch} className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 px-6">
                <div className="space-y-4 pb-6">
                    <input type="hidden" name="id" value={persona.id} />
                    <input type="hidden" name="profilePictureUrl" value={persona.profilePictureUrl} />
                    
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Name</Label>
                        <Input id="edit-name" name="name" defaultValue={persona.name} required />
                        {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-relation">Relationship</Label>
                        <Input id="edit-relation" name="relation" defaultValue={persona.relation} required />
                        {state.errors?.relation && <p className="text-sm font-medium text-destructive">{state.errors.relation}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-traits">Traits</Label>
                        <Textarea id="edit-traits" name="traits" defaultValue={persona.traits} required rows={3} className="resize-none" />
                        <p className="text-xs text-muted-foreground">
                        These details influence the persona's behavior.
                        </p>
                        {state.errors?.traits && <p className="text-sm font-medium text-destructive">{state.errors.traits}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-backstory">Backstory</Label>
                        <Textarea id="edit-backstory" name="backstory" defaultValue={persona.backstory} required rows={5} className="resize-none" />
                        {state.errors?.backstory && <p className="text-sm font-medium text-destructive">{state.errors.backstory}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-goals">Goals</Label>
                        <Textarea id="edit-goals" name="goals" defaultValue={persona.goals} required rows={3} className="resize-none" />
                        {state.errors?.goals && <p className="text-sm font-medium text-destructive">{state.errors.goals}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-responseStyle">Response Style</Label>
                        <Textarea id="edit-responseStyle" name="responseStyle" defaultValue={persona.responseStyle} required rows={4} className="resize-none" />
                         <p className="text-xs text-muted-foreground">
                            Define how the persona communicates. This guides their tone, language, and personality in chat.
                        </p>
                        {state.errors?.responseStyle && <p className="text-sm font-medium text-destructive">{state.errors.responseStyle}</p>}
                    </div>
                </div>
            </ScrollArea>
            <SheetFooter className="p-6 border-t bg-background">
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <SubmitButton />
            </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
