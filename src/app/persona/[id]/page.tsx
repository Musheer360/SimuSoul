'use client';

import { useEffect, useState, useRef, FormEvent, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { chatAction, generateChatTitleAction } from '@/app/actions';
import type { Persona, UserDetails, ChatMessage, ChatSession, ApiKeys } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Bot, User, AlertCircle, Trash2, MessageSquarePlus, ArrowLeft, PanelLeft, Pencil, Plus, Brain } from 'lucide-react';
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
      <div className="w-80 bg-card/50 backdrop-blur-sm border-r hidden md:flex flex-col">
          <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                  </div>
              </div>
              <div className="flex gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
              </div>
          </div>
          <div className="p-4 border-t"><Skeleton className="h-10 w-full" /></div>
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
  const [newMemoryInput, setNewMemoryInput] = useState('');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [glowingMessageIndex, setGlowingMessageIndex] = useState<number | null>(null);
  const [isMemoryButtonGlowing, setIsMemoryButtonGlowing] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    const newChat: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
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
    return [...persona.chats].sort((a, b) => b.createdAt - a.createdAt);
  }, [persona?.chats]);

  useEffect(() => {
    if (!persona) return;
    
    const chatIdFromQuery = searchParams.get('chat');
    const chatExists = persona.chats.some(c => c.id === chatIdFromQuery);

    if (chatIdFromQuery && chatExists) {
      setActiveChatId(chatIdFromQuery);
    } else if (sortedChats.length > 0) {
      const latestChatId = sortedChats[0].id;
      if (latestChatId !== chatIdFromQuery) {
        router.replace(`/persona/${persona.id}?chat=${latestChatId}`, { scroll: false });
      }
    } else {
      handleNewChat();
    }
  }, [persona, searchParams, router, handleNewChat, sortedChats]);

  const activeChat = useMemo(() => {
    return persona?.chats.find(c => c.id === activeChatId);
  }, [persona, activeChatId]);

  const messages = useMemo(() => activeChat?.messages || [], [activeChat]);

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
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${newHeight}px`;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !persona || !activeChatId) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const userInput = input;
    const isNewChat = messages.length === 0;

    const userMessageIndex = messages.length;
    const optimisticPersona = {
      ...persona,
      chats: persona.chats.map(c => 
        c.id === activeChatId ? { ...c, messages: [...c.messages, userMessage] } : c
      ),
    };
    setPersona(optimisticPersona);

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);
    setError(null);

    const res = await chatAction({
      persona,
      userDetails,
      chatHistory: messages,
      message: userInput,
      apiKey: apiKeys.gemini,
    });

    setIsLoading(false);

    if (res.error) {
      setError(res.error);
      setPersona(persona); // Revert optimistic update
      return;
    }

    let finalMemories = persona.memories || [];
    const memoryWasUpdated = (res.newMemories?.length || 0) > 0 || (res.removedMemories?.length || 0) > 0;
    
    if (memoryWasUpdated) {
      finalMemories = finalMemories.filter(mem => !res.removedMemories?.includes(mem));
      finalMemories = [...new Set([...finalMemories, ...(res.newMemories || [])])];
      
      setGlowingMessageIndex(userMessageIndex);
      setTimeout(() => setGlowingMessageIndex(null), 1500);

      if (!isMobile) {
        setIsMemoryButtonGlowing(true);
        setTimeout(() => setIsMemoryButtonGlowing(false), 1500);
      }
    }

    const assistantMessage: ChatMessage | null = res.response ? { role: 'assistant', content: res.response } : null;

    let personaToSave = {
      ...persona,
      chats: persona.chats.map(c => {
        if (c.id !== activeChatId) return c;
        const updatedMessages = assistantMessage ? [...c.messages, userMessage, assistantMessage] : [...c.messages, userMessage];
        return { ...c, messages: updatedMessages };
      }),
      memories: finalMemories,
    };
    setPersona(personaToSave);
    await savePersona(personaToSave);

    if (isNewChat && assistantMessage) {
      const titleResult = await generateChatTitleAction({
        userMessage: userInput,
        assistantResponse: assistantMessage.content,
        apiKey: apiKeys.gemini,
      });

      if (titleResult.title) {
        personaToSave = {
          ...personaToSave,
          chats: personaToSave.chats.map(c => c.id === activeChatId ? { ...c, title: titleResult.title! } : c),
        };
        setPersona(personaToSave);
        await savePersona(personaToSave);
      } else if (titleResult.error) {
        console.error('Title generation failed:', titleResult.error);
      }
    }
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
    router.push('/');
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

  const handleManualAddMemory = async (e: FormEvent) => {
      e.preventDefault();
      if (!persona || !newMemoryInput.trim()) return;

      const updatedPersona = {
          ...persona,
          memories: [...new Set([...(persona.memories || []), newMemoryInput.trim()])]
      };
      setPersona(updatedPersona);
      await savePersona(updatedPersona);
      setNewMemoryInput('');
  };

  const handleDeleteMemory = async (memoryToDelete: string) => {
    if (!persona) return;
    const updatedPersona = {
        ...persona,
        memories: (persona.memories || []).filter(m => m !== memoryToDelete)
    };
    setPersona(updatedPersona);
    await savePersona(updatedPersona);
  };
  
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
        <Card className="m-auto bg-card/80 backdrop-blur-sm">
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
              "transition-transform duration-300 ease-in-out flex flex-col bg-card/50 backdrop-blur-sm",
              "fixed bottom-0 left-0 top-16 z-30 w-80 border-r md:static md:bottom-auto md:top-auto md:h-auto md:w-auto md:transform-none md:transition-all",
              isSidebarOpen ? "translate-x-0" : "-translate-x-full",
              isSidebarOpen ? "md:w-80" : "md:w-0 md:p-0 md:opacity-0 md:border-r-0",
              !isSidebarOpen && "md:overflow-hidden"
          )}>
            <div className="p-4 space-y-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                     <Image
                      src={persona.profilePictureUrl}
                      alt={persona.name}
                      width={64}
                      height={64}
                      className={cn(
                        "rounded-full object-cover aspect-square border-2 border-primary/50 transition-all duration-500"
                      )}
                      data-ai-hint="persona portrait"
                    />
                    <div className="flex-1 min-w-0">
                      <h2 className="font-headline text-xl font-semibold truncate" title={persona.name}>{persona.name}</h2>
                      <p className="text-sm text-muted-foreground truncate" title={persona.relation}>{persona.relation}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setIsEditSheetOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <AlertDialog>
                     <AlertDialogTrigger asChild>
                       <Button variant="destructive" className="flex-1">
                         <Trash2 className="mr-2 h-4 w-4" /> Delete
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
                         <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeletePersona}>
                           Delete
                         </AlertDialogAction>
                       </AlertDialogFooter>
                     </AlertDialogContent>
                   </AlertDialog>
                </div>
            </div>
            
             <div className="p-4 border-t">
                <Dialog open={isMemoryDialogOpen} onOpenChange={handleMemoryDialogChange}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className={cn("w-full", isMemoryButtonGlowing && "animate-glow-once")}>
                            <Brain className="mr-2 h-4 w-4" /> View Memories
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Memories for {persona.name}</DialogTitle>
                            <DialogDescription>
                                View, add, or remove memories for this persona. This helps them remember things about you.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <form onSubmit={handleManualAddMemory} className="flex gap-2">
                                <Input 
                                    value={newMemoryInput}
                                    onChange={(e) => setNewMemoryInput(e.target.value)}
                                    placeholder="Add a new memory..."
                                />
                                <Button type="submit" size="icon" className="flex-shrink-0">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </form>
                            <ScrollArea className="h-64 border rounded-md">
                                <div className="p-4 space-y-2">
                                    {(persona.memories || []).length > 0 ? (
                                        [...persona.memories].sort().map((memory, index) => (
                                            <div key={index} className="group flex items-center justify-between text-sm bg-secondary p-2 rounded-md">
                                                <p className="flex-1 pr-2 break-words">{memory}</p>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteMemory(memory)}>
                                                    <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
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
            </div>
            
            <div className="p-4 flex-1 flex flex-col min-h-0 border-t">
                <div className="flex justify-between items-center mb-2">
                    <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
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
                            "flex justify-between items-center px-4 py-2 rounded-md transition-colors",
                            activeChatId === chat.id ? 'bg-primary/20 text-primary-foreground' : 'hover:bg-secondary'
                          )}>
                            <p className="text-sm truncate pr-2">
                                <AnimatedChatTitle title={chat.title} />
                            </p>
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
                      <Link href="/">
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
                    <div className="space-y-3 p-4 md:p-6 max-w-3xl mx-auto w-full">
                        {messages.map((message, index) => (
                        <div key={index} className={cn("flex items-start gap-3 md:gap-4 animate-fade-in-up", message.role === 'user' && 'justify-end')}>
                             {message.role === 'assistant' && (
                                <Avatar className="flex-shrink-0 h-10 w-10 border-2 border-primary/50">
                                    <AvatarImage src={persona.profilePictureUrl} alt={persona.name} className="object-cover" />
                                    <AvatarFallback><Bot /></AvatarFallback>
                                </Avatar>
                            )}
                            <div className={cn(
                                "max-w-md lg:max-w-2xl rounded-lg px-4 py-3", 
                                message.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-secondary rounded-tl-none',
                                glowingMessageIndex === index && 'animate-glow-once'
                            )}>
                                <FormattedMessage content={message.content} />
                            </div>
                            {message.role === 'user' && (
                                <Avatar className="flex-shrink-0 h-10 w-10 hidden sm:flex">
                                    <AvatarFallback><User /></AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                        ))}
                        {isLoading && (
                        <div className="flex items-start gap-3 md:gap-4 justify-start animate-fade-in-up">
                            <Avatar className="flex-shrink-0 h-10 w-10 border-2 border-primary/50">
                                <AvatarImage src={persona.profilePictureUrl} alt={persona.name} className="object-cover" />
                                <AvatarFallback><Bot /></AvatarFallback>
                            </Avatar>
                             <div className="flex h-10 items-center rounded-lg bg-secondary rounded-tl-none px-4">
                                <div className="flex items-center justify-center space-x-1.5 h-full">
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-1"></div>
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-2"></div>
                                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-3"></div>
                                </div>
                            </div>
                        </div>
                        )}
                        {error && (
                        <Alert variant="destructive" className="max-w-md lg:max-w-2xl mx-auto">
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
                          onSubmit={handleSubmit}
                          className="flex w-full items-end gap-2 rounded-lg border bg-secondary/50 p-2"
                        >
                          <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onInput={handleInput}
                            placeholder={`Message ${persona.name}...`}
                            className="flex-1 resize-none border-0 bg-transparent p-2 text-base shadow-none focus-visible:ring-0"
                            rows={1}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e as any);
                              }
                            }}
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
