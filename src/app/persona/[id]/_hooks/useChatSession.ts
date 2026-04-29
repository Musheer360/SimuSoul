'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { summarizeChat } from '@/ai/flows/summarize-chat';
import type { Persona, UserDetails, ChatMessage, ChatSession, ChatSessionHeader } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getPersona, savePersona, getUserDetails, getPersonaChats, getChatSession, saveChatSession, deleteChatSession, deleteAllPersonaChats } from '@/lib/db';
import { MIN_MESSAGES_FOR_SUMMARY, SUMMARY_NEW_MESSAGES_THRESHOLD } from '@/lib/constants';

interface UseChatSessionParams {
  personaId: string | undefined;
  persona: Persona | null | undefined;
  setPersona: React.Dispatch<React.SetStateAction<Persona | null | undefined>>;
  isMobile: boolean;
  toast: ReturnType<typeof useToast>['toast'];
}

interface UseChatSessionReturn {
  chatHeaders: ChatSessionHeader[];
  setChatHeaders: React.Dispatch<React.SetStateAction<ChatSessionHeader[]>>;
  activeChat: ChatSession | null;
  setActiveChat: React.Dispatch<React.SetStateAction<ChatSession | null>>;
  activeChatId: string | null;
  activeChatRef: React.MutableRefObject<ChatSession | null>;
  activeChatIdRef: React.MutableRefObject<string | null>;
  isDeletingRef: React.MutableRefObject<boolean>;
  messagesSinceLastResponseRef: React.MutableRefObject<ChatMessage[]>;
  responseTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  sortedChats: ChatSessionHeader[];
  handleNewChat: () => Promise<void>;
  handleConfirmDeleteChat: () => Promise<void>;
  handleClearAllChats: () => Promise<void>;
  handleSummarizeChat: (chatId: string) => Promise<void>;
  chatToDelete: ChatSessionHeader | null;
  setChatToDelete: React.Dispatch<React.SetStateAction<ChatSessionHeader | null>>;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isClearAllDialogOpen: boolean;
  setIsClearAllDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDeleting: boolean;
  setIsDeleting: React.Dispatch<React.SetStateAction<boolean>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  userDetails: UserDetails;
  userDetailsRef: React.MutableRefObject<UserDetails>;
}

