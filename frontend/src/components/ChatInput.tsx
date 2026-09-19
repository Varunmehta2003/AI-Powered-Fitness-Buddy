import { useState, useRef, KeyboardEvent } from 'react';

interface Props {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, isLoading, placeholder }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="chat-input-container">
      <textarea
        ref={textareaRef}
        className="chat-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder ?? 'Ask Fitness Buddy anything… (Enter to send, Shift+Enter for newline)'}
        disabled={isLoading}
        rows={1}
        maxLength={2000}
        aria-label="Chat message input"
      />
      <button
        className="chat-send-btn"
        onClick={handleSend}
        disabled={isLoading || !value.trim()}
        aria-label="Send message"
      >
        {isLoading ? (
          <span className="spinner-sm" />
        ) : (
          <span>➤</span>
        )}
      </button>
    </div>
  );
}
