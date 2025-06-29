
'use client';

import { useEffect, useState, useRef, FormEvent, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { chatAction, generateChatTitleAction } from '@/app/actions';
import type { Persona, UserDetails, ChatMessage, ChatSession, ApiKeys } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Bot, User, AlertCircle, Trash2, MessageSquarePlus, ArrowLeft, PanelLeft, Pencil, Brain } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EditPersonaSheet } from '@/components/edit-persona-sheet';
import { FormattedMessage } from '@/components/formatted-message';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatedChatTitle } from '@/components/animated-chat-title';
import { getPersona, savePersona, deletePersona, getUserDetails, getApiKeys } from '@/lib/db';

function PersonaChatSkeleton() {
  return (
    <div className="flex h-full">
      {/* Left Sidebar Skeleton */}
      <div className="w-80 bg-card/80 backdrop-blur-sm border-r hidden md:flex flex-col">
          <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                  </div>
              </div>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-2 border-t">
              <div className="flex justify-between items-center mb-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
          </div>
      </div>
      {/* Right Chat Panel Skeleton */}
      <div className="flex-1 flex flex-col bg-background/80 backdrop-blur-sm">
        <header className="p-2 border-b flex items-center gap-2"><Skeleton className="h-8 w-48" /></header>
        <div className="flex-1 p-6" />
        <div className="p-4 border-t"><Skeleton className="h-10 max-w-3xl mx-auto rounded-lg" /></div>
      </div>
    </div>
  );
}

