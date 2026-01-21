

'use client';

import { useEffect, useState, useRef, FormEvent, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { chatWithPersona } from '@/ai/flows/chat-with-persona';
import { generateChatTitle } from '@/ai/flows/generate-chat-title';
import { summarizeChat } from '@/ai/flows/summarize-chat';
import type { Persona, UserDetails, ChatMessage, ChatSession, ChatSessionHeader, FileAttachment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Bot, Trash2, MessageSquarePlus, ArrowLeft, PanelLeft, Pencil, Brain, Paperclip, X, FileText, Film, ImageIcon } from 'lucide-react';
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
import { getPersona, savePersona, deletePersona, getUserDetails, getPersonaChats, getChatSession, saveChatSession, deleteChatSession, deleteAllPersonaChats, getPersonaChatsWithMessages } from '@/lib/db';
import { isTestModeActive } from '@/lib/api-key-manager';
import { MemoryItem } from '@/components/memory-item';

// Supported file types for Gemini API
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const SUPPORTED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript', 'application/json', 'application/xml'];
const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES, ...SUPPORTED_DOCUMENT_TYPES, ...SUPPORTED_AUDIO_TYPES];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB max file size

// Constants for chat summarization
const MIN_MESSAGES_FOR_SUMMARY = 7; // Minimum messages before creating a summary
const SUMMARY_NEW_MESSAGES_THRESHOLD = 15; // Number of new messages since last summary to trigger re-summarization

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
  onImagePreview,
}: {
  message: ChatMessage;
  isFirstInSequence: boolean;
  isLastInSequence: boolean;
  glowing: boolean;
  isLatestUserMessage: boolean;
  messageIndex: number;
  onMessageClick: (index: number) => void;
  showIgnoredStatus: boolean;
  onImagePreview: (src: string, alt: string) => void;
}) {
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const hasTextContent = message.content.trim().length > 0;
  
  // Calculate corner rounding for attachments
  // If there's text content below, attachments need to connect (no rounded bottom)
  // If no text content, attachments follow the normal sequence logic
  const attachmentIsFirstInSequence = isFirstInSequence;
  const attachmentIsLastInSequence = hasTextContent ? false : isLastInSequence;
  
  // Corner rounding classes for attachments (same logic as text bubbles)
  const getAttachmentRoundingClasses = () => {
    if (message.role === 'assistant') {
      return cn(
        "rounded-lg",
        attachmentIsFirstInSequence && !attachmentIsLastInSequence && "rounded-tl-none rounded-bl-none",
        attachmentIsFirstInSequence && attachmentIsLastInSequence && "rounded-tl-none",
        !attachmentIsFirstInSequence && !attachmentIsLastInSequence && "rounded-tl-none rounded-bl-none",
        !attachmentIsFirstInSequence && attachmentIsLastInSequence && "rounded-tl-none rounded-bl-lg",
      );
    } else {
      return cn(
        "rounded-lg",
        attachmentIsFirstInSequence && !attachmentIsLastInSequence && "rounded-tr-none rounded-br-none",
        attachmentIsFirstInSequence && attachmentIsLastInSequence && "rounded-tr-none",
        !attachmentIsFirstInSequence && !attachmentIsLastInSequence && "rounded-tr-none rounded-br-none",
        !attachmentIsFirstInSequence && attachmentIsLastInSequence && "rounded-tr-none rounded-br-lg",
      );
    }
  };
  
  // When there's text content below, the text bubble adjusts its top corners
  // to connect with the attachment above
  const textIsFirstInSequence = hasAttachments ? false : isFirstInSequence;
  
  return (
    <div
      className={cn(
        "flex flex-col",
        message.role === 'user' ? 'items-end' : 'items-start',
        isFirstInSequence ? 'mt-4' : 'mt-1'
      )}
    >
      {/* Attachment previews */}
      {hasAttachments && (
        <div className={cn(
          "flex flex-wrap gap-2 max-w-[85%]",
          message.role === 'user' ? 'justify-end' : 'justify-start',
          hasTextContent && 'mb-1'
        )}>
          {message.attachments!.map((attachment, index) => {
            const isImage = SUPPORTED_IMAGE_TYPES.includes(attachment.mimeType);
            const isVideo = SUPPORTED_VIDEO_TYPES.includes(attachment.mimeType);
            
            if (isImage) {
              const imageSrc = `data:${attachment.mimeType};base64,${attachment.data}`;
              return (
                <div 
                  key={index} 
                  className={cn(
                    "relative overflow-hidden max-w-[200px] cursor-pointer",
                    getAttachmentRoundingClasses()
                  )}
                  onClick={() => onImagePreview(imageSrc, attachment.name)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <img
                    src={imageSrc}
                    alt={attachment.name}
                    className="max-h-[200px] w-auto object-contain select-none pointer-events-none"
                    draggable={false}
                  />
                </div>
              );
            }
            
            if (isVideo) {
              return (
                <div 
                  key={index} 
                  className={cn(
                    "relative overflow-hidden max-w-[250px]",
                    getAttachmentRoundingClasses()
                  )}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <video
                    src={`data:${attachment.mimeType};base64,${attachment.data}`}
                    controls
                    className="max-h-[200px] w-auto"
                  />
                </div>
              );
            }
            
            // For other files, show a file indicator
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-2 px-3 py-2",
                  message.role === 'user' 
                    ? 'bg-primary/80 text-primary-foreground' 
                    : 'bg-secondary/80',
                  getAttachmentRoundingClasses()
                )}
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm truncate max-w-[150px]">{attachment.name}</span>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Only show text bubble if there's actual text content */}
      {hasTextContent && (
        <div 
          className={cn(
            "max-w-[85%] rounded-lg px-4 py-2.5 min-w-0 flex items-center overflow-hidden",
            message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary',
            glowing && 'animate-shine-once',
            message.role === 'user' && !isLatestUserMessage && 'cursor-pointer',
            message.role === 'assistant' && cn(
              textIsFirstInSequence && !isLastInSequence && "rounded-tl-none rounded-bl-none",
              textIsFirstInSequence && isLastInSequence && "rounded-tl-none",
              !textIsFirstInSequence && !isLastInSequence && "rounded-tl-none rounded-bl-none",
              !textIsFirstInSequence && isLastInSequence && "rounded-tl-none rounded-bl-lg",
            ),
            message.role === 'user' && cn(
              textIsFirstInSequence && !isLastInSequence && "rounded-tr-none rounded-br-none",
              textIsFirstInSequence && isLastInSequence && "rounded-tr-none",
              !textIsFirstInSequence && !isLastInSequence && "rounded-tr-none rounded-br-none",
              !textIsFirstInSequence && isLastInSequence && "rounded-tr-none rounded-br-lg",
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
            className="min-w-0 w-full"
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
      )}
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
  
  // Separate state for chat headers (sidebar) and active chat (with messages)
  const [chatHeaders, setChatHeaders] = useState<ChatSessionHeader[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
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
  const [chatToDelete, setChatToDelete] = useState<ChatSessionHeader | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [glowingMessageIndex, setGlowingMessageIndex] = useState<number | null>(null);
  const [isMemoryButtonGlowing, setIsMemoryButtonGlowing] = useState(false);
  const [clickedMessageIndex, setClickedMessageIndex] = useState<number | null>(null);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchMoveX, setTouchMoveX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [lastTouchY, setLastTouchY] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // File attachment state
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image preview state
  const [imagePreview, setImagePreview] = useState<{ src: string; alt: string } | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const personaRef = useRef(persona);
  const activeChatRef = useRef(activeChat);
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
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    isAiRespondingRef.current = isAiResponding;
  }, [isAiResponding]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    userDetailsRef.current = userDetails;
  }, [userDetails]);

  // File handling functions
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: FileAttachment[] = [];

    for (const file of Array.from(files)) {
      // Validate file type
      if (!ALL_SUPPORTED_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Unsupported file type',
          description: `${file.name} is not a supported file type. Supported types: images, videos, PDFs, and text files.`,
        });
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `${file.name} is too large. Maximum size is 20MB.`,
        });
        continue;
      }

      // Read file as base64
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Validate data URL format and extract base64 data
            if (!result || !result.includes(',')) {
              reject(new Error('Invalid data URL format'));
              return;
            }
            const base64 = result.split(',')[1];
            if (!base64) {
              reject(new Error('No base64 data found'));
              return;
            }
            resolve(base64);
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          mimeType: file.type,
          data: base64Data,
          name: file.name,
        });
      } catch (error) {
        console.error('Failed to read file:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to read file',
          description: `Could not read ${file.name}. Please try again.`,
        });
      }
    }

    if (newAttachments.length > 0) {
      setPendingAttachments(prev => [...prev, ...newAttachments]);
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [toast]);

  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getFileIcon = useCallback((mimeType: string) => {
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) return ImageIcon;
    if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) return Film;
    return FileText;
  }, []);
  
  const handleSummarizeChat = useCallback(async (chatId: string) => {
    const currentPersona = personaRef.current;
    const currentChat = activeChatRef.current;
    if (!currentPersona) return;

    // Get the chat to summarize - either from activeChat if it matches, or fetch it
    let chatToSummarize = currentChat?.id === chatId ? currentChat : null;
    if (!chatToSummarize) {
      chatToSummarize = await getChatSession(chatId) || null;
    }

    if (!chatToSummarize) return;
    
    // Check if chat needs summarization:
    // 1. Has enough messages for meaningful summary
    // 2. Either has no summary OR has enough new messages since last summary
    const currentMessageCount = chatToSummarize.messages.length;
    const lastSummarizedAt = chatToSummarize.lastSummarizedAtMessageCount || 0;
    const newMessagesSinceSummary = currentMessageCount - lastSummarizedAt;
    
    const needsSummary = currentMessageCount >= MIN_MESSAGES_FOR_SUMMARY && (
      !chatToSummarize.summary || 
      newMessagesSinceSummary >= SUMMARY_NEW_MESSAGES_THRESHOLD
    );
    
    if (needsSummary) {
        try {
            console.log(`Summarizing chat: ${chatToSummarize.title} (${currentMessageCount} messages, ${newMessagesSinceSummary} new since last summary)`);
            const result = await summarizeChat({ 
              chatHistory: chatToSummarize.messages,
              existingSummary: chatToSummarize.summary,
              lastSummarizedAtMessageCount: lastSummarizedAt,
            });
            
            // Update the chat with new summary and message count
            const updatedChat: ChatSession = {
              ...chatToSummarize,
              summary: result.summary,
              lastSummarizedAtMessageCount: currentMessageCount,
            };
            
            // Save to database
            await saveChatSession(updatedChat);
            
            // Update local state if this is the active chat
            if (activeChatRef.current?.id === chatId) {
              setActiveChat(updatedChat);
            }
            
            // Update chat headers
            setChatHeaders(prev => prev.map(h => 
              h.id === chatId 
                ? { ...h, summary: result.summary, lastSummarizedAtMessageCount: currentMessageCount }
                : h
            ));
            
            console.log(`Summary ${chatToSummarize.summary ? 'updated' : 'saved'} for chat: ${chatToSummarize.title}`);
        } catch (e) {
            console.error("Failed to summarize chat:", e);
        }
    }
  }, []);

  const triggerAIResponse = useCallback(async () => {
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    const personaNow = personaRef.current;
    const chatIdNow = activeChatIdRef.current;
    const currentChatNow = activeChatRef.current;
    if (!personaNow || !chatIdNow || !currentChatNow) return;
  
    const messagesForTurn = [...messagesSinceLastResponseRef.current];
    if (messagesForTurn.length === 0) return;
  
    setIsAiResponding(true);
    setError(null);
    messagesSinceLastResponseRef.current = [];
  
    const historyEndIndex = currentChatNow.messages.length - messagesForTurn.length;
    const chatHistoryForAI = currentChatNow.messages.slice(0, historyEndIndex);
    const userMessageContents = messagesForTurn.map(m => m.content);
    // Collect attachments from the current turn's messages
    const attachmentsForTurn = messagesForTurn.flatMap(m => m.attachments || []);
    const isNewChat = chatHistoryForAI.length === 0;
  
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
    });
    const currentDateForMemory = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
    try {
      // Get all chats for context (excluding current chat)
      const allChatsForContext = await getPersonaChatsWithMessages(personaNow.id);
      const filteredChats = allChatsForContext.filter(c => c.id !== chatIdNow);
      const testMode = await isTestModeActive();
  
      const res = await chatWithPersona({
        persona: personaNow, userDetails: userDetailsRef.current, chatHistory: chatHistoryForAI, userMessages: userMessageContents, currentDateTime, currentDateForMemory, allChats: filteredChats, activeChatId: chatIdNow, isTestMode: testMode, attachments: attachmentsForTurn.length > 0 ? attachmentsForTurn : undefined,
      });
      
      // Handle ignore logic first
      if (res.shouldIgnore) {
        const currentChat = activeChatRef.current;
        if (currentChat) {
          const lastUserMessageIndex = findLastIndex(currentChat.messages || [], msg => msg.role === 'user');
          const updatedChat: ChatSession = {
            ...currentChat,
            messages: currentChat.messages.map((m, idx) => 
              idx === lastUserMessageIndex ? { ...m, isIgnored: true } : m
            ),
          };
          setActiveChat(updatedChat);
          await saveChatSession(updatedChat);
        }
        
        // Update persona ignore state
        const updatedPersona = {
          ...personaNow,
          ignoredState: {
            isIgnored: true,
            reason: res.ignoreReason || 'User was being disruptive.',
            chatId: chatIdNow,
          }
        };
        setPersona(updatedPersona);
        await savePersona(updatedPersona);
        
        setClickedMessageIndex(null);
        setIsAiResponding(false);
        return; // Stop further processing
      }

      // Handle memory updates
      let memoryWasUpdated = false;
      if ((res.newMemories?.length || 0) > 0 || (res.removedMemories?.length || 0) > 0) {
        memoryWasUpdated = true;
        let finalMemories = personaNow.memories || [];
        const memoriesToDelete = new Set(res.removedMemories || []);
        finalMemories = finalMemories.filter(mem => !memoriesToDelete.has(mem));
        const memoriesToAdd = res.newMemories || [];
        finalMemories = [...finalMemories, ...memoriesToAdd];

        const updatedPersona = {
          ...personaNow,
          memories: finalMemories,
          ignoredState: personaNow.ignoredState?.isIgnored ? null : personaNow.ignoredState
        };
        setPersona(updatedPersona);
        await savePersona(updatedPersona);

        const currentChat = activeChatRef.current;
        if (currentChat) {
          setGlowingMessageIndex(currentChat.messages.length - 1);
          setTimeout(() => setGlowingMessageIndex(null), 1500);
        }

        if (!isMobile) {
          setIsMemoryButtonGlowing(true);
          setTimeout(() => setIsMemoryButtonGlowing(false), 1500);
        }
      } else if (personaNow.ignoredState?.isIgnored) {
        // Clear ignore state if it was previously set
        const updatedPersona = {
          ...personaNow,
          ignoredState: null
        };
        setPersona(updatedPersona);
        await savePersona(updatedPersona);
      }

      // Hide ignored status for previous messages after marking current message as ignored
      setClickedMessageIndex(null);
  
      if (isNewChat && res.response && res.response[0]) {
        generateChatTitle({ userMessage: userMessageContents[0], assistantResponse: res.response[0] })
          .then(async titleResult => {
            if (titleResult.title) {
              const currentChat = activeChatRef.current;
              if (currentChat && currentChat.id === chatIdNow) {
                const updatedChat: ChatSession = { ...currentChat, title: titleResult.title };
                setActiveChat(updatedChat);
                await saveChatSession(updatedChat);
                
                // Update chat headers
                setChatHeaders(prev => prev.map(h =>
                  h.id === chatIdNow ? { ...h, title: titleResult.title } : h
                ));
              }
            }
          });
      }

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
          const currentChat = activeChatRef.current;
          if (currentChat && currentChat.id === chatIdNow) {
            const newAssistantMessage: ChatMessage = { role: 'assistant', content: messageContent };
            const updatedChat: ChatSession = {
              ...currentChat,
              messages: [...currentChat.messages, newAssistantMessage],
              updatedAt: Date.now(),
            };
            setActiveChat(updatedChat);
            
            // Update chat headers with new updatedAt
            setChatHeaders(prev => prev.map(h =>
              h.id === chatIdNow ? { ...h, updatedAt: updatedChat.updatedAt } : h
            ));
            
            // Save to database
            saveChatSession(updatedChat).catch(err => {
              console.error('Failed to save chat:', err);
            });
          }
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
    
    // Allow submission if there's text OR attachments (or both)
    if ((!input.trim() && pendingAttachments.length === 0) || !persona || !activeChatId || !activeChat) return;
  
    // Create user message with attachments
    // For attachment-only messages, use empty content string - the attachments speak for themselves
    const userMessage: ChatMessage = { 
      role: 'user', 
      content: input.trim(), 
      isIgnored: false,
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
    };
    const now = Date.now();
  
    // Update active chat with new message
    const updatedChat: ChatSession = {
      ...activeChat,
      messages: [...activeChat.messages, userMessage],
      updatedAt: now,
    };
    setActiveChat(updatedChat);
    
    // Update persona's lastChatTime
    const updatedPersona = {
      ...persona,
      lastChatTime: now,
    };
    setPersona(updatedPersona);
    
    // Update chat headers with new updatedAt
    setChatHeaders(prev => prev.map(h =>
      h.id === activeChatId ? { ...h, updatedAt: now } : h
    ));
    
    // Clear input and attachments immediately to prevent any UI lag
    setInput('');
    setPendingAttachments([]);
    
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
    await Promise.all([
      saveChatSession(updatedChat),
      savePersona(updatedPersona),
    ]);
    
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
      // Load persona metadata and chat headers separately
      const [p, ud, headers] = await Promise.all([
        getPersona(id),
        getUserDetails(),
        getPersonaChats(id),
      ]);
      setPersona(p || null);
      setUserDetails(ud);
      setChatHeaders(headers);
      
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

    // Check if there's already an empty "New Chat"
    const existingNewChat = chatHeaders.find(c => c.title === 'New Chat');
    if (existingNewChat) {
      // Load the chat to check if it's empty
      const fullChat = await getChatSession(existingNewChat.id);
      if (fullChat && fullChat.messages.length === 0) {
        router.push(`/persona/${persona.id}?chat=${existingNewChat.id}`, { scroll: false });
        return;
      }
    }

    const now = Date.now();
    const newChat: ChatSession = {
      id: crypto.randomUUID(),
      personaId: persona.id,
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    
    // Save new chat to database
    await saveChatSession(newChat);
    
    // Update chat headers
    const newHeader: ChatSessionHeader = {
      id: newChat.id,
      personaId: newChat.personaId,
      title: newChat.title,
      createdAt: newChat.createdAt,
      updatedAt: newChat.updatedAt,
    };
    setChatHeaders(prev => [newHeader, ...prev]);
    
    router.push(`/persona/${persona.id}?chat=${newChat.id}`, { scroll: false });
  }, [persona, chatHeaders, router, isMobile]);
  
  const sortedChats = useMemo(() => {
    return [...chatHeaders].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [chatHeaders]);

  const prevActiveChatIdRef = useRef<string | null>();

  useEffect(() => {
    // Function to clean up empty "New Chat" sessions when navigating away
    const handleCleanup = async (chatIdToClean: string | null | undefined) => {
        if (!chatIdToClean) return;

        // Check if it's an empty new chat by looking at the active chat or fetching it
        const chatToCheck = activeChatRef.current?.id === chatIdToClean 
          ? activeChatRef.current 
          : await getChatSession(chatIdToClean);
        
        if (chatToCheck && chatToCheck.title === 'New Chat' && chatToCheck.messages.length === 0 && chatHeaders.length > 1) {
          // Delete empty chat from database
          await deleteChatSession(chatIdToClean);
          // Update chat headers
          setChatHeaders(prev => prev.filter(h => h.id !== chatIdToClean));
        }
    };
    
    // When activeChatId changes, handle summarization and cleanup for the previous chat
    const previousChatId = prevActiveChatIdRef.current;
    if (previousChatId && previousChatId !== activeChatId) {
        handleSummarizeChat(previousChatId);
        messagesSinceLastResponseRef.current = [];
        if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
        handleCleanup(previousChatId);
        // Reset clicked message state when switching chats
        setClickedMessageIndex(null);
    }
    
    prevActiveChatIdRef.current = activeChatId;

    return () => {
      // This cleanup runs when the component unmounts (page reload/navigation)
      if (isDeletingRef.current) return;
      
      const lastActiveChat = prevActiveChatIdRef.current;
      if (lastActiveChat) {
          handleSummarizeChat(lastActiveChat);
      }
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    }
  }, [activeChatId, handleSummarizeChat, chatHeaders.length]);
  
  // Effect for loading active chat when activeChatId changes
  useEffect(() => {
    async function loadActiveChat() {
      if (!activeChatId) {
        setActiveChat(null);
        return;
      }
      
      const chat = await getChatSession(activeChatId);
      setActiveChat(chat || null);
    }
    loadActiveChat();
  }, [activeChatId]);
  
  // Separate effect for handling URL-based chat selection
  useEffect(() => {
    if (!persona) return;
    
    const chatIdFromQuery = searchParams.get('chat');
    
    if (chatIdFromQuery) {
        // Check if the chat from the URL exists in our chat headers
        const chatExists = chatHeaders.some(c => c.id === chatIdFromQuery);
        
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
  }, [persona, chatHeaders, searchParams, router, activeChatId]);

  // Separate effect for handling new chat creation when no chat ID in URL
  useEffect(() => {
    if (!persona) return;
    
    const chatIdFromQuery = searchParams.get('chat');
    
    // Only run this logic when there's no chat ID in URL
    if (!chatIdFromQuery) {
        // Check if we already have a "New Chat" header
        const existingNewChatHeader = chatHeaders.find(c => c.title === 'New Chat');
        
        if (existingNewChatHeader) {
            // Check if it's empty by loading it
            getChatSession(existingNewChatHeader.id).then(chat => {
              if (chat && chat.messages.length === 0) {
                // Use existing empty new chat
                if (activeChatId !== existingNewChatHeader.id) {
                    setActiveChatId(existingNewChatHeader.id);
                    router.replace(`/persona/${persona.id}?chat=${existingNewChatHeader.id}`, { scroll: false });
                }
              } else {
                // Create a new chat since the existing one has messages
                createNewChat();
              }
            });
        } else {
            // Create a new chat
            createNewChat();
        }
        
        async function createNewChat() {
          const now = Date.now();
          const newChatSession: ChatSession = {
              id: crypto.randomUUID(),
              personaId: persona!.id,
              title: 'New Chat',
              messages: [],
              createdAt: now,
              updatedAt: now,
          };
          
          await saveChatSession(newChatSession);
          
          const newHeader: ChatSessionHeader = {
            id: newChatSession.id,
            personaId: newChatSession.personaId,
            title: newChatSession.title,
            createdAt: newChatSession.createdAt,
            updatedAt: newChatSession.updatedAt,
          };
          setChatHeaders(prev => [newHeader, ...prev]);
          setActiveChatId(newChatSession.id);
          router.replace(`/persona/${persona!.id}?chat=${newChatSession.id}`, { scroll: false });
        }
    }
  }, [persona?.id, chatHeaders, searchParams, router, activeChatId]);

  // Separate effect for cleaning up empty chats when navigating to existing ones
  useEffect(() => {
    if (!persona || !activeChatId) return;
    
    const chatIdFromQuery = searchParams.get('chat');
    
    // Only cleanup when we have a valid chat ID in URL and it matches activeChatId
    if (chatIdFromQuery && chatIdFromQuery === activeChatId) {
        // Find empty "New Chat" headers that aren't the active chat
        const emptyNewChatHeaders = chatHeaders.filter(c => 
            c.title === 'New Chat' && 
            c.id !== activeChatId
        );
        
        // Check each one and delete if empty using Promise.all
        const cleanupEmptyChats = async () => {
          const chatIds = await Promise.all(
            emptyNewChatHeaders.map(async header => {
              const chat = await getChatSession(header.id);
              if (chat && chat.messages.length === 0) {
                await deleteChatSession(header.id);
                return header.id;
              }
              return null;
            })
          );
          
          const deletedIds = chatIds.filter((id): id is string => id !== null);
          if (deletedIds.length > 0) {
            setChatHeaders(prev => prev.filter(h => !deletedIds.includes(h.id)));
          }
        };
        
        cleanupEmptyChats();
    }
  }, [activeChatId, persona, chatHeaders, searchParams]);

  // Auto-focus input on new chats
  useEffect(() => {
    if (activeChat && activeChat.messages.length === 0 && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [activeChat?.id, activeChat?.messages.length]);

  const messagesToDisplay = useMemo(() => {
      const messages = activeChat?.messages || [];
      console.log('Messages to display:', messages.length, 'for chat:', activeChatId);
      return messages;
  }, [activeChat, activeChatId]);

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

    // Delete chat from database
    await deleteChatSession(chatToDelete.id);
    
    // Update chat headers
    setChatHeaders(prev => prev.filter(h => h.id !== chatToDelete.id));
    
    // Reset ignore state if this chat caused the ignoring
    if (shouldResetIgnoreState) {
      const updatedPersona = {
        ...persona,
        ignoredState: {
          isIgnored: false,
          reason: undefined,
          chatId: undefined,
        }
      };
      setPersona(updatedPersona);
      await savePersona(updatedPersona);
    }

    if (activeChatId === chatToDelete.id) {
      setActiveChat(null);
      router.replace(`/persona/${id}`);
    }
    
    setIsDeleteDialogOpen(false);
    setChatToDelete(null);
  }, [id, activeChatId, persona, chatToDelete, router]);

  const handleClearAllChats = useCallback(async () => {
    if (!persona) return;

    // Delete all chats from database
    await deleteAllPersonaChats(persona.id);
    
    // Clear chat headers
    setChatHeaders([]);
    setActiveChat(null);
    
    // Update persona ignore state
    const updatedPersona = { 
      ...persona, 
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

  const handlePersonaUpdate = useCallback(async (updatedPersonaData: Omit<Persona, 'memories'>) => {
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

  const handleMessageClick = useCallback((messageIndex: number) => {
    setClickedMessageIndex(prev => prev === messageIndex ? null : messageIndex);
  }, []);

  const handleImagePreview = useCallback((src: string, alt: string) => {
    setImagePreview({ src, alt });
  }, []);

  const closeImagePreview = useCallback(() => {
    setImagePreview(null);
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
                               <ChatMessageItem
                                 message={message}
                                 isFirstInSequence={isFirstInSequence}
                                 isLastInSequence={isLastVisibleAssistantMessage ? !isAiTyping : isLastInSequence}
                                 glowing={glowingMessageIndex === index}
                                 isLatestUserMessage={isLatestUserMessage}
                                 messageIndex={index}
                                 onMessageClick={handleMessageClick}
                                 showIgnoredStatus={showIgnoredStatus}
                                 onImagePreview={handleImagePreview}
                               />
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
                            {/* Attachment preview area */}
                            {pendingAttachments.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-2">
                                {pendingAttachments.map((attachment, index) => {
                                  const FileIcon = getFileIcon(attachment.mimeType);
                                  const isImage = SUPPORTED_IMAGE_TYPES.includes(attachment.mimeType);
                                  
                                  return (
                                    <div
                                      key={index}
                                      className="group relative flex items-center gap-2 rounded-lg border bg-secondary/50 p-2 pr-8"
                                    >
                                      {isImage ? (
                                        <div className="h-10 w-10 overflow-hidden rounded">
                                          <img
                                            src={`data:${attachment.mimeType};base64,${attachment.data}`}
                                            alt={attachment.name}
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <FileIcon className="h-6 w-6 text-muted-foreground" />
                                      )}
                                      <span className="max-w-[120px] truncate text-sm">
                                        {attachment.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => removeAttachment(index)}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            <form
                            ref={formRef}
                            onSubmit={handleSubmit}
                            className="flex w-full items-end gap-2 rounded-lg border bg-secondary/50 p-2"
                            >
                            {/* Hidden file input */}
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept={ALL_SUPPORTED_TYPES.join(',')}
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            
                            {/* Attachment button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-foreground"
                              title="Attach file"
                            >
                              <Paperclip className="h-5 w-5" />
                            </Button>
                            
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
                                disabled={!input.trim() && pendingAttachments.length === 0}
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
                       These are major life events this persona remembers about you. Only significant changes (new job, new pet, moving, etc.) are stored here. Conversation details are handled by chat summaries.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 space-y-4 py-4 min-h-0">
                    <ScrollArea className="h-full rounded-md border scroll-contain">
                        <div className="space-y-2 p-4">
                            {(persona.memories || []).length > 0 ? (
                                [...persona.memories].sort((a, b) => a.localeCompare(b)).map((memory) => (
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

      {/* Image Preview Dialog */}
      <Dialog open={imagePreview !== null} onOpenChange={(open) => !open && closeImagePreview()}>
        <DialogContent 
          className="flex items-center justify-center border-none bg-transparent p-0 shadow-none max-w-[95vw] max-h-[95vh] w-auto"
          showCloseButton={false}
          onContextMenu={(e) => e.preventDefault()}
        >
          {imagePreview && (
            <div 
              className="relative"
              onClick={closeImagePreview}
              onContextMenu={(e) => e.preventDefault()}
            >
              <img
                src={imagePreview.src}
                alt={imagePreview.alt}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg select-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
              <button
                className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  closeImagePreview();
                }}
                aria-label="Close image preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
