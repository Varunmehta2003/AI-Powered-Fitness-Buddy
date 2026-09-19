import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendChatMessage } from '../services/api';
import { ChatMessage, UserContext } from '../types/index';

const SUGGESTED_PROMPTS = [
  "Create today's workout",
  'Suggest a healthy dinner',
  "I'm feeling demotivated",
  "Yesterday's workout was too hard",
  'What should I do today?',
  'Plan my meals for today',
];

export function useFitnessBuddy(userContext?: UserContext) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      // Build conversation history from existing messages (last 6)
      const history = messages
        .slice(-6)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      try {
        abortRef.current = new AbortController();

        const response = await sendChatMessage({
          message: content.trim(),
          userContext,
          conversationHistory: history,
        });

        const assistantMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          specialist: response.specialist,
          source: response.source,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errMessage =
          err instanceof Error
            ? err.message
            : 'Fitness Buddy is temporarily unavailable. Please try again.';
        setError(errMessage);

        const errorMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: errMessage,
          timestamp: new Date(),
          source: 'error',
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading, userContext]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const retryLast = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      // Remove the last assistant message (which was an error) then retry
      setMessages((prev) => prev.filter((m) => m.role !== 'assistant' || m.source !== 'error'));
      void sendMessage(lastUserMsg.content);
    }
  }, [messages, sendMessage]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearConversation,
    retryLast,
    suggestedPrompts: SUGGESTED_PROMPTS,
  };
}
