'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { chatAction } from '@/app/actions';
import type { Persona, UserDetails, ChatMessage } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Bot, User, AlertCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

export default function PersonaChatPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [personas, setPersonas] = useLocalStorage<Persona[]>('personas', []);
  const [userDetails] = useLocalStorage<UserDetails>('user-details', { name: '', about: '' });
  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const foundPersona = personas.find(p => p.id === id);
    if (foundPersona) {
      setPersona(foundPersona);
    } else if (personas.length > 0) {
      // If persona not found and personas exist, maybe redirect
      // For now, we'll just show a not found state
    }
  }, [id, personas]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !persona) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    const res = await chatAction({ persona, userDetails, message: input });

    setIsLoading(false);
    if (res.response) {
      const assistantMessage: ChatMessage = { role: 'assistant', content: res.response };
      setMessages(prev => [...prev, assistantMessage]);
    } else if (res.error) {
      setError(res.error);
    }
  };

  const handleDeletePersona = () => {
    setPersonas(prev => prev.filter(p => p.id !== id));
    router.push('/');
  };

  if (!persona) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Persona Not Found</CardTitle>
          <CardDescription>
            This persona could not be found. It might have been deleted.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <Card className="md:col-span-1 h-fit sticky top-24 animate-fade-in">
        <CardHeader className="items-center text-center">
          <Image
            src={persona.profilePictureUrl}
            alt={persona.name}
            width={128}
            height={128}
            className={cn(
              "rounded-full object-cover aspect-square border-4 border-primary/50 transition-all duration-500",
              isLoading && "animate-[glow_2s_ease-in-out_infinite]"
            )}
            data-ai-hint="persona portrait"
          />
          <CardTitle className="font-headline text-2xl pt-4">{persona.name}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-center space-y-4">
          <div>
            <h3 className="font-semibold text-primary/80 font-headline">Traits</h3>
            <p className="text-muted-foreground">{persona.traits}</p>
          </div>
          <div>
            <h3 className="font-semibold text-primary/80 font-headline">Backstory</h3>
            <p className="text-muted-foreground">{persona.backstory}</p>
          </div>
           <div>
            <h3 className="font-semibold text-primary/80 font-headline">Goals</h3>
            <p className="text-muted-foreground">{persona.goals}</p>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Persona
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this
                  persona.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleDeletePersona}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
      
      <div className="md:col-span-2 flex flex-col h-[calc(100vh-10rem)] bg-card rounded-lg border">
         <CardHeader>
            <CardTitle className="font-headline">Chat with {persona.name}</CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div key={index} className={cn("flex items-start gap-3 animate-fade-in-up", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                {message.role === 'assistant' && (
                  <Avatar>
                    <AvatarImage src={persona.profilePictureUrl} alt={persona.name} />
                    <AvatarFallback><Bot /></AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-md p-3 rounded-lg", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <Avatar>
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3 justify-start animate-fade-in-up">
                 <Avatar>
                    <AvatarImage src={persona.profilePictureUrl} alt={persona.name} />
                    <AvatarFallback><Bot /></AvatarFallback>
                  </Avatar>
                  <div className="max-w-md p-3 rounded-lg bg-secondary flex items-center">
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin"/>
                  </div>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${persona.name}...`}
              className="flex-1 resize-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
