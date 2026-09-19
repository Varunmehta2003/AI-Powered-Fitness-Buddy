interface Props {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingIndicator({ message = 'Loading…', size = 'md' }: Props) {
  return (
    <div className={`loading-indicator loading-${size}`} role="status" aria-live="polite">
      <div className="loading-dots">
        <span />
        <span />
        <span />
      </div>
      {message && <span className="loading-text">{message}</span>}
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="chat-message assistant">
      <div className="chat-avatar">💪</div>
      <div className="chat-bubble-wrapper">
        <div className="chat-bubble assistant typing">
          <div className="typing-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
