'use client';

import { useEffect, useState, useRef, FormEvent, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { chatAction } from '@/app/actions';
import type { Persona, UserDetails, ChatMessage, ChatSession } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Bot, User, AlertCircle, Trash2, MessageSquarePlus, ArrowLeft, PanelLeft } from 'lucide-react';
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

function PersonaChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar Skeleton */}
      <div className="w-80 bg-card border-r flex flex-col p-4 gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-1/2 mb-4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      {/* Right Chat Panel Skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex-1 p-4" />
        <div className="p-4 border-t">
          <Skeleton className="h-10 max-w-2xl mx-auto" />
        </div>
      </div>
    </div>
  );
}

export default function PersonaChatPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { id } = params;

  const [personas, setPersonas] = useLocalStorage<Persona[]>('personas', []);
  const [userDetails] = useLocalStorage<UserDetails>('user-details', { name: '', about: '' });
  
  const [persona, setPersona] = useState<Persona | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);
  const [isPersonaDeleteDialogOpen, setIsPersonaDeleteDialogOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const foundPersona = personas.find(p => p.id === id);
    if (foundPersona) {
      setPersona(foundPersona);
    }
  }, [id, personas]);

  const handleNewChat = useCallback(() => {
    if (!persona) return;
    const newChat: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    };
    const updatedPersona = {
      ...persona,
      chats: [newChat, ...persona.chats],
    };
    setPersonas(prev => prev.map(p => p.id === persona.id ? updatedPersona : p));
    router.push(`/persona/${persona.id}?chat=${newChat.id}`);
  }, [persona, router, setPersonas]);

  useEffect(() => {
    if (!persona) return;
    
    const chatIdFromQuery = searchParams.get('chat');
    const chatExists = persona.chats.some(c => c.id === chatIdFromQuery);

    if (chatIdFromQuery && chatExists) {
      setActiveChatId(chatIdFromQuery);
    } else if (persona.chats.length > 0) {
      const sortedChats = [...persona.chats].sort((a, b) => b.createdAt - a.createdAt);
      const latestChatId = sortedChats[0].id;
      router.replace(`/persona/${persona.id}?chat=${latestChatId}`, { scroll: false });
    } else {
      handleNewChat();
    }
  }, [persona, searchParams, router, handleNewChat]);

  const activeChat = useMemo(() => {
    return persona?.chats.find(c => c.id === activeChatId);
  }, [persona, activeChatId]);

  const messages = useMemo(() => activeChat?.messages || [], [activeChat]);

  const sortedChats = useMemo(() => {
    if (!persona?.chats) return [];
    return [...persona.chats].sort((a, b) => b.createdAt - a.createdAt);
  }, [persona?.chats]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('div');
      if (scrollContainer) {
        scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth',
        });
      }
    }
  }, [messages]);

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    textarea.style.height = 'auto'; // Reset height
    // max height 160px (h-40)
    const newHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${newHeight}px`; // Set to scroll height up to a max
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !persona || !activeChatId) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    
    const isNewChat = messages.length === 0;
    const newTitle = isNewChat ? (input.substring(0, 40) + (input.length > 40 ? '...' : '')) : activeChat!.title;

    const updatedChatSession = {
      ...activeChat!,
      title: newTitle,
      messages: [...messages, userMessage],
    };

    const updatedPersona = {
      ...persona,
      chats: persona.chats.map(c => c.id === activeChatId ? updatedChatSession : c),
    };
    
    setPersonas(prev => prev.map(p => p.id === persona.id ? updatedPersona : p));
    setInput('');
    if(textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);
    setError(null);

    const res = await chatAction({ persona, userDetails, message: input });

    setIsLoading(false);
    if (res.response) {
      const assistantMessage: ChatMessage = { role: 'assistant', content: res.response };
      const finalUpdatedSession = {
        ...updatedChatSession,
        messages: [...updatedChatSession.messages, assistantMessage],
      };
      const finalUpdatedPersona = {
        ...persona,
        chats: persona.chats.map(c => c.id === activeChatId ? finalUpdatedSession : c),
      };
      setPersonas(prev => prev.map(p => p.id === persona.id ? finalUpdatedPersona : p));
    } else if (res.error) {
      setError(res.error);
    }
  };

  const handleConfirmDeleteChat = useCallback(() => {
    if (!persona || !chatToDelete) return;

    setPersonas(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updatedChats = p.chats.filter(c => c.id !== chatToDelete.id);
          return { ...p, chats: updatedChats };
        }
        return p;
      })
    );

    if (activeChatId === chatToDelete.id) {
      router.replace(`/persona/${id}`);
    }
    
    setIsDeleteDialogOpen(false);
    setChatToDelete(null);
  }, [id, activeChatId, persona, chatToDelete, setPersonas, router]);

  const handleDeletePersona = () => {
    setPersonas(prev => prev.filter(p => p.id !== id));
    router.push('/');
  };

  if (!isMounted) {
    return <PersonaChatSkeleton />;
  }

  if (!persona) {
    return (
       <div className="container flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="m-auto">
          <CardHeader>
            <CardTitle>Persona Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This persona could not be found. It might have been deleted.</p>
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to All Personas
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] bg-background">
          {/* Left Sidebar */}
          <div className={cn(
              "transition-all duration-300 ease-in-out flex flex-col bg-card border-r",
              isSidebarOpen ? "w-80" : "w-0 opacity-0"
          )}>
            <div className="p-4 space-y-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                     <Image
                      src={persona.profilePictureUrl}
                      alt={persona.name}
                      width={64}
                      height={64}
                      className={cn(
                        "rounded-full object-cover aspect-square border-2 border-primary/50 transition-all duration-500",
                        isLoading && "animate-[glow_2s_ease-in-out_infinite]"
                      )}
                      data-ai-hint="persona portrait"
                    />
                    <h2 className="font-headline text-xl font-semibold truncate">{persona.name}</h2>
                </div>
                <Button variant="destructive" className="w-full" onClick={() => setIsPersonaDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Persona
                </Button>
            </div>
            
            <div className="p-4 flex-1 flex flex-col min-h-0 border-t">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-headline text-lg">Chat History</h3>
                    <Button size="sm" variant="ghost" onClick={handleNewChat}>
                        <MessageSquarePlus className="mr-2 h-4 w-4" /> New
                    </Button>
                </div>
                <ScrollArea className="flex-1 -mx-4">
                  <div className="px-4">
                    {sortedChats.length > 0 ? (
                      <div className="space-y-1">
                      {sortedChats.map(chat => (
                        <Link key={chat.id} href={`/persona/${persona.id}?chat=${chat.id}`} className="block group" scroll={false}>
                          <div className={cn(
                            "flex justify-between items-center p-2 rounded-md transition-colors",
                            activeChatId === chat.id ? 'bg-primary/20' : 'hover:bg-secondary'
                          )}>
                            <p className="text-sm truncate pr-2">{chat.title}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation();
                                setChatToDelete(chat);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                            </Button>
                          </div>
                        </Link>
                      ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No chats yet.</p>
                    )}
                  </div>
                </ScrollArea>
            </div>
          </div>
          
          {/* Right Chat Panel */}
          <div className="flex-1 flex flex-col h-full">
             <header className="flex items-center gap-4 p-2 border-b flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    <PanelLeft className="h-5 w-5" />
                </Button>
                <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
                    <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Personas
                    </Link>
                </Button>
            </header>
            
            <div className="flex-1 flex flex-col min-h-0">
                {activeChatId && activeChat ? (
                <>
                    <ScrollArea className="flex-1" ref={scrollAreaRef}>
                    <div className="space-y-6 p-4">
                        {messages.map((message, index) => (
                        <div key={index} className={cn("flex items-start gap-3 animate-fade-in-up", message.role === 'user' && 'justify-end')}>
                             {message.role === 'assistant' && (
                                <Avatar className="flex-shrink-0">
                                    <AvatarImage src={persona.profilePictureUrl} alt={persona.name} />
                                    <AvatarFallback><Bot /></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn("max-w-xl p-3 rounded-lg", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>
                            {message.role === 'user' && (
                                <Avatar className="flex-shrink-0">
                                    <AvatarFallback><User /></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                        ))}
                        {isLoading && (
                        <div className="flex items-start gap-3 justify-start animate-fade-in-up">
                            <Avatar className="flex-shrink-0">
                                <AvatarImage src={persona.profilePictureUrl} alt={persona.name} />
                                <AvatarFallback><Bot /></AvatarFallback>
                            </Avatar>
                            <div className="p-3 rounded-lg bg-secondary flex items-center">
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
                    <div className="p-4 border-t bg-background">
                      <div className="max-w-3xl mx-auto">
                        <form onSubmit={handleSubmit} className="relative flex w-full items-center rounded-lg border border-input bg-secondary">
                          <Textarea
                              ref={textareaRef}
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onInput={handleInput}
                              placeholder={`Message ${persona.name}...`}
                              className="flex-1 resize-none border-0 bg-transparent p-3 text-sm shadow-none scrollbar-hide focus-visible:ring-0"
                              rows={1}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if(textareaRef.current) handleSubmit(e as any);
                                  }
                              }}
                          />
                          <Button
                              type="submit"
                              size="icon"
                              disabled={isLoading || !input.trim()}
                              className="m-1.5 flex-shrink-0"
                          >
                              <Send className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                </>
                ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Bot className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-medium font-headline">No Active Chat</h3>
                    <p className="mt-2 text-base text-muted-foreground">
                        Select a conversation or start a new one.
                    </p>
                    </div>
                )}
            </div>
          </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the chat session: "{chatToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChatToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirmDeleteChat}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isPersonaDeleteDialogOpen} onOpenChange={setIsPersonaDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete {persona?.name} and all associated chats. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeletePersona}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