export default function PersonaChatPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { id } = params;
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [persona, setPersona] = useState<Persona | null | undefined>(undefined);
  const [userDetails, setUserDetails] = useState<UserDetails>({ name: '', about: '' });
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ gemini: '' });
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isManagementDialogOpen, setIsManagementDialogOpen] = useState(false);
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [glowingMessageIndex, setGlowingMessageIndex] = useState<number | null>(null);
  const [isMemoryButtonGlowing, setIsMemoryButtonGlowing] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    async function loadPageData() {
      if (!id || typeof id !== 'string') {
        setPersona(null);
        return;
      }
      const [p, ud, ak] = await Promise.all([
        getPersona(id),
        getUserDetails(),
        getApiKeys(),
      ]);
      setPersona(p || null);
      setUserDetails(ud);
      setApiKeys(ak);
    }
    loadPageData();
  }, [id]);

  const handleNewChat = useCallback(async () => {
    if (!persona) return;

    const existingNewChat = persona.chats.find(c => c.title === 'New Chat');
    if (existingNewChat) {
      router.push(`/persona/${persona.id}?chat=${existingNewChat.id}`);
      return;
    }

    const now = Date.now();
    const newChat: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    const updatedPersona = {
      ...persona,
      chats: [newChat, ...(persona.chats || [])],
    };
    setPersona(updatedPersona);
    await savePersona(updatedPersona);
    router.push(`/persona/${persona.id}?chat=${newChat.id}`);
  }, [persona, router]);
  
  const sortedChats = useMemo(() => {
    if (!persona?.chats) return [];
    return [...persona.chats].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [persona?.chats]);

  useEffect(() => {
    if (!persona) return;
    
    const chatIdFromQuery = searchParams.get('chat');
    const chatExists = persona.chats.some(c => c.id === chatIdFromQuery);

    if (chatIdFromQuery && chatExists) {
      setActiveChatId(chatIdFromQuery);
    } else {
      const existingNewChat = persona.chats.find(c => c.title === 'New Chat');
      if (existingNewChat) {
        router.replace(`/persona/${persona.id}?chat=${existingNewChat.id}`, { scroll: false });
      } else {
        const now = Date.now();
        const newChatSession: ChatSession = {
            id: crypto.randomUUID(),
            title: 'New Chat',
            messages: [],
            createdAt: now,
            updatedAt: now,
        };
        const updatedPersona = {
            ...persona,
            chats: [newChatSession, ...(persona.chats || [])],
        };
        setPersona(updatedPersona);
        savePersona(updatedPersona).then(() => {
            router.replace(`/persona/${persona.id}?chat=${newChatSession.id}`, { scroll: false });
        });
      }
    }
  }, [persona, searchParams, router]);

  const activeChat = useMemo(() => {
    return persona?.chats.find(c => c.id === activeChatId);
  }, [persona, activeChatId]);

  const messages = useMemo(() => activeChat?.messages || [], [activeChat]);
  const lastMessageIsAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant';

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
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !persona || !activeChatId || isLoading) return;
  
    setIsLoading(true);
  
    const userMessage: ChatMessage = { role: 'user', content: input };
    const userInput = input;
    const isNewChat = messages.length === 0;
  
    const optimisticPersona = {
      ...persona,
      chats: persona.chats.map(c =>
        c.id === activeChatId
          ? { ...c, messages: [...c.messages, userMessage], updatedAt: Date.now() }
          : c
      ),
    };
    setPersona(optimisticPersona);
  
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setError(null);
  
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const currentDateForMemory = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
    const res = await chatAction({
      persona,
      userDetails,
      chatHistory: messages,
      message: userInput,
      apiKey: apiKeys.gemini,
      currentDateTime,
      currentDateForMemory,
    });
  
    if (res.error) {
      setError(res.error);
      setPersona(persona);
      setIsLoading(false);
      return;
    }
  
    let finalMemories = persona.memories || [];
    const memoryWasUpdated = (res.newMemories?.length || 0) > 0 || (res.removedMemories?.length || 0) > 0;
  
    if (memoryWasUpdated) {
      const memoriesToDelete = new Set(res.removedMemories || []);
      finalMemories = finalMemories.filter(mem => !memoriesToDelete.has(mem));
      const memoriesToAdd = res.newMemories || [];
      finalMemories = [...finalMemories, ...memoriesToAdd];
  
      setGlowingMessageIndex(messages.length);
      setTimeout(() => setGlowingMessageIndex(null), 1500);
  
      if (!isMobile) {
        setIsMemoryButtonGlowing(true);
        setTimeout(() => setIsMemoryButtonGlowing(false), 1500);
      }
    }
  
    let personaForLoop = {
      ...persona,
      chats: optimisticPersona.chats,
      memories: finalMemories,
    };
  
    if (isNewChat && res.response && res.response[0]) {
      const titleResult = await generateChatTitleAction({
        userMessage: userInput,
        assistantResponse: res.response[0],
        apiKey: apiKeys.gemini,
      });
  
      if (titleResult.title) {
        personaForLoop = {
          ...personaForLoop,
          chats: personaForLoop.chats.map(c =>
            c.id === activeChatId ? { ...c, title: titleResult.title! } : c
          ),
        };
      }
    }
  
    setPersona(personaForLoop);
    await savePersona(personaForLoop);
  
    if (res.response && res.response.length > 0) {
      const baseMessages = optimisticPersona.chats.find(c => c.id === activeChatId)?.messages || [];
      let messagesForThisTurn = [...baseMessages];
  
      for (let i = 0; i < res.response.length; i++) {
        const messageContent = res.response[i];
  
        // For messages after the first one, add a realistic typing delay
        if (i > 0) {
          const words = messageContent.split(/\s+/).filter(Boolean).length;
          const wpm = 45; // Words per minute
          const typingTimeMs = (words / wpm) * 60 * 1000;
          const delay = Math.max(750, Math.min(typingTimeMs, 3500));
          await new Promise(resolve => setTimeout(resolve, delay));
        }
  
        const assistantMessage: ChatMessage = { role: 'assistant', content: messageContent };
        messagesForThisTurn.push(assistantMessage);
  
        const currentPersonaState = {
          ...personaForLoop,
          chats: personaForLoop.chats.map(c =>
            c.id === activeChatId
              ? { ...c, messages: [...messagesForThisTurn], updatedAt: Date.now() }
              : c
          ),
        };
  
        setPersona(currentPersonaState);
        personaForLoop = currentPersonaState;
        await savePersona(currentPersonaState);
      }
    }
  
    setIsLoading(false);
  };
  
  const handleConfirmDeleteChat = useCallback(async () => {
    if (!persona || !chatToDelete) return;

    const updatedPersona = {
        ...persona,
        chats: persona.chats.filter(c => c.id !== chatToDelete.id)
    };
    setPersona(updatedPersona);
    await savePersona(updatedPersona);

    if (activeChatId === chatToDelete.id) {
      router.replace(`/persona/${id}`);
    }
    
    setIsDeleteDialogOpen(false);
    setChatToDelete(null);
  }, [id, activeChatId, persona, chatToDelete, router]);

  const handleClearAllChats = useCallback(async () => {
    if (!persona) return;

    const updatedPersona = { ...persona, chats: [] };
    setPersona(updatedPersona);
    await savePersona(updatedPersona);

    setIsClearAllDialogOpen(false);
    toast({
      title: 'Chat History Cleared',
      description: `All chats for ${persona.name} have been deleted.`,
    });
  }, [persona, toast]);

  const handleDeletePersona = async () => {
    if (!id || typeof id !== 'string') return;
    await deletePersona(id);
    router.push('/personas');
  };

  const handlePersonaUpdate = useCallback(async (updatedPersonaData: Omit<Persona, 'chats' | 'memories'>) => {
    if (!persona) return;
    const updatedPersona = { 
        ...persona,
        ...updatedPersonaData,
     };
    setPersona(updatedPersona);
    await savePersona(updatedPersona);
    setIsEditSheetOpen(false);
    toast({
        title: 'Persona Updated!',
        description: `${updatedPersona.name} has been saved.`,
    });
  }, [persona, toast]);

  const handleDeleteMemory = useCallback(async (memoryToDelete: string) => {
    if (!persona) return;

    const updatedMemories = persona.memories.filter(mem => mem !== memoryToDelete);
    const updatedPersona = {
      ...persona,
      memories: updatedMemories,
    };

    setPersona(updatedPersona);
    await savePersona(updatedPersona);

    toast({
      title: 'Memory Deleted',
      description: 'The memory has been removed.',
    });
  }, [persona, toast]);
  
  const handleMemoryDialogChange = (open: boolean) => {
      if (open) {
          setIsMemoryButtonGlowing(false);
      }
      setIsMemoryDialogOpen(open);
  }

  if (persona === undefined) {
    return <PersonaChatSkeleton />;
  }

  if (persona === null) {
    return (
       <div className="container flex items-center justify-center h-full">
        <Card className="m-auto bg-card/80 backdrop-blur-sm border border-border/20">
          <CardHeader>
            <CardTitle>Persona Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This persona could not be found. It might have been deleted.</p>
            <Button asChild>
              <Link href="/personas">
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
      <div className="flex h-full">
          {/* Overlay for mobile drawer */}
          <div
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              "fixed inset-x-0 top-16 bottom-0 z-20 bg-black/60 backdrop-blur-sm md:hidden",
              isSidebarOpen ? "block" : "hidden"
            )}
          />
          {/* Left Sidebar */}
          <div className={cn(
              "transition-transform duration-300 ease-in-out flex flex-col bg-card/80 backdrop-blur-sm",
              "fixed bottom-0 left-0 top-16 z-30 w-80 border-r md:static md:bottom-auto md:top-auto md:h-auto md:w-auto md:transform-none md:transition-all",
              isSidebarOpen ? "translate-x-0" : "-translate-x-full",
              isSidebarOpen ? "md:w-80" : "md:w-0 md:p-0 md:opacity-0 md:border-r-0",
              !isSidebarOpen && "md:overflow-hidden"
          )}>
             <Dialog open={isManagementDialogOpen} onOpenChange={setIsManagementDialogOpen}>
                <DialogTrigger asChild>
                    <div className="p-4 flex-shrink-0 cursor-pointer hover:bg-secondary transition-colors rounded-lg">
                        <div className="flex items-center gap-4">
                            <Image
                                src={persona.profilePictureUrl}
                                alt={persona.name}
                                width={56}
                                height={56}
                                className="rounded-full object-cover aspect-square border-2 border-primary/50"
                                data-ai-hint="persona portrait"
                            />
                            <div className="flex-1 min-w-0">
                                <h2 className="font-headline text-xl font-semibold truncate" title={persona.name}>{persona.name}</h2>
                                <p className="text-sm text-muted-foreground truncate" title={persona.relation}>{persona.relation}</p>
                            </div>
                        </div>
                    </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Manage {persona.name}</DialogTitle>
                        <DialogDescription>
                            Edit details, view memories, or delete this persona.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 pt-4">
                        <Button variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => { setIsEditSheetOpen(true); setIsManagementDialogOpen(false); }}>
                            <Pencil className="mr-4 h-5 w-5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Edit Persona</p>
                                <p className="text-xs text-muted-foreground">Change name, traits, backstory, etc.</p>
                            </div>
                        </Button>

                        <Button variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => { handleMemoryDialogChange(true); setIsManagementDialogOpen(false); }}>
                            <Brain className="mr-4 h-5 w-5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">View Memories</p>
                                <p className="text-xs text-muted-foreground">See what this persona remembers about you.</p>
                            </div>
                        </Button>
                        
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="h-auto justify-start p-4 text-left">
                                    <Trash2 className="mr-4 h-5 w-5 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold">Delete Persona</p>
                                        <p className="text-xs text-destructive-foreground/80">Permanently remove this persona.</p>
                                    </div>
                                </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   This action will permanently delete {persona?.name} and all associated chats. This cannot be undone.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                                 <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { handleDeletePersona(); setIsManagementDialogOpen(false); }}>
                                   Delete
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </DialogContent>
            </Dialog>
            
            <div className="p-4 flex-1 flex flex-col min-h-0 border-t">
                <div className="flex gap-2 mb-2">
                    <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="flex-1">
                                <Trash2 className="mr-2 h-4 w-4" /> Clear All
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete all chat history for {persona.name}. This action cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={handleClearAllChats}
                            >
                                Delete All
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" className="flex-1" onClick={handleNewChat}>
                        <MessageSquarePlus className="mr-2 h-4 w-4" /> New Chat
                    </Button>
                </div>
                <ScrollArea className="flex-1 -mx-4">
                  <div className="px-4">
                    {sortedChats.length > 0 ? (
                      <div className="space-y-1">
                      {sortedChats.map(chat => (
                        <Link key={chat.id} href={`/persona/${persona.id}?chat=${chat.id}`} className="block group" scroll={false}>
                           <div className={cn(
                                "flex justify-between items-center px-3 py-2 rounded-md transition-colors",
                                activeChatId === chat.id
                                ? 'bg-secondary text-foreground'
                                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                            )}>
                            <div className="flex-1 text-sm truncate pr-2 min-w-0">
                                <AnimatedChatTitle title={chat.title} />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-transparent hover:text-inherit"
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
          <div className="flex-1 flex flex-col bg-background/80 backdrop-blur-sm min-w-0">
             <header className="flex items-center justify-between h-16 gap-2 md:gap-4 px-4 border-b flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                      <PanelLeft className="h-5 w-5" />
                  </Button>
                  <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
                      <Link href="/personas">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      All Personas
                      </Link>
                  </Button>
                </div>
                 <div className="flex items-center gap-2">
                     <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <PanelLeft className="h-5 w-5" />
                    </Button>
                </div>
            </header>
            
            <div className="flex-1 flex flex-col min-h-0">
                {activeChatId && activeChat ? (
                <>
                    <ScrollArea className="flex-1" ref={scrollAreaRef}>
                    <div className="px-4 py-4 max-w-3xl mx-auto w-full">
                        {messages.map((message, index) => {
                          const isFirstInSequence = !messages[index - 1] || messages[index - 1].role !== message.role;
                          const isLastInSequence = !messages[index + 1] || messages[index + 1].role !== message.role;
                          return (
                            <div 
                              key={index} 
                              className={cn(
                                "flex animate-fade-in-up", 
                                message.role === 'user' ? 'justify-end' : 'justify-start',
                                isFirstInSequence ? 'mt-3' : 'mt-1',
                                index === 0 && 'mt-0'
                              )}
                            >
                              <div className={cn(
                                "max-w-prose rounded-lg px-4 py-2.5", 
                                message.role === 'user' 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-secondary',
                                glowingMessageIndex === index && 'animate-shine-once',
                                // Grouping logic
                                message.role === 'assistant' && cn(
                                  'rounded-tl-none',
                                  isLastInSequence ? 'rounded-bl-lg' : 'rounded-bl-none'
                                ),
                                message.role === 'user' && cn(
                                  'rounded-tr-none',
                                  isLastInSequence ? 'rounded-br-lg' : 'rounded-br-none'
                                ),
                              )}>
                                <FormattedMessage content={message.content} />
                              </div>
                            </div>
                          );
                        })}

                        {isLoading && (
                        <div className={cn(
                          "flex animate-fade-in-up",
                          "justify-start",
                          lastMessageIsAssistant ? 'mt-1' : 'mt-3'
                        )}>
                            <div className={cn(
                                "flex h-11 items-center rounded-lg bg-secondary px-4 rounded-r-lg",
                                "rounded-tl-none rounded-bl-lg"
                            )}>
                                <div className="flex items-center justify-center space-x-1.5 h-full">
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-1"></div>
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-2"></div>
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-3"></div>
                                </div>
                            </div>
                        </div>
                        )}

                        {error && (
                        <Alert variant="destructive" className="max-w-md lg:max-w-2xl mx-auto mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        )}
                    </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-background/50">
                      <div className="max-w-3xl mx-auto">
                        <form
                          ref={formRef}
                          onSubmit={handleSubmit}
                          className="flex w-full items-end gap-2 rounded-lg border bg-secondary/50 p-2"
                        >
                          <Textarea
                            ref={textareaRef}
                            value={input}
                            onFocus={(e) => {
                                if (isMobile) {
                                    setTimeout(() => {
                                        e.target.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                    }, 300);
                                }
                            }}
                            onChange={(e) => {
                              setInput(e.target.value);
                              const target = e.currentTarget;
                              target.style.height = 'auto';
                              target.style.height = `${target.scrollHeight}px`;
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e as any);
                              }
                            }}
                            rows={1}
                            placeholder={`Message ${persona.name}...`}
                            className="flex-1 resize-none border-0 bg-transparent p-2 text-base shadow-none focus-visible:ring-0 max-h-40 overflow-y-auto"
                          />
                          <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !input.trim()}
                            className="h-10 w-10 rounded-md flex-shrink-0"
                          >
                            <Send className="h-5 w-5" />
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

      {persona && (
        <EditPersonaSheet
          persona={persona}
          open={isEditSheetOpen}
          onOpenChange={setIsEditSheetOpen}
          onPersonaUpdate={handlePersonaUpdate}
        />
      )}
      
      {persona && (
        <Dialog open={isMemoryDialogOpen} onOpenChange={handleMemoryDialogChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Memories for {persona.name}</DialogTitle>
                    <DialogDescription>
                       These are the memories this persona has about you. They are updated automatically during conversation.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <ScrollArea className="h-72 border rounded-md">
                        <div className="p-4 space-y-2">
                            {(persona.memories || []).length > 0 ? (
                                [...persona.memories].sort().map((memory, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm p-3 rounded-md group bg-secondary/50 hover:bg-secondary/80">
                                        <p className="flex-1 pr-2 break-words">{memory.replace(/^\d{4}-\d{2}-\d{2}: /, '')}</p>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteMemory(memory)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No memories yet.</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsMemoryDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

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
    </>
  );
}
