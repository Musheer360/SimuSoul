
'use client';

import { useEffect, useState, useRef, FormEvent, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { chatWithPersona } from '@/ai/flows/chat-with-persona';
import { generateChatTitle } from '@/ai/flows/generate-chat-title';
import { summarizeChat } from '@/ai/flows/summarize-chat';
import type { Persona, UserDetails, ChatMessage, ChatSession } from '@/lib/types';
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
import { MemoryItem } from '@/components/memory-item';

const TYPING_PLACEHOLDER = 'IS_TYPING_PLACEHOLDER_8f4a7b1c';

const ChatMessageItem = memo(function ChatMessageItem({
  message,
  isFirstInSequence,
  isLastInSequence,
  glowing,
}: {
  message: ChatMessage;
  isFirstInSequence: boolean;
  isLastInSequence: boolean;
  glowing: boolean;
}) {
  if (message.content === TYPING_PLACEHOLDER) {
    return (
      <div
        className={cn(
          "flex animate-fade-in-up",
          "justify-start",
          isFirstInSequence ? 'mt-4' : 'mt-1'
        )}
      >
        <div className={cn(
          "flex h-11 items-center rounded-lg bg-secondary px-4",
          "rounded-tl-none",
          "rounded-br-lg"
        )}>
          <div className="flex items-center justify-center space-x-1.5 h-full">
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-1"></div>
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-2"></div>
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex animate-fade-in-up",
        message.role === 'user' ? 'justify-end' : 'justify-start',
        isFirstInSequence ? 'mt-4' : 'mt-1'
      )}
    >
      <div className={cn(
        "max-w-[85%] rounded-lg px-4 py-2.5 min-w-0",
        message.role === 'user'
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary',
        glowing && 'animate-shine-once',
        message.role === 'assistant' && cn(
          isFirstInSequence && !isLastInSequence && "rounded-tl-none rounded-bl-none",
          isFirstInSequence && isLastInSequence && "rounded-tl-none",
          !isFirstInSequence && !isLastInSequence && "rounded-tl-none rounded-bl-none",
          !isFirstInSequence && isLastInSequence && "rounded-tl-none rounded-bl-lg",
        ),
        message.role === 'user' && cn(
          isFirstInSequence && !isLastInSequence && "rounded-tr-none rounded-br-none",
          isFirstInSequence && isLastInSequence && "rounded-tr-none",
          !isFirstInSequence && !isLastInSequence && "rounded-tr-none rounded-br-none",
          !isFirstInSequence && isLastInSequence && "rounded-tr-none rounded-br-lg",
        ),
      )}>
        <FormattedMessage content={message.content} />
      </div>
    </div>
  );
});

