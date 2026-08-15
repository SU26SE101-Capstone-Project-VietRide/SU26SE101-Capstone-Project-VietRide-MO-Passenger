import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useLocations } from '@features/location/hooks/useLocations';
import {
  isAmbiguousIdempotentRequestError,
  toApiError,
} from '@shared/api/errors';
import { IdempotencyKeyTracker } from '@shared/api/idempotency';
import { useAppStore } from '@shared/store';
import { streamChat, submitChatFeedback } from '../api/chatbotApi';
import type {
  ChatBookingDraft,
  ChatFeedbackRating,
  ChatMessage,
  ChatMessageStatus,
} from '../types/chatbot';
import { useChatSessionStore } from '../store/useChatSessionStore';
import { extractBookingDraft } from '../utils/bookingIntent';
import { StreamTimeoutController } from '../utils/streamTimeoutController';

const MAX_MESSAGES_IN_MEMORY = 100;
const TOKEN_FLUSH_INTERVAL_MS = 50;

export type ChatAvailability = 'ready' | 'phoneRequired';

const createLocalId = (sequence: number): string => `${Date.now()}-${sequence}`;

export function useChatSession() {
  const { t } = useTranslation();
  const phone = useAuthStore((state) => state.user?.phone);
  const isOnline = useAppStore((state) => state.isOnline);
  const { data: locations = [] } = useLocations();

  const availability = useMemo<ChatAvailability>(() => {
    if (!phone) return 'phoneRequired';
    return 'ready';
  }, [phone]);

  const welcomeContent = useMemo(() => {
    if (availability === 'phoneRequired') return t('chatbot.welcomePhoneRequired');
    return t('chatbot.welcome');
  }, [availability, t]);

  const createWelcomeMessage = useCallback((): ChatMessage => ({
    id: 'welcome',
    role: 'assistant',
    content: welcomeContent,
    createdAt: Date.now(),
    status: 'complete',
  }), [welcomeContent]);

  const messages = useChatSessionStore((state) => state.messages);
  const conversationId = useChatSessionStore((state) => state.conversationId);
  const setMessages = useChatSessionStore((state) => state.setMessages);
  const setConversationId = useChatSessionStore((state) => state.setConversationId);
  const resetSession = useChatSessionStore((state) => state.reset);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingFeedbackId, setPendingFeedbackId] = useState<string>();
  const [feedbackError, setFeedbackError] = useState<string>();

  const localIdSequence = useRef(0);
  const requestSequence = useRef(0);
  const isStreamingRef = useRef(false);
  const mountedRef = useRef(true);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const activeAssistantIdRef = useRef<string | undefined>(undefined);
  const pendingTokenTextRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const streamTimeoutRef = useRef<StreamTimeoutController | undefined>(undefined);
  const cancelledByUserRef = useRef(false);
  const timedOutRef = useRef(false);
  const bookingDraftRef = useRef<ChatBookingDraft | undefined>(
    useChatSessionStore.getState().bookingDraft,
  );
  const feedbackSequenceRef = useRef(0);
  const pendingFeedbackIdRef = useRef<string | undefined>(undefined);
  const chatIdempotencyRef = useRef(new IdempotencyKeyTracker('rag-chat'));

  const updateMessage = useCallback(
    (id: string, update: (message: ChatMessage) => ChatMessage) => {
      setMessages((current) =>
        current.map((message) => (message.id === id ? update(message) : message)),
      );
    },
    [setMessages],
  );

  const clearStreamTimers = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = undefined;
    streamTimeoutRef.current?.stop();
    streamTimeoutRef.current = undefined;
  }, []);

  const flushPendingTokens = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = undefined;

    const assistantId = activeAssistantIdRef.current;
    const content = pendingTokenTextRef.current;
    pendingTokenTextRef.current = '';
    if (!assistantId || !content) return;

    updateMessage(assistantId, (message) => ({
      ...message,
      content: message.content + content,
    }));
  }, [updateMessage]);

  const scheduleTokenFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(flushPendingTokens, TOKEN_FLUSH_INTERVAL_MS);
  }, [flushPendingTokens]);

  const startStreamTimeouts = useCallback((sequence: number) => {
    streamTimeoutRef.current?.stop();
    const timeoutController = new StreamTimeoutController({
      onTimeout: () => {
        if (sequence !== requestSequence.current) return;
        timedOutRef.current = true;
        controllerRef.current?.abort();
      },
    });
    streamTimeoutRef.current = timeoutController;
    timeoutController.start();
  }, []);

  const resolveErrorMessage = useCallback((error: unknown): string => {
    const apiError = toApiError(error);

    switch (apiError.code) {
      case 'AUTH_PHONE_REQUIRED':
        return t('chatbot.errors.phoneRequired');
      case 'RAG_RATE_LIMIT_EXCEEDED':
        return t('chatbot.errors.rateLimit');
      case 'RAG_MESSAGE_TOO_LONG':
      case 'VALIDATION_FAILED':
        return t('chatbot.errors.messageTooLong');
      case 'RAG_PROVIDER_UNAVAILABLE':
        return t('chatbot.errors.providerUnavailable');
      case 'RAG_CONVERSATION_NOT_FOUND':
        return t('chatbot.errors.conversationNotFound');
      case 'NETWORK_ERROR':
      case 'RAG_STREAM_INTERRUPTED':
        return t('chatbot.errors.network');
      default:
        return t('chatbot.errors.generic');
    }
  }, [t]);

  const finishAssistantMessage = useCallback((
    assistantId: string,
    status: ChatMessageStatus,
    fallbackContent?: string,
  ) => {
    flushPendingTokens();
    updateMessage(assistantId, (message) => ({
      ...message,
      content: message.content || fallbackContent || '',
      status,
    }));
  }, [flushPendingTokens, updateMessage]);

  const sendMessage = useCallback(async (rawMessage: string): Promise<boolean> => {
    const message = rawMessage.trim();
    if (
      !message
      || message.length > 4_000
      || availability !== 'ready'
      || !isOnline
      || isStreamingRef.current
    ) {
      return false;
    }

    const sequence = ++requestSequence.current;
    const userId = createLocalId(++localIdSequence.current);
    const assistantId = createLocalId(++localIdSequence.current);
    const createdAt = Date.now();
    const bookingDraft = extractBookingDraft(
      message,
      locations,
      new Date(),
      bookingDraftRef.current,
    );
    if (bookingDraft) {
      bookingDraftRef.current = bookingDraft;
      useChatSessionStore.getState().setBookingDraft(bookingDraft);
    }

    cancelledByUserRef.current = false;
    timedOutRef.current = false;
    isStreamingRef.current = true;
    activeAssistantIdRef.current = assistantId;
    pendingTokenTextRef.current = '';
    setIsStreaming(true);
    setFeedbackError(undefined);
    const userMessage: ChatMessage = {
      id: userId,
      role: 'user',
      content: message,
      createdAt,
      status: 'complete',
    };
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt,
      status: 'streaming',
      bookingDraft,
    };
    setMessages((current) => [
      ...current,
      userMessage,
      assistantMessage,
    ].slice(-MAX_MESSAGES_IN_MEMORY));

    const controller = new AbortController();
    controllerRef.current = controller;
    startStreamTimeouts(sequence);
    const request = {
      message,
      ...(conversationId ? { conversationId } : {}),
    };
    const idempotencyKey = chatIdempotencyRef.current.getOrCreate(request);

    try {
      const done = await streamChat(
        request,
        {
          onActivity: () => {
            if (sequence !== requestSequence.current) return;
            streamTimeoutRef.current?.markActivity();
          },
          onToken: (content) => {
            if (sequence !== requestSequence.current) return;
            pendingTokenTextRef.current += content;
            scheduleTokenFlush();
          },
        },
        controller.signal,
        idempotencyKey,
      );

      if (sequence !== requestSequence.current) return false;
      chatIdempotencyRef.current.reset();
      flushPendingTokens();
      setConversationId(done.conversationId);
      updateMessage(assistantId, (current) => ({
        ...current,
        status: 'complete',
        assistantMessageId: done.assistantMessageId,
        citations: done.citations,
      }));
      return true;
    } catch (error) {
      if (sequence !== requestSequence.current) return false;

      const apiError = toApiError(error);
      if (!isAmbiguousIdempotentRequestError(apiError, {
        retainOnUnknownStatus: true,
      })) {
        chatIdempotencyRef.current.reset();
      }
      if (apiError.code === 'RAG_CONVERSATION_NOT_FOUND') {
        setConversationId(undefined);
      }

      if (cancelledByUserRef.current) {
        finishAssistantMessage(assistantId, 'cancelled', t('chatbot.cancelledResponse'));
      } else if (timedOutRef.current) {
        finishAssistantMessage(assistantId, 'error', t('chatbot.errors.timeout'));
      } else {
        finishAssistantMessage(assistantId, 'error', resolveErrorMessage(error));
      }
      return false;
    } finally {
      if (sequence === requestSequence.current) {
        clearStreamTimers();
        controllerRef.current = undefined;
        activeAssistantIdRef.current = undefined;
        isStreamingRef.current = false;
        if (mountedRef.current) setIsStreaming(false);
      }
    }
  }, [
    availability,
    clearStreamTimers,
    conversationId,
    finishAssistantMessage,
    flushPendingTokens,
    isOnline,
    locations,
    resolveErrorMessage,
    scheduleTokenFlush,
    startStreamTimeouts,
    t,
    updateMessage,
  ]);

  const stopResponse = useCallback(() => {
    if (!isStreamingRef.current) return;
    cancelledByUserRef.current = true;
    controllerRef.current?.abort();
  }, []);

  const resetConversation = useCallback(() => {
    requestSequence.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = undefined;
    clearStreamTimers();
    pendingTokenTextRef.current = '';
    chatIdempotencyRef.current.reset();
    bookingDraftRef.current = undefined;
    activeAssistantIdRef.current = undefined;
    isStreamingRef.current = false;
    setIsStreaming(false);
    setFeedbackError(undefined);
    feedbackSequenceRef.current += 1;
    pendingFeedbackIdRef.current = undefined;
    setPendingFeedbackId(undefined);
    resetSession();
    setMessages([createWelcomeMessage()]);
    useChatSessionStore.getState().setQuickActionsDismissed(false);
  }, [clearStreamTimers, createWelcomeMessage, resetSession, setMessages]);

  const rateMessage = useCallback(async (
    messageId: string,
    assistantMessageId: string,
    rating: ChatFeedbackRating,
  ): Promise<void> => {
    if (pendingFeedbackIdRef.current) return;

    const sequence = ++feedbackSequenceRef.current;
    pendingFeedbackIdRef.current = messageId;
    setFeedbackError(undefined);
    setPendingFeedbackId(messageId);

    try {
      await submitChatFeedback(assistantMessageId, rating);
      if (sequence !== feedbackSequenceRef.current || !mountedRef.current) return;
      updateMessage(messageId, (message) => ({ ...message, feedback: rating }));
    } catch {
      if (sequence !== feedbackSequenceRef.current || !mountedRef.current) return;
      setFeedbackError(t('chatbot.feedbackError'));
    } finally {
      if (sequence === feedbackSequenceRef.current) {
        pendingFeedbackIdRef.current = undefined;
        if (mountedRef.current) setPendingFeedbackId(undefined);
      }
    }
  }, [t, updateMessage]);

  useEffect(() => {
    setMessages((current) => {
      if (current.length === 0) return [createWelcomeMessage()];
      if (current.length !== 1 || current[0].id !== 'welcome') return current;
      return [createWelcomeMessage()];
    });
  }, [createWelcomeMessage, setMessages]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestSequence.current += 1;
      feedbackSequenceRef.current += 1;
      pendingFeedbackIdRef.current = undefined;

      const assistantId = activeAssistantIdRef.current;
      if (isStreamingRef.current && assistantId) {
        const pending = pendingTokenTextRef.current;
        pendingTokenTextRef.current = '';
        useChatSessionStore.getState().setMessages((current) =>
          current.map((message) => {
            if (message.id !== assistantId) return message;
            const content = `${message.content}${pending}`;
            return {
              ...message,
              content: content || t('chatbot.cancelledResponse'),
              status: 'cancelled',
            };
          }),
        );
      }

      controllerRef.current?.abort();
      controllerRef.current = undefined;
      clearStreamTimers();
      activeAssistantIdRef.current = undefined;
      isStreamingRef.current = false;
    };
  }, [clearStreamTimers, t]);

  return {
    availability,
    conversationId,
    feedbackError,
    isOnline,
    isStreaming,
    messages,
    pendingFeedbackId,
    rateMessage,
    resetConversation,
    sendMessage,
    stopResponse,
  };
}
