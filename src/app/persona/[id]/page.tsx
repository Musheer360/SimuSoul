

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
import { Send, Loader2, Bot, Trash2, MessageSquarePlus, ArrowLeft, PanelLeft, Pencil, Brain, MessageCircle } from 'lucide-react';
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
import { getPersona, savePersona, deletePersona, getUserDetails } from '@/lib/db';
import { isTestModeActive } from '@/lib/api-key-manager';
import { MemoryItem } from '@/components/memory-item';
import { DateSeparator } from '@/components/date-separator';
import { shouldShowDateSeparator, formatMessageTime, shouldCreateNewSession } from '@/lib/date-utils';

// Helper to find the last index of an element in an array.
const findLastIndex = <T,>(
  array: T[],
  predicate: (value: T, index: number, obj: T[]) => boolean
): number => {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) return l;
  }
  return -1;
};

const ChatMessageItem = memo(function ChatMessageItem({
  message,
  isFirstInSequence,
  isLastInSequence,
  glowing,
  isLatestUserMessage,
  messageIndex,
  onMessageClick,
  showIgnoredStatus,
}: {
  message: ChatMessage;
  isFirstInSequence: boolean;
  isLastInSequence: boolean;
  glowing: boolean;
  isLatestUserMessage: boolean;
  messageIndex: number;
  onMessageClick: (index: number) => void;
  showIgnoredStatus: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        message.role === 'user' ? 'items-end' : 'items-start',
        isFirstInSequence ? 'mt-4' : 'mt-1'
      )}
    >
      <div 
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5 min-w-0 flex items-center",
          message.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary',
          glowing && 'animate-shine-once',
          message.role === 'user' && !isLatestUserMessage && 'cursor-pointer',
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
        )}
        onClick={(e) => {
          if (message.role === 'user' && !isLatestUserMessage) {
            e.stopPropagation();
            onMessageClick(messageIndex);
          }
        }}
        style={{
          // Ensure all child elements are clickable for user messages that aren't latest
          ...(message.role === 'user' && !isLatestUserMessage && {
            pointerEvents: 'auto'
          })
        }}
      >
        <div 
          style={{
            // Make the content area clickable but prevent text selection interference
            ...(message.role === 'user' && !isLatestUserMessage && {
              pointerEvents: 'none'
            })
          }}
        >
          <FormattedMessage content={message.content} />
        </div>
      </div>
       {message.role === 'user' && message.isIgnored && showIgnoredStatus && (
          <div className="px-2 pt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
             Ignored
          </div>
        )}
    </div>
  );
});

function PersonaChatSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar Skeleton */}
      <div className="w-80 flex flex-col bg-card border-r hidden md:flex">
        {/* Profile Section */}
        <div className="pt-16 md:pt-0">
          <div className="p-2 mx-2">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="px-4 pb-2 pt-3">
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>
          
          {/* Chat List */}
          <div className="flex-1 px-4 pb-4">
            <div className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area Skeleton */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <header className="p-4 border-b flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </header>
        
        {/* Messages Area */}
        <div className="flex-1 p-4 space-y-4">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* User message */}
            <div className="flex justify-end">
              <Skeleton className="h-12 w-64 rounded-2xl" />
            </div>
            {/* AI message */}
            <div className="flex justify-start">
              <Skeleton className="h-16 w-80 rounded-2xl" />
            </div>
            {/* User message */}
            <div className="flex justify-end">
              <Skeleton className="h-8 w-48 rounded-2xl" />
            </div>
          </div>
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