function PersonaChatSkeleton() {
  return (
    <div className="flex h-full">
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
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const personaRef = useRef(persona);
  const prevActiveChatIdRef = useRef<string | null>();

  useEffect(() => {
    personaRef.current = persona;
  }, [persona]);
  
  const handleSummarizeChat = useCallback(async (chatId: string) => {
    const currentPersona = personaRef.current;
    if (!currentPersona || !(userDetails.enableChatSummaries ?? true)) return;

    const chatToSummarize = currentPersona.chats.find(c => c.id === chatId);

    if (chatToSummarize && chatToSummarize.messages.length > 4) {
        try {
            console.log(`Summarizing chat: ${chatToSummarize.title}`);
            const result = await summarizeChat({ chatHistory: chatToSummarize.messages });
            const updatedPersona = {
                ...currentPersona,
                chats: currentPersona.chats.map(c =>
                    c.id === chatId ? { ...c, summary: result.summary } : c
                ),
            };
            setPersona(updatedPersona);
            await savePersona(updatedPersona);
            console.log(`Summary saved for chat: ${chatToSummarize.title}`);
        } catch (e) {
            console.error("Failed to summarize chat:", e);
        }
    }
  }, [userDetails.enableChatSummaries]);

  useEffect(() => {
    const handleCleanup = (chatIdToClean: string | null | undefined) => {
      if (!chatIdToClean) return;

      const personaNow = personaRef.current;
      if (personaNow?.chats) {
        // Clean up empty new chats
        const chat = personaNow.chats.find(c => c.id === chatIdToClean);
        if (chat && chat.title === 'New Chat' && chat.messages.length === 0) {
          const updatedPersona = {
            ...personaNow,
            chats: personaNow.chats.filter(c => c.id !== chatIdToClean),
          };
          setPersona(updatedPersona);
          savePersona(updatedPersona);
        }
      }
    };

    if (prevActiveChatIdRef.current && prevActiveChatIdRef.current !== activeChatId) {
        handleSummarizeChat(prevActiveChatIdRef.current);
    }
    
    handleCleanup(prevActiveChatIdRef.current);
    prevActiveChatIdRef.current = activeChatId;

    return () => {
      handleCleanup(prevActiveChatIdRef.current);
      if (prevActiveChatIdRef.current) {
        handleSummarizeChat(prevActiveChatIdRef.current);
      }
    }
  }, [activeChatId, handleSummarizeChat]);

  useEffect(() => {
    async function loadPageData() {
      if (!id || typeof id !== 'string') {
        setPersona(null);
        return;
      }
      const [p, ud] = await Promise.all([
        getPersona(id),
        getUserDetails(),
      ]);
      setPersona(p || null);
      setUserDetails(ud);
      
      if (!isMobile) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    }
    loadPageData();
  }, [id, isMobile]);

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
    } else if (sortedChats.length > 0) {
        const mostRecentChat = sortedChats[0];
        setActiveChatId(mostRecentChat.id);
        router.replace(`/persona/${persona.id}?chat=${mostRecentChat.id}`, { scroll: false });
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
            chats: [newChatSession],
        };
        setPersona(updatedPersona);
        savePersona(updatedPersona).then(() => {
            setActiveChatId(newChatSession.id);
            router.replace(`/persona/${persona.id}?chat=${newChatSession.id}`, { scroll: false });
        });
    }
}, [persona, searchParams, router, sortedChats]);

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
            behavior: 'auto',
        });
      }
    }
  }, [messages]);

  const handleInputInteraction = () => {
    if (!isMobile) return;
    setTimeout(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('div');
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'auto' });
            }
        }
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
    }, 100);
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !input.trim() || !persona || !activeChat || !activeChatId) return;

    setIsSubmitting(true);
  
    const userMessage: ChatMessage = { role: 'user', content: input };
    const userInput = input;
    const isNewChat = messages.length === 0;
  
    let currentMessages = [...messages, userMessage];
    let personaForUpdates = {
      ...persona,
      chats: persona.chats.map(c =>
        c.id === activeChatId
          ? { ...c, messages: currentMessages, updatedAt: Date.now() }
          : c
      ),
    };
    setPersona(personaForUpdates);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setError(null);
  
    const typingIndicatorMessage: ChatMessage = { role: 'assistant', content: TYPING_PLACEHOLDER };
    currentMessages.push(typingIndicatorMessage);
    personaForUpdates = {
      ...personaForUpdates,
      chats: personaForUpdates.chats.map(c =>
        c.id === activeChatId ? { ...c, messages: [...currentMessages] } : c
      ),
    };
    setPersona(personaForUpdates);
  
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    });
    const currentDateForMemory = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
    try {
      const allChatsForContext = persona.chats.filter(c => c.id !== activeChatId);

      const res = await chatWithPersona({
        persona, userDetails, chatHistory: messages, message: userInput, currentDateTime, currentDateForMemory, allChats: allChatsForContext
      });

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
    
      let personaForLoop = { ...persona, chats: personaForUpdates.chats, memories: finalMemories };
      let finalTitle = activeChat.title;
    
      if (isNewChat && res.response && res.response[0]) {
        generateChatTitle({ userMessage: userInput, assistantResponse: res.response[0] })
          .then(titleResult => {
            if (titleResult.title) {
              finalTitle = titleResult.title;
              setPersona(currentPersona => {
                if (!currentPersona) return null;
                return {
                  ...currentPersona,
                  chats: currentPersona.chats.map(c =>
                    c.id === activeChatId ? { ...c, title: titleResult.title! } : c
                  ),
                };
              });
            }
          });
      }
    
      if (res.response && res.response.length > 0) {
        let messagesForThisTurn = [...personaForLoop.chats.find(c => c.id === activeChatId)!.messages];
    
        for (let i = 0; i < res.response.length; i++) {
          const messageContent = res.response[i];
    
          const { minWpm, maxWpm } = persona;
          const wpm = Math.floor(Math.random() * (maxWpm - minWpm + 1)) + minWpm;
          const words = messageContent.split(/\s+/).filter(Boolean).length;
          const typingTimeMs = (words / wpm) * 60 * 1000;
          
          const minDelay = i === 0 ? 900 : 500;
          const maxDelay = 4000;
          const delay = Math.max(minDelay, Math.min(typingTimeMs, maxDelay));
          
          await new Promise(resolve => setTimeout(resolve, delay));
    
          const typingIndex = messagesForThisTurn.findIndex(m => m.content === TYPING_PLACEHOLDER);
          if (typingIndex !== -1) {
            messagesForThisTurn[typingIndex] = { role: 'assistant', content: messageContent };
          }
    
          if (i < res.response.length - 1) {
            messagesForThisTurn.push(typingIndicatorMessage);
          }
    
          const currentPersonaState = {
            ...personaForLoop,
            chats: personaForLoop.chats.map(c =>
              c.id === activeChatId
                ? { ...c, messages: [...messagesForThisTurn], updatedAt: Date.now(), title: finalTitle }
                : c
            ),
          };
          setPersona(currentPersonaState);
          personaForLoop = currentPersonaState;
          await savePersona(currentPersonaState);
        }
      } else {
        let messagesForThisTurn = [...personaForLoop.chats.find(c => c.id === activeChatId)!.messages];
        const finalMessages = messagesForThisTurn.filter(m => m.content !== TYPING_PLACEHOLDER);
        const finalPersonaState = { ...personaForLoop, chats: personaForLoop.chats.map(c => c.id === activeChatId ? { ...c, messages: finalMessages } : c) };
        setPersona(finalPersonaState);
        await savePersona(finalPersonaState);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unknown error occurred.');
      const finalMessages = currentMessages.filter(m => m.content !== TYPING_PLACEHOLDER);
      const finalPersonaState = {
        ...personaForUpdates,
        chats: personaForUpdates.chats.map(c =>
          c.id === activeChatId ? { ...c, messages: finalMessages } : c
        ),
      };
      setPersona(finalPersonaState);
    } finally {
      setIsSubmitting(false);
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
  
  const handleMemoryDialogChange = useCallback((open: boolean) => {
      if (open) {
          setIsMemoryButtonGlowing(false);
      }
      setIsMemoryDialogOpen(open);
  }, []);

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
          <div
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              "fixed inset-x-0 top-16 bottom-0 z-20 bg-black/60 backdrop-blur-sm md:hidden",
              isSidebarOpen ? "block" : "hidden"
            )}
          />
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
                                "flex justify-between items-center p-3 rounded-md transition-colors",
                                activeChatId === chat.id
                                ? 'bg-secondary text-foreground'
                                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                            )}>
                            <div className="flex-1 text-sm truncate pr-2 min-w-0">
                                <AnimatedChatTitle title={chat.title} />
                            </div>
                            <Button
                              variant="ghost"
                              className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:bg-transparent hover:text-destructive focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity md:opacity-0 group-hover:opacity-100"
                              onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation();
                                setChatToDelete(chat);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
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
          
          <div className="flex-1 flex flex-col bg-background/80 backdrop-blur-sm min-w-0">
             <header className="flex items-center justify-between h-16 gap-2 md:gap-4 px-4 border-b flex-shrink-0">
                <div className="flex items-center gap-2 md:w-auto w-full">
                    <div>
                        <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
                            <Link href="/personas">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            <span className='hidden md:inline'>All Personas</span>
                            </Link>
                        </Button>
                    </div>
                    <div className="flex-1 md:hidden">
                    </div>
                    <div className="md:hidden">
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <PanelLeft className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
                 <div className="hidden items-center gap-2 md:flex">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <PanelLeft className="h-5 w-5" />
                    </Button>
                </div>
            </header>
            
            <div className="flex-1 flex flex-col min-h-0">
                {activeChatId && activeChat ? (
                <>
                    <ScrollArea className="flex-1" ref={scrollAreaRef}>
                      <div className="max-w-3xl mx-auto p-4">
                        {messages.map((message, index) => {
                           const isFirstInSequence = !messages[index - 1] || messages[index - 1].role !== message.role;
                           const isLastInSequence = !messages[index + 1] || messages[index + 1].role !== message.role;
                           return (
                             <ChatMessageItem
                               key={index}
                               message={message}
                               isFirstInSequence={isFirstInSequence}
                               isLastInSequence={isLastInSequence}
                               glowing={glowingMessageIndex === index}
                             />
                           );
                        })}

                        {error && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                        )}
                      </div>
                    </ScrollArea>
                    <div className="border-t bg-background/50">
                        <div className="max-w-3xl mx-auto p-4">
                            <form
                            ref={formRef}
                            onSubmit={handleSubmit}
                            className="flex w-full items-end gap-2 rounded-lg border bg-secondary/50 p-2"
                            >
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onClick={handleInputInteraction}
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
                                disabled={isSubmitting}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isSubmitting}
                                className="h-10 w-10 rounded-md flex-shrink-0"
                            >
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
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
            <DialogContent className="flex h-full max-h-[85vh] w-full max-w-md flex-col" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>Memories for {persona.name}</DialogTitle>
                    <DialogDescription>
                       These are the memories this persona has about you. They are updated automatically during conversation.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 space-y-4 py-4 min-h-0">
                    <ScrollArea className="h-full rounded-md border">
                        <div className="space-y-2 p-4">
                            {(persona.memories || []).length > 0 ? (
                                [...persona.memories].sort().map((memory) => (
                                    <MemoryItem
                                        key={memory}
                                        memory={memory}
                                        onDelete={handleDeleteMemory}
                                    />
                                ))
                            ) : (
                                <p className="py-4 text-center text-sm text-muted-foreground">No memories yet.</p>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsMemoryDialogOpen(false)} className="w-full">Close</Button>
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
