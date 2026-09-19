import { useEffect, useRef } from 'react';
import { useFitnessBuddy } from '../hooks/useFitnessBuddy';
import ChatMessageBubble from '../components/ChatMessage';
import ChatInputComponent from '../components/ChatInput';
import { TypingIndicator } from '../components/LoadingIndicator';

const WELCOME_MESSAGE = `Hi! I'm Fitness Buddy, your AI-powered fitness companion. 💪

I can help you with:
• Personalized workout plans
• Healthy meal suggestions
• Daily check-ins and recommendations
• Motivation and habit tips

What would you like to work on today?`;

export default function Chat() {
  const { messages, isLoading, sendMessage, clearConversation, suggestedPrompts } =
    useFitnessBuddy();

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="chat-header-info">
          <span className="chat-avatar-lg">💪</span>
          <div>
            <h1 className="chat-title">Fitness Buddy</h1>
            <p className="chat-subtitle">Powered by IBM Granite · watsonx Orchestrate</p>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={clearConversation}
          disabled={messages.length === 0}
          aria-label="Clear conversation"
        >
          Clear
        </button>
      </div>

      <div className="chat-messages" role="log" aria-label="Conversation">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-avatar">💪</div>
            <div className="chat-bubble-wrapper">
              <div className="chat-bubble assistant">
                <pre className="chat-text">{WELCOME_MESSAGE}</pre>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 0 && (
        <div className="suggested-prompts">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              className="prompt-chip"
              onClick={() => void sendMessage(prompt)}
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <ChatInputComponent
        onSend={(msg) => void sendMessage(msg)}
        isLoading={isLoading}
      />
    </div>
  );
}