const TypingIndicator = memo(function TypingIndicator({ 
  isFirstBubble, 
  isTransitioning 
}: { 
  isFirstBubble: boolean;
  isTransitioning?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-start transition-all duration-200 ease-out",
        isFirstBubble ? 'mt-4' : 'mt-1',
        isTransitioning && "opacity-0 scale-95"
      )}
    >
      <div className={cn(
        "flex h-11 items-center justify-center rounded-lg bg-secondary px-4 transition-all duration-200 ease-out",
        "rounded-tl-none rounded-br-lg",
        isTransitioning && "scale-98"
      )}>
        <div className={cn(
          "flex items-center justify-center space-x-1.5 transition-opacity duration-200",
          isTransitioning && "opacity-0"
        )}>
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-1"></div>
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-2"></div>
          <div className="w-2 h-2 rounded-full bg-muted-foreground animate-typing-dot-3"></div>
        </div>
      </div>
    </div>
  );
});

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
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isTypingTransitioning, setIsTypingTransitioning] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isManagementDialogOpen, setIsManagementDialogOpen] = useState(false);
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isChatModeDialogOpen, setIsChatModeDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ChatSession | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const [glowingMessageIndex, setGlowingMessageIndex] = useState<number | null>(null);
  const [isMemoryButtonGlowing, setIsMemoryButtonGlowing] = useState(false);
  const [clickedMessageIndex, setClickedMessageIndex] = useState<number | null>(null);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchMoveX, setTouchMoveX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [lastTouchY, setLastTouchY] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const personaRef = useRef(persona);
  const isAiRespondingRef = useRef(isAiResponding);
  const activeChatIdRef = useRef(activeChatId);
  const userDetailsRef = useRef(userDetails);
  const messagesSinceLastResponseRef = useRef<ChatMessage[]>([]);
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDeletingRef = useRef(false);

  useEffect(() => {
    personaRef.current = persona;
  }, [persona]);

  useEffect(() => {
    isAiRespondingRef.current = isAiResponding;
  }, [isAiResponding]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    userDetailsRef.current = userDetails;
  }, [userDetails]);
  
  const handleSummarizeChat = useCallback(async (chatId: string) => {
    const currentPersona = personaRef.current;
    if (!currentPersona) return;

    const chatToSummarize = currentPersona.chats.find(c => c.id === chatId);

    if (chatToSummarize && chatToSummarize.messages.length > 4 && !chatToSummarize.summary) {
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
  }, []);

  const triggerAIResponse = useCallback(async () => {
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    const personaNow = personaRef.current;
    const chatIdNow = activeChatIdRef.current;
    if (!personaNow || !chatIdNow) return;
  
    const messagesForTurn = [...messagesSinceLastResponseRef.current];
    if (messagesForTurn.length === 0) return;
  
    setIsAiResponding(true);
    setError(null);
    messagesSinceLastResponseRef.current = [];
  
    const currentChat = personaNow.chats.find(c => c.id === chatIdNow);
    if (!currentChat) {
      setIsAiResponding(false);
      return;
    }
  
    const historyEndIndex = currentChat.messages.length - messagesForTurn.length;
    const chatHistoryForAI = currentChat.messages.slice(0, historyEndIndex);
    const userMessageContents = messagesForTurn.map(m => m.content);
    const isNewChat = chatHistoryForAI.length === 0;
  
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    });
    const currentDateForMemory = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
    try {
      const allChatsForContext = personaNow.chats.filter(c => c.id !== chatIdNow);
      const testMode = await isTestModeActive();
  
      const res = await chatWithPersona({
        persona: personaNow, userDetails: userDetailsRef.current, chatHistory: chatHistoryForAI, userMessages: userMessageContents, currentDateTime, currentDateForMemory, allChats: allChatsForContext, activeChatId: chatIdNow, isTestMode: testMode,
      });
      
      // Handle ignore logic first
      if (res.shouldIgnore) {
        setPersona(current => {
            if (!current) return null;
            const lastUserMessageIndex = findLastIndex(current.chats.find(c => c.id === chatIdNow)?.messages || [], msg => msg.role === 'user');
            return {
                ...current,
                chats: current.chats.map(c =>
                  c.id === chatIdNow ? { ...c, messages: c.messages.map((m, idx) => idx === lastUserMessageIndex ? { ...m, isIgnored: true } : m) } : c
                ),
                ignoredState: {
                    isIgnored: true,
                    reason: res.ignoreReason || 'User was being disruptive.',
                    chatId: chatIdNow,
                }
            };
        });
        setClickedMessageIndex(null);
        setIsAiResponding(false);
        return; // Stop further processing
      }

      // Consolidate all persona updates into a single state update
      setPersona(current => {
        if (!current) return null;
        
        const lastUserMessageIndex = findLastIndex(current.chats.find(c => c.id === chatIdNow)?.messages || [], msg => msg.role === 'user');
        let finalMemories = current.memories || [];
        const memoryWasUpdated = (res.newMemories?.length || 0) > 0 || (res.removedMemories?.length || 0) > 0;
  
        if (memoryWasUpdated) {
          const memoriesToDelete = new Set(res.removedMemories || []);
          finalMemories = finalMemories.filter(mem => !memoriesToDelete.has(mem));
          const memoriesToAdd = res.newMemories || [];
          finalMemories = [...finalMemories, ...memoriesToAdd];
  
          setGlowingMessageIndex(current.chats.find(c => c.id === chatIdNow)!.messages.length - 1);
          setTimeout(() => setGlowingMessageIndex(null), 1500);
  
          if (!isMobile) {
            setIsMemoryButtonGlowing(true);
            setTimeout(() => setIsMemoryButtonGlowing(false), 1500);
          }
        }

        return {
          ...current,
          // Update memories
          memories: finalMemories,
          // Clear ignore state if it was previously set
          ignoredState: current.ignoredState?.isIgnored ? null : current.ignoredState
        };
      });

      // Hide ignored status for previous messages after marking current message as ignored
      setClickedMessageIndex(null);
  
      if (isNewChat && res.response && res.response[0]) {
        generateChatTitle({ userMessage: userMessageContents[0], assistantResponse: res.response[0] })
          .then(titleResult => {
            if (titleResult.title) {
              setPersona(current => {
                if (!current) return null;
                return {
                  ...current,
                  chats: current.chats.map(c =>
                    c.id === chatIdNow ? { ...c, title: titleResult.title } : c
                  ),
                };
              });
            }
          });
      }
      
      let newMessages: ChatMessage[] = [];
      if (res.response && res.response.length > 0) {
        newMessages = res.response.map(content => ({ role: 'assistant', content }));
      }

      setPersona(current => {
        if (!current) return null;
        const chat = current.chats.find(c => c.id === chatIdNow);
        if (!chat) return current;
        
        return {
          ...current,
          chats: current.chats.map(c =>
            c.id === chatIdNow
              ? { ...c, messages: chat.messages, updatedAt: Date.now() }
              : c
          ),
        };
      });

      if (res.response && res.response.length > 0) {
        for (let i = 0; i < res.response.length; i++) {
          const messageContent = res.response[i];
          
          // Start typing for this message
          setIsAiTyping(true);
          
          const { minWpm, maxWpm } = personaRef.current!;
          const wpm = Math.floor(Math.random() * (maxWpm - minWpm + 1)) + minWpm;
          const words = messageContent.split(/\s+/).filter(Boolean).length;
          const typingTimeMs = (words / wpm) * 60 * 1000;
          const delay = Math.max(900, Math.min(typingTimeMs, 4000));
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Smooth transition from typing to message
          setIsTypingTransitioning(true);
          await new Promise(resolve => setTimeout(resolve, 200));
          setIsAiTyping(false);
          await new Promise(resolve => setTimeout(resolve, 100));
          setIsTypingTransitioning(false);
          
          // Add the actual message to state
          setPersona(current => {
            if (!current) return null;
            const chat = current.chats.find(c => c.id === chatIdNow);
            if (!chat) return current;
            
            const newAssistantMessage: ChatMessage = { role: 'assistant', content: messageContent };
            const updatedPersona = {
              ...current,
              chats: current.chats.map(c =>
                c.id === chatIdNow
                  ? { ...c, messages: [...c.messages, newAssistantMessage], updatedAt: Date.now() }
                  : c
              ),
            };
            
            // Save to database immediately after state update
            savePersona(updatedPersona).catch(err => {
              console.error('Failed to save persona:', err);
            });
            
            return updatedPersona;
          });
          
          // Clear transforming message
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unknown error occurred.');
    } finally {
        // Don't set isAiTyping to false here since it's handled per message
        if (messagesSinceLastResponseRef.current.length > 0) {
            triggerAIResponse();
        } else {
            setIsAiResponding(false);
        }
    }
  }, [isMobile]);

  const startResponseTimer = useCallback(() => {
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    const delay = Math.random() * (5000 - 2500) + 2500; // Random between 2.5 and 5 seconds
    responseTimerRef.current = setTimeout(() => {
      if (!isAiRespondingRef.current) {
        triggerAIResponse();
      }
    }, delay);
  }, [triggerAIResponse]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!input.trim() || !persona || !activeChatId) return;
  
    const userMessage: ChatMessage = { role: 'user', content: input, isIgnored: false };
  
    const updatedPersona = {
      ...persona,
      lastChatTime: Date.now(), // Track when user last interacted
      chats: persona.chats.map(c =>
        c.id === activeChatId
          ? { ...c, messages: [...c.messages, userMessage], updatedAt: Date.now() }
          : c
      ),
    };
    
    setPersona(updatedPersona);
    
    // Clear input immediately to prevent any UI lag
    setInput('');
    
    // On mobile, maintain focus aggressively
    if (isMobile && textareaRef.current) {
      // Reset height immediately
      textareaRef.current.style.height = 'auto';
      
      // Use multiple strategies to maintain focus
      const textarea = textareaRef.current;
      
      // Strategy 1: Immediate focus
      textarea.focus();
      
      // Strategy 2: Focus after next tick
      setTimeout(() => textarea.focus(), 0);
      
      // Strategy 3: Focus after microtask
      Promise.resolve().then(() => textarea.focus());
      
      // Strategy 4: Focus after any potential blur
      const handleBlur = (event: FocusEvent) => {
        event.preventDefault();
        setTimeout(() => textarea.focus(), 0);
      };
      
      textarea.addEventListener('blur', handleBlur, { once: true });
      
      // Clean up the blur listener after a short time
      setTimeout(() => {
        textarea.removeEventListener('blur', handleBlur);
      }, 200);
    } else {
      // Desktop behavior
      textareaRef.current?.focus();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
    
    // Save to database after UI updates
    await savePersona(updatedPersona);
    
    setError(null);
  
    messagesSinceLastResponseRef.current.push(userMessage);

    if (isAiRespondingRef.current) {
      return;
    }
    startResponseTimer();
  };

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
    
    if (isMobile) {
      setIsSidebarOpen(false);
    }

    const existingNewChat = persona.chats.find(c => c.title === 'New Chat' && c.messages.length === 0);
    if (existingNewChat) {
      router.push(`/persona/${persona.id}?chat=${existingNewChat.id}`, { scroll: false });
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
    router.push(`/persona/${persona.id}?chat=${newChat.id}`, { scroll: false });
  }, [persona, router, isMobile]);
  
  const sortedChats = useMemo(() => {
    if (!persona?.chats) return [];
    return [...persona.chats].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [persona?.chats]);

  const prevActiveChatIdRef = useRef<string | null>();

  useEffect(() => {
    // Function to clean up empty "New Chat" sessions when navigating away
    const handleCleanup = (chatIdToClean: string | null | undefined, isComponentUnmounting: boolean = false) => {
        if (!chatIdToClean) return;

        const personaNow = personaRef.current;
        if (personaNow?.chats) {
            const chat = personaNow.chats.find(c => c.id === chatIdToClean);
            // Only clean up empty "New Chat" sessions when actually switching chats,
            // not when the component is unmounting (page reload)
            // Also, be more conservative - only cleanup if there are other chats available
            if (chat && 
                chat.title === 'New Chat' && 
                chat.messages.length === 0 && 
                !isComponentUnmounting &&
                personaNow.chats.length > 1) {
                const updatedPersona = {
                    ...personaNow,
                    chats: personaNow.chats.filter(c => c.id !== chatIdToClean),
                };
                setPersona(updatedPersona);
                savePersona(updatedPersona);
            }
        }
    };
    
    // When activeChatId changes, handle summarization and cleanup for the previous chat
    const previousChatId = prevActiveChatIdRef.current;
    if (previousChatId && previousChatId !== activeChatId) {
        handleSummarizeChat(previousChatId);
        messagesSinceLastResponseRef.current = [];
        if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
        handleCleanup(previousChatId, false); // Not unmounting, safe to cleanup
        // Reset clicked message state when switching chats
        setClickedMessageIndex(null);
    }
    
    prevActiveChatIdRef.current = activeChatId;

    return () => {
      // This cleanup runs when the component unmounts (page reload/navigation)
      if (isDeletingRef.current) return;
      
      const lastActiveChat = prevActiveChatIdRef.current;
      if (lastActiveChat) {
          // Don't cleanup on unmount to preserve chats on page reload
          handleSummarizeChat(lastActiveChat);
      }
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    }
  }, [activeChatId, handleSummarizeChat]);
  
  // Separate effect for handling URL-based chat selection
  useEffect(() => {
    if (!persona) return;
    
    const chatIdFromQuery = searchParams.get('chat');
    
    if (chatIdFromQuery) {
        // Check if the chat from the URL exists in our persona's chats
        const chatExists = persona.chats.some(c => c.id === chatIdFromQuery);
        
        if (chatExists) {
            // Valid chat ID in URL, use it
            if (activeChatId !== chatIdFromQuery) {
                setActiveChatId(chatIdFromQuery);
            }
        } else {
            // Invalid chat ID in URL, redirect to create new chat
            router.replace(`/persona/${persona.id}`, { scroll: false });
        }
    }
  }, [persona, searchParams, router, activeChatId]);

  // Separate effect for handling new chat creation when no chat ID in URL
  useEffect(() => {
    if (!persona) return;
    
    const chatIdFromQuery = searchParams.get('chat');
    const currentMode = persona.chatUiMode || 'traditional';
    
    // Only run this logic when there's no chat ID in URL
    if (!chatIdFromQuery) {
        if (currentMode === 'messaging') {
          // In messaging mode, find or create a single continuous chat
          let messagingChat = persona.chats.find(c => c.title === 'Messages');
          
          if (!messagingChat) {
            // Create the messaging chat
            const now = Date.now();
            const newChatSession: ChatSession = {
                id: crypto.randomUUID(),
                title: 'Messages',
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
          } else {
            // Use existing messaging chat
            if (activeChatId !== messagingChat.id) {
                setActiveChatId(messagingChat.id);
                router.replace(`/persona/${persona.id}?chat=${messagingChat.id}`, { scroll: false });
            }
          }
        } else {
          // Traditional mode - existing logic
          // Check if we already have an empty "New Chat"
          const existingEmptyNewChat = persona.chats.find(c => 
              c.title === 'New Chat' && c.messages.length === 0
          );
          
          if (existingEmptyNewChat) {
              // Use existing empty new chat
              if (activeChatId !== existingEmptyNewChat.id) {
                  setActiveChatId(existingEmptyNewChat.id);
                  router.replace(`/persona/${persona.id}?chat=${existingEmptyNewChat.id}`, { scroll: false });
              }
          } else {
              // Create a new chat
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
                  setActiveChatId(newChatSession.id);
                  router.replace(`/persona/${persona.id}?chat=${newChatSession.id}`, { scroll: false });
              });
          }
        }
    }
  }, [persona?.id, searchParams, router]); // Only depend on persona.id, not the full persona object

  // Separate effect for cleaning up empty chats when navigating to existing ones
  useEffect(() => {
    if (!persona || !activeChatId) return;
    
    const chatIdFromQuery = searchParams.get('chat');
    
    // Only cleanup when we have a valid chat ID in URL and it matches activeChatId
    if (chatIdFromQuery && chatIdFromQuery === activeChatId) {
        const emptyNewChats = persona.chats.filter(c => 
            c.title === 'New Chat' && 
            c.messages.length === 0 && 
            c.id !== activeChatId
        );
        
        if (emptyNewChats.length > 0) {
            const updatedPersona = {
                ...persona,
                chats: persona.chats.filter(c => 
                    !(c.title === 'New Chat' && c.messages.length === 0 && c.id !== activeChatId)
                ),
            };
            setPersona(updatedPersona);
            savePersona(updatedPersona);
        }
    }
  }, [activeChatId]); // Only run when activeChatId changes

  const activeChat = useMemo(() => {
    return persona?.chats.find(c => c.id === activeChatId);
  }, [persona, activeChatId]);

  // Determine chat mode (default to traditional if not set)
  const chatMode = persona?.chatUiMode || 'traditional';
  const isMessagingMode = chatMode === 'messaging';

  // Auto-focus input on new chats
  useEffect(() => {
    if (activeChat && activeChat.messages.length === 0 && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [activeChat?.id]);

  // For messaging mode, combine all messages from all chats with their timestamps
  const allMessagesWithTimestamps = useMemo(() => {
    if (!isMessagingMode || !persona) return [];
    
    const messagesWithMetadata: Array<{
      message: ChatMessage;
      timestamp: number;
      chatId: string;
    }> = [];
    
    // Collect all messages from all chats with their timestamps
    persona.chats.forEach(chat => {
      chat.messages.forEach((msg, idx) => {
        // Estimate timestamp based on chat createdAt/updatedAt and message position
        // For more accuracy, we'd need to store timestamps per message, but this is a reasonable approximation
        const chatDuration = chat.updatedAt - chat.createdAt;
        const messageTimestamp = chat.createdAt + (chatDuration * idx / Math.max(1, chat.messages.length - 1));
        
        messagesWithMetadata.push({
          message: msg,
          timestamp: messageTimestamp || chat.createdAt,
          chatId: chat.id,
        });
      });
    });
    
    // Sort by timestamp
    return messagesWithMetadata.sort((a, b) => a.timestamp - b.timestamp);
  }, [isMessagingMode, persona]);

  const messagesToDisplay = useMemo(() => {
      if (isMessagingMode) {
        return allMessagesWithTimestamps.map(m => m.message);
      }
      const messages = activeChat?.messages || [];
      console.log('Messages to display:', messages.length, 'for chat:', activeChatId);
      return messages;
  }, [isMessagingMode, allMessagesWithTimestamps, activeChat, activeChatId]);

  // Performance optimization: Memoize latest user message index calculation
  const latestUserMessageIndex = useMemo(() => {
    return findLastIndex(messagesToDisplay, msg => msg.role === 'user');
  }, [messagesToDisplay]);

  // Reset clicked message state when messages change
  useEffect(() => {
    setClickedMessageIndex(null);
  }, [messagesToDisplay.length]);

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
  }, [messagesToDisplay, isAiTyping]);
  
  const handleMobileInputFocus = useCallback(() => {
    // This function can be used for other focus-related logic if needed in the future.
    // The main keyboard persistence logic is now handled in handleSubmit.
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMobile) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        formRef.current?.requestSubmit();
      }
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
    
    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
      startResponseTimer();
    }
  };

  const handleConfirmDeleteChat = useCallback(async () => {
    if (!persona || !chatToDelete) return;

    // Check if the chat being deleted is the one that caused the ignoring
    const shouldResetIgnoreState = persona.ignoredState?.isIgnored && 
                                   persona.ignoredState?.chatId === chatToDelete.id;

    const updatedPersona = {
        ...persona,
        chats: persona.chats.filter(c => c.id !== chatToDelete.id),
        // Reset ignore state if this chat caused the ignoring
        ...(shouldResetIgnoreState && {
          ignoredState: {
            isIgnored: false,
            reason: undefined,
            chatId: undefined,
          }
        })
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

    const updatedPersona = { 
      ...persona, 
      chats: [],
      // Always reset ignore state when clearing all chats
      ignoredState: {
        isIgnored: false,
        reason: undefined,
        chatId: undefined,
      }
    };
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

    setIsDeleting(true);
    isDeletingRef.current = true;
    try {
        await deletePersona(id);
        toast({
            title: 'Persona Deleted',
            description: `${persona?.name} has been successfully removed.`,
        });
        router.push('/personas');
    } catch (error) {
        console.error('Failed to delete persona:', error);
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: 'There was a problem deleting the persona. Please try again.',
        });
        setIsDeleting(false);
        isDeletingRef.current = false;
    }
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

  const handleSwitchChatMode = useCallback(async () => {
    if (!persona) return;

    setIsSwitchingMode(true);
    
    try {
      const newMode = persona.chatUiMode === 'messaging' ? 'traditional' : 'messaging';
      
      // Clear all chats and memories when switching modes
      const updatedPersona = {
        ...persona,
        chatUiMode: newMode,
        chats: [],
        memories: [],
        ignoredState: {
          isIgnored: false,
          reason: undefined,
          chatId: undefined,
        }
      };
      
      setPersona(updatedPersona);
      await savePersona(updatedPersona);
      
      setIsChatModeDialogOpen(false);
      
      toast({
        title: 'Chat Mode Changed',
        description: `Switched to ${newMode === 'messaging' ? 'Messaging App' : 'Traditional'} style. All chats and memories have been cleared.`,
      });
      
      // Navigate to the persona page without a chat ID
      router.replace(`/persona/${persona.id}`);
      
    } catch (error) {
      console.error('Failed to switch chat mode:', error);
      toast({
        variant: 'destructive',
        title: 'Mode Switch Failed',
        description: 'Could not switch chat mode. Please try again.',
      });
    } finally {
      setIsSwitchingMode(false);
    }
  }, [persona, router, toast]);

  const handleMessageClick = useCallback((messageIndex: number) => {
    setClickedMessageIndex(prev => prev === messageIndex ? null : messageIndex);
  }, []);

  const handleOutsideClick = useCallback((e: MouseEvent) => {
    // Check if the click is outside of message bubbles
    const target = e.target as Element;
    const isMessageBubble = target.closest('[data-message-bubble]');
    if (!isMessageBubble) {
      setClickedMessageIndex(null);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobile || !isSidebarOpen) return;
    setTouchMoveX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  }, [isMobile, isSidebarOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    const currentX = e.targetTouches[0].clientX;
    const deltaX = currentX - touchStartX;
    if (deltaX < 0) { // Only track left swipes (closing)
      setTouchMoveX(currentX);
    } else {
      setTouchMoveX(touchStartX); // Prevent swiping right
    }
  }, [touchStartX]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX === null) return;
    
    let shouldClose = false;
    if (touchMoveX !== null) {
      const deltaX = touchMoveX - touchStartX;
      const sidebarWidth = sidebarRef.current?.offsetWidth || 320;
      
      if (deltaX < -(sidebarWidth / 3)) { // Swiped more than 1/3
        shouldClose = true;
      }
    }

    if (shouldClose) {
      setIsSidebarOpen(false);
    }

    // Reset touch state
    setTouchStartX(null);
    setTouchMoveX(null);
  }, [touchStartX, touchMoveX]);

  // Simple auto-scroll to bottom when mobile keyboard opens
  useEffect(() => {
    if (!isMobile || typeof window.visualViewport === 'undefined') return;

    const visualViewport = window.visualViewport;
    let previousHeight = visualViewport.height;
    
    const handleViewportChange = () => {
      const currentHeight = visualViewport.height;
      const heightDifference = previousHeight - currentHeight;
      
      // If keyboard opened (height decreased significantly)
      if (heightDifference > 150) {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            // Use smooth scrolling animation
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: 'smooth'
            });
          }
        }
      }
      
      previousHeight = currentHeight;
    };

    visualViewport.addEventListener('resize', handleViewportChange);

    return () => {
      visualViewport.removeEventListener('resize', handleViewportChange);
    };
  }, [isMobile]);

  // Mobile keyboard scroll prevention and scroll chaining prevention
  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      setTouchStartY(touch.clientY);
      setLastTouchY(touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const keyboardHeight = window.innerHeight - (window.visualViewport?.height || window.innerHeight);
      
      if (keyboardHeight > 150) { // Keyboard is open
        const target = e.target as Element;
        const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        
        // Only allow scrolling within the chat scroll area
        if (scrollArea && !scrollArea.contains(target)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        
        // If scrolling within chat area, prevent scroll chaining at boundaries
        if (scrollArea && scrollArea.contains(target)) {
          const touch = e.touches[0];
          const currentY = touch.clientY;
          const deltaY = lastTouchY ? currentY - lastTouchY : 0;
          setLastTouchY(currentY);
          
          const scrollTop = scrollArea.scrollTop;
          const scrollHeight = scrollArea.scrollHeight;
          const clientHeight = scrollArea.clientHeight;
          
          const isAtTop = scrollTop <= 1; // Small threshold for precision
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
          const isScrollingUp = deltaY > 0;
          const isScrollingDown = deltaY < 0;
          
          // Prevent scroll chaining at boundaries
          if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    const handleTouchEnd = () => {
      setTouchStartY(null);
      setLastTouchY(null);
    };

    const handleWheel = (e: WheelEvent) => {
      const keyboardHeight = window.innerHeight - (window.visualViewport?.height || window.innerHeight);
      
      if (keyboardHeight > 150) {
        const target = e.target as Element;
        const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        
        if (scrollArea && scrollArea.contains(target)) {
          const scrollTop = scrollArea.scrollTop;
          const scrollHeight = scrollArea.scrollHeight;
          const clientHeight = scrollArea.clientHeight;
          
          const isAtTop = scrollTop <= 1;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
          const isScrollingUp = e.deltaY < 0;
          const isScrollingDown = e.deltaY > 0;
          
          // Prevent scroll chaining at boundaries
          if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    const handleScroll = (e: Event) => {
      const keyboardHeight = window.innerHeight - (window.visualViewport?.height || window.innerHeight);
      
      // Prevent any document-level scrolling when keyboard is open
      if (keyboardHeight > 150 && (e.target === document || e.target === document.body || e.target === document.documentElement)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add event listeners with capture to intercept events early
    document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    document.addEventListener('scroll', handleScroll, { passive: false, capture: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, true);
      document.removeEventListener('touchmove', handleTouchMove, true);
      document.removeEventListener('touchend', handleTouchEnd, true);
      document.removeEventListener('wheel', handleWheel, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isMobile, lastTouchY]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (isMobile && scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('div');
        const observer = new MutationObserver(() => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                scrollContainer?.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            }, 100);
        });

        if (scrollContainer) {
            observer.observe(scrollContainer, { childList: true });
        }

        return () => {
            observer.disconnect();
            if (timeoutId) clearTimeout(timeoutId);
        };
    }
  }, [isMobile]);

  useEffect(() => {
    const handleFocus = () => {
      textareaRef.current?.focus();
    };
    const textarea = textareaRef.current;
    if (isMobile && textarea) {
      textarea.addEventListener('focus', handleFocus);
    }
    
    return () => {
      if (isMobile && textarea) {
        textarea.removeEventListener('focus', handleFocus);
      }
    };
  }, [isMobile]);

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [handleOutsideClick]);

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

  let swipeTransform: React.CSSProperties = {};
  let transitionClass = 'transition-transform duration-300 ease-in-out';
  
  if (isMobile && touchStartX !== null && touchMoveX !== null) {
    const deltaX = touchMoveX - touchStartX;
    const transformX = Math.min(0, deltaX);
    swipeTransform = { transform: `translateX(${transformX}px)`, transition: 'none' };
    transitionClass = '';
  }

  const lastMessage = messagesToDisplay[messagesToDisplay.length - 1];
  const isTypingIndicatorFirstBubble = !lastMessage || lastMessage.role !== 'assistant';

  return (
    <>
      <div className="flex h-full">
          <div
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              "fixed inset-x-0 top-0 bottom-0 z-20 backdrop-blur-sm md:hidden transition-all duration-300",
              isSidebarOpen ? "bg-black/60" : "bg-black/0 pointer-events-none"
            )}
            style={{
              opacity: isSidebarOpen ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out, background-color 0.3s ease-in-out'
            }}
          />
          <div 
            ref={sidebarRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            style={swipeTransform}
            className={cn(
              transitionClass,
              "flex flex-col bg-card/80 backdrop-blur-sm",
              "fixed bottom-0 left-0 top-0 z-30 w-80 border-r border-t-0 md:static md:bottom-auto md:top-auto md:h-auto md:w-auto md:transform-none md:transition-all",
              (touchStartX === null) && (isSidebarOpen ? "translate-x-0" : "-translate-x-full"),
              isSidebarOpen ? "md:w-80" : "md:w-0 md:p-0 md:opacity-0 md:border-r-0",
              !isSidebarOpen && "md:overflow-hidden"
          )}>
            <div className="pt-16 md:pt-0 flex flex-col h-full"> {/* Padding for main header on mobile only */}
             <Dialog open={isManagementDialogOpen} onOpenChange={setIsManagementDialogOpen}>
                <DialogTrigger asChild>
                    <div className="p-2 flex-shrink-0 cursor-pointer rounded-lg mx-2">
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

                        <Button variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => { setIsChatModeDialogOpen(true); setIsManagementDialogOpen(false); }}>
                            <MessageCircle className="mr-4 h-5 w-5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Switch Chat Mode</p>
                                <p className="text-xs text-muted-foreground">
                                  Currently: {persona.chatUiMode === 'messaging' ? 'Messaging App' : 'Traditional'} Style
                                </p>
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
                                 <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                 <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        await handleDeletePersona();
                                    }}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                                    ) : (
                                        'Delete'
                                    )}
                                 </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </DialogContent>
            </Dialog>
            
            {!isMessagingMode && (
              <>
                <div className="px-4 pb-2 pt-3 flex-shrink-0">
                    <div className="flex gap-2">
                        <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="flex-1 h-10">
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
                        <Button variant="outline" className="flex-1 h-10" onClick={handleNewChat}>
                            <MessageSquarePlus className="mr-2 h-4 w-4" /> New Chat
                        </Button>
                    </div>
                </div>
                
                <div className="flex-1 min-h-0 px-4 pb-4">
                <ScrollArea className="h-full" type="never">
                  <div className="space-y-1">
                    {sortedChats.length > 0 ? (
                      sortedChats.map(chat => (
                        <Link 
                            key={chat.id} 
                            href={`/persona/${persona.id}?chat=${chat.id}`} 
                            className="block group" 
                            scroll={false}
                            onClick={() => { if (isMobile) setIsSidebarOpen(false); }}
                        >
                           <div className={cn(
                                "flex justify-between items-center p-2 rounded-md transition-colors",
                                activeChatId === chat.id
                                ? 'bg-secondary text-foreground'
                                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                            )}>
                            <div className="flex-1 text-sm truncate pr-2 min-w-0 pl-3">
                                <AnimatedChatTitle title={chat.title.length > 30 ? `${chat.title.substring(0, 30)}...` : chat.title} />
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
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No chats yet.</p>
                    )}
                  </div>
                </ScrollArea>
            </div>
              </>
            )}
            </div> {/* Close padding wrapper */}
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
                    <ScrollArea 
                      className={cn(
                        "flex-1 scroll-contain",
                        isMobile ? "overscroll-none touch-pan-y" : "overscroll-y-contain"
                      )} 
                      ref={scrollAreaRef}
                    >
                      <div className="max-w-3xl mx-auto px-4 pb-4">
                        {messagesToDisplay.map((message, index) => {
                           const isFirstInSequence = !messagesToDisplay[index - 1] || messagesToDisplay[index - 1].role !== message.role;
                           const isLastInSequence = !messagesToDisplay[index + 1] || messagesToDisplay[index + 1].role !== message.role;
                           const isLastVisibleAssistantMessage = message.role === 'assistant' && index === messagesToDisplay.length - 1;

                           // Get timestamp for messaging mode
                           let messageTimestamp = 0;
                           if (isMessagingMode && allMessagesWithTimestamps[index]) {
                             messageTimestamp = allMessagesWithTimestamps[index].timestamp;
                           }

                           // Check if we should show date separator in messaging mode
                           let dateSeparatorInfo = { show: false, label: '' };
                           if (isMessagingMode) {
                             const prevTimestamp = index > 0 && allMessagesWithTimestamps[index - 1] 
                               ? allMessagesWithTimestamps[index - 1].timestamp 
                               : undefined;
                             dateSeparatorInfo = shouldShowDateSeparator(messageTimestamp, prevTimestamp);
                           }

                           // Performance optimization: Only calculate for user messages
                           let isLatestUserMessage = false;
                           let showIgnoredStatus = false;
                           
                           if (message.role === 'user') {
                             // Use memoized latest user message index
                             isLatestUserMessage = index === latestUserMessageIndex;
                             
                             // Determine if ignored status should be shown
                             if (message.isIgnored) {
                               if (isLatestUserMessage) {
                                 // Always show for latest user message
                                 showIgnoredStatus = true;
                               } else {
                                 // Show for previous messages only when clicked
                                 showIgnoredStatus = clickedMessageIndex === index;
                               }
                             }
                           }

                           return (
                             <div key={index} data-message-bubble>
                               {dateSeparatorInfo.show && <DateSeparator label={dateSeparatorInfo.label} />}
                               <ChatMessageItem
                                 message={message}
                                 isFirstInSequence={isFirstInSequence}
                                 isLastInSequence={isLastVisibleAssistantMessage ? !isAiTyping : isLastInSequence}
                                 glowing={glowingMessageIndex === index}
                                 isLatestUserMessage={isLatestUserMessage}
                                 messageIndex={index}
                                 onMessageClick={handleMessageClick}
                                 showIgnoredStatus={showIgnoredStatus}
                               />
                               {isMessagingMode && isLastInSequence && (
                                 <div className={cn(
                                   "text-xs text-muted-foreground px-2 pb-1",
                                   message.role === 'user' ? 'text-right' : 'text-left'
                                 )}>
                                   {formatMessageTime(messageTimestamp)}
                                 </div>
                               )}
                             </div>
                           );
                        })}

                        {(isAiTyping || isTypingTransitioning) && (
                          <TypingIndicator 
                            isFirstBubble={isTypingIndicatorFirstBubble} 
                            isTransitioning={isTypingTransitioning}
                          />
                        )}

                        {error && (
                        <Alert variant="destructive" className="mt-4">
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
                                onChange={handleInputChange}
                                onFocus={handleMobileInputFocus}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                placeholder={`Message ${persona.name}...`}
                                className="flex-1 resize-none border-0 bg-transparent p-2 text-base shadow-none focus-visible:ring-0 no-scrollbar"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim()}
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
            <DialogContent className="flex h-full max-h-[85vh] w-full max-w-md flex-col" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>Memories for {persona.name}</DialogTitle>
                    <DialogDescription>
                       These are the memories this persona has about you. They are updated automatically during conversation.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 space-y-4 py-4 min-h-0">
                    <ScrollArea className="h-full rounded-md border scroll-contain">
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

      {persona && (
        <AlertDialog open={isChatModeDialogOpen} onOpenChange={setIsChatModeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch Chat Mode?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to switch from <strong>{persona.chatUiMode === 'messaging' ? 'Messaging App' : 'Traditional'}</strong> style to <strong>{persona.chatUiMode === 'messaging' ? 'Traditional' : 'Messaging App'}</strong> style.
                <br /><br />
                <strong>This will permanently delete:</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>All chat history with {persona.name}</li>
                  <li>All memories stored about you</li>
                  <li>Ignored state (if any)</li>
                </ul>
                <br />
                The persona's profile (name, traits, backstory) will remain unchanged. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSwitchingMode}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSwitchChatMode}
                disabled={isSwitchingMode}
              >
                {isSwitchingMode ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Switching...</>
                ) : (
                  'Switch Mode'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