export function useChatSession({
  personaId,
  persona,
  setPersona,
  isMobile,
  toast,
}: UseChatSessionParams): UseChatSessionReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [chatHeaders, setChatHeaders] = useState<ChatSessionHeader[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails>({ name: '', about: '' });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ChatSessionHeader | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refs
  const activeChatRef = useRef(activeChat);
  const activeChatIdRef = useRef(activeChatId);
  const userDetailsRef = useRef(userDetails);
  const messagesSinceLastResponseRef = useRef<ChatMessage[]>([]);
  const responseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDeletingRef = useRef(false);
  const prevActiveChatIdRef = useRef<string | null>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const personaRef = useRef(persona);

  // Keep refs in sync
  useEffect(() => { personaRef.current = persona; }, [persona]);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { userDetailsRef.current = userDetails; }, [userDetails]);

  // Load page data
  useEffect(() => {
    async function loadPageData() {
      if (!personaId || typeof personaId !== 'string') {
        setPersona(null);
        return;
      }
      const [p, ud, headers] = await Promise.all([
        getPersona(personaId),
        getUserDetails(),
        getPersonaChats(personaId),
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
  }, [personaId, isMobile, setPersona]);

  const handleSummarizeChat = useCallback(async (chatId: string) => {
    const currentPersona = personaRef.current;
    const currentChat = activeChatRef.current;
    if (!currentPersona) return;

    let chatToSummarize = currentChat?.id === chatId ? currentChat : null;
    if (!chatToSummarize) {
      chatToSummarize = await getChatSession(chatId) || null;
    }

    if (!chatToSummarize) return;

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

        const updatedChat: ChatSession = {
          ...chatToSummarize,
          summary: result.summary,
          lastSummarizedAtMessageCount: currentMessageCount,
        };

        await saveChatSession(updatedChat);

        if (activeChatRef.current?.id === chatId) {
          setActiveChat(updatedChat);
        }

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

  const handleNewChat = useCallback(async () => {
    if (!persona) return;

    if (isMobile) {
      setIsSidebarOpen(false);
    }

    const existingNewChat = chatHeaders.find(c => c.title === 'New Chat');
    if (existingNewChat) {
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

    await saveChatSession(newChat);

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

  // activeChatId change effect — cleanup, summarization
  useEffect(() => {
    const handleCleanup = async (chatIdToClean: string | null | undefined) => {
      if (!chatIdToClean) return;

      const chatToCheck = activeChatRef.current?.id === chatIdToClean
        ? activeChatRef.current
        : await getChatSession(chatIdToClean);

      if (chatToCheck && chatToCheck.title === 'New Chat' && chatToCheck.messages.length === 0 && chatHeaders.length > 1) {
        await deleteChatSession(chatIdToClean);
        setChatHeaders(prev => prev.filter(h => h.id !== chatIdToClean));
      }
    };

    const previousChatId = prevActiveChatIdRef.current;
    if (previousChatId && previousChatId !== activeChatId) {
      handleSummarizeChat(previousChatId);
      messagesSinceLastResponseRef.current = [];
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      handleCleanup(previousChatId);
    }

    prevActiveChatIdRef.current = activeChatId;

    return () => {
      if (isDeletingRef.current) return;

      const lastActiveChat = prevActiveChatIdRef.current;
      if (lastActiveChat) {
        handleSummarizeChat(lastActiveChat);
      }
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    };
  }, [activeChatId, handleSummarizeChat, chatHeaders.length]);

  // Load active chat when activeChatId changes
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

  // URL-based chat selection
  useEffect(() => {
    if (!persona) return;

    const chatIdFromQuery = searchParams.get('chat');

    if (chatIdFromQuery) {
      const chatExists = chatHeaders.some(c => c.id === chatIdFromQuery);

      if (chatExists) {
        if (activeChatId !== chatIdFromQuery) {
          setActiveChatId(chatIdFromQuery);
        }
      } else {
        router.replace(`/persona/${persona.id}`, { scroll: false });
      }
    }
  }, [persona, chatHeaders, searchParams, router, activeChatId]);

  // New chat creation when no chat ID in URL
  useEffect(() => {
    if (!persona) return;

    const chatIdFromQuery = searchParams.get('chat');

    if (!chatIdFromQuery) {
      const existingNewChatHeader = chatHeaders.find(c => c.title === 'New Chat');

      if (existingNewChatHeader) {
        getChatSession(existingNewChatHeader.id).then(chat => {
          if (chat && chat.messages.length === 0) {
            if (activeChatId !== existingNewChatHeader.id) {
              setActiveChatId(existingNewChatHeader.id);
              router.replace(`/persona/${persona.id}?chat=${existingNewChatHeader.id}`, { scroll: false });
            }
          } else {
            createNewChat();
          }
        });
      } else {
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

  // Empty chat cleanup
  useEffect(() => {
    if (!persona || !activeChatId) return;

    const chatIdFromQuery = searchParams.get('chat');

    if (chatIdFromQuery && chatIdFromQuery === activeChatId) {
      const emptyNewChatHeaders = chatHeaders.filter(c =>
        c.title === 'New Chat' &&
        c.id !== activeChatId
      );

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

  // Auto-focus on new chats
  useEffect(() => {
    if (activeChat && activeChat.messages.length === 0 && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [activeChat?.id, activeChat?.messages.length]);

  const handleConfirmDeleteChat = useCallback(async () => {
    if (!persona || !chatToDelete) return;

    const shouldResetIgnoreState = persona.ignoredState?.isIgnored &&
                                   persona.ignoredState?.chatId === chatToDelete.id;

    await deleteChatSession(chatToDelete.id);

    setChatHeaders(prev => prev.filter(h => h.id !== chatToDelete.id));

    if (shouldResetIgnoreState) {
      const updatedPersona = {
        ...persona,
        ignoredState: null
      };
      setPersona(updatedPersona);
      await savePersona(updatedPersona);
    }

    if (activeChatId === chatToDelete.id) {
      setActiveChat(null);
      router.replace(`/persona/${personaId}`);
    }

    setIsDeleteDialogOpen(false);
    setChatToDelete(null);
  }, [personaId, activeChatId, persona, chatToDelete, router, setPersona]);

  const handleClearAllChats = useCallback(async () => {
    if (!persona) return;

    await deleteAllPersonaChats(persona.id);

    setChatHeaders([]);
    setActiveChat(null);

    const updatedPersona = {
      ...persona,
      ignoredState: null
    };
    setPersona(updatedPersona);
    await savePersona(updatedPersona);

    setIsClearAllDialogOpen(false);
    toast({
      title: 'Chat History Cleared',
      description: `All chats for ${persona.name} have been deleted.`,
    });
  }, [persona, toast, setPersona]);

  return {
    chatHeaders,
    setChatHeaders,
    activeChat,
    setActiveChat,
    activeChatId,
    activeChatRef,
    activeChatIdRef,
    isDeletingRef,
    messagesSinceLastResponseRef,
    responseTimerRef,
    sortedChats,
    handleNewChat,
    handleConfirmDeleteChat,
    handleClearAllChats,
    handleSummarizeChat,
    chatToDelete,
    setChatToDelete,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isClearAllDialogOpen,
    setIsClearAllDialogOpen,
    isSidebarOpen,
    setIsSidebarOpen,
    isDeleting,
    setIsDeleting,
    textareaRef,
    userDetails,
    userDetailsRef,
  };
}
