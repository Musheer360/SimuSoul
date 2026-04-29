'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { chatWithPersona } from '@/ai/flows/chat-with-persona';
import { generateChatTitle } from '@/ai/flows/generate-chat-title';
import type { Persona, ChatMessage, ChatSession, UserDetails, ChatSessionHeader } from '@/lib/types';
import { savePersona, saveChatSession, getPersonaChatsWithMessages } from '@/lib/db';
import { isTestModeActive } from '@/lib/llm-router';
import { findLastIndex } from '@/lib/utils';
import { MIN_TYPING_DELAY_MS, MAX_TYPING_DELAY_MS, RESPONSE_TIMER_MIN_MS, RESPONSE_TIMER_MAX_MS } from '@/lib/constants';

interface UseAIResponseParams {
  persona: Persona | null | undefined;
  setPersona: React.Dispatch<React.SetStateAction<Persona | null | undefined>>;
  activeChat: ChatSession | null;
  setActiveChat: React.Dispatch<React.SetStateAction<ChatSession | null>>;
  activeChatIdRef: React.MutableRefObject<string | null>;
  activeChatRef: React.MutableRefObject<ChatSession | null>;
  userDetailsRef: React.MutableRefObject<UserDetails>;
  messagesSinceLastResponseRef: React.MutableRefObject<ChatMessage[]>;
  responseTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  setChatHeaders: React.Dispatch<React.SetStateAction<ChatSessionHeader[]>>;
  isMobile: boolean;
  messagesToDisplayLength: number;
}

interface UseAIResponseReturn {
  isAiResponding: boolean;
  isAiTyping: boolean;
  isTypingTransitioning: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  glowingMessageIndex: number | null;
  isMemoryButtonGlowing: boolean;
  setIsMemoryButtonGlowing: React.Dispatch<React.SetStateAction<boolean>>;
  clickedMessageIndex: number | null;
  setClickedMessageIndex: React.Dispatch<React.SetStateAction<number | null>>;
  triggerAIResponse: () => Promise<void>;
  startResponseTimer: () => void;
  handleMessageClick: (index: number) => void;
}

export function useAIResponse({
  persona,
  setPersona,
  activeChat,
  setActiveChat,
  activeChatIdRef,
  activeChatRef,
  userDetailsRef,
  messagesSinceLastResponseRef,
  responseTimerRef,
  setChatHeaders,
  isMobile,
  messagesToDisplayLength,
}: UseAIResponseParams): UseAIResponseReturn {
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isTypingTransitioning, setIsTypingTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glowingMessageIndex, setGlowingMessageIndex] = useState<number | null>(null);
  const [isMemoryButtonGlowing, setIsMemoryButtonGlowing] = useState(false);
  const [clickedMessageIndex, setClickedMessageIndex] = useState<number | null>(null);

  const personaRef = useRef(persona);
  const isAiRespondingRef = useRef(isAiResponding);

  useEffect(() => {
    personaRef.current = persona;
  }, [persona]);

  useEffect(() => {
    isAiRespondingRef.current = isAiResponding;
  }, [isAiResponding]);

  // Reset clickedMessageIndex when messages change
  useEffect(() => {
    setClickedMessageIndex(null);
  }, [messagesToDisplayLength]);

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
        const memoriesToAdd = (res.newMemories || []).filter(
          mem => !finalMemories.some(existing => existing.toLowerCase() === mem.toLowerCase())
        );
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
          })
          .catch(err => console.error('Failed to generate chat title:', err));
      }

      if (res.response && res.response.length > 0) {
        for (let i = 0; i < res.response.length; i++) {
          const messageContent = res.response[i];
          
          // Start typing for this message
          setIsAiTyping(true);
          
          const currentPersona = personaRef.current;
          if (!currentPersona) break;
          const { minWpm, maxWpm } = currentPersona;
          const wpm = Math.floor(Math.random() * (maxWpm - minWpm + 1)) + minWpm;
          const words = messageContent.split(/\s+/).filter(Boolean).length;
          const typingTimeMs = (words / wpm) * 60 * 1000;
          const delay = Math.max(MIN_TYPING_DELAY_MS, Math.min(typingTimeMs, MAX_TYPING_DELAY_MS));
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
    setIsAiTyping(true); // Show typing dots immediately
    const delay = Math.random() * (RESPONSE_TIMER_MAX_MS - RESPONSE_TIMER_MIN_MS) + RESPONSE_TIMER_MIN_MS;
    responseTimerRef.current = setTimeout(() => {
      if (!isAiRespondingRef.current) {
        triggerAIResponse();
      }
    }, delay);
  }, [triggerAIResponse]);

  const handleMessageClick = useCallback((messageIndex: number) => {
    setClickedMessageIndex(prev => prev === messageIndex ? null : messageIndex);
  }, []);

  return {
    isAiResponding,
    isAiTyping,
    isTypingTransitioning,
    error,
    setError,
    glowingMessageIndex,
    isMemoryButtonGlowing,
    setIsMemoryButtonGlowing,
    clickedMessageIndex,
    setClickedMessageIndex,
    triggerAIResponse,
    startResponseTimer,
    handleMessageClick,
  };
}
