import { ChatMessage } from '../types/index';

interface Props {
  message: ChatMessage;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SPECIALIST_LABELS: Record<string, string> = {
  workout: '🏋️ Workout Coach',
  nutrition: '🥗 Nutrition Coach',
  motivation: '✨ Motivation Coach',
  habit: '🔥 Habit Coach',
  checkin: '📋 Check-in',
  primary: '💪 Fitness Buddy',
};

export default function ChatMessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isError = message.source === 'error';

  const specialist =
    message.specialist && !isUser
      ? SPECIALIST_LABELS[message.specialist] ?? '💪 Fitness Buddy'
      : null;

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}${isError ? ' error' : ''}`}>
      {!isUser && (
        <div className="chat-avatar">
          {isError ? '⚠️' : '💪'}
        </div>
      )}
      <div className="chat-bubble-wrapper">
        {!isUser && specialist && (
          <div className="chat-specialist">{specialist}</div>
        )}
        <div className={`chat-bubble ${isUser ? 'user' : 'assistant'}${isError ? ' error' : ''}`}>
          <pre className="chat-text">{message.content}</pre>
        </div>
        <div className={`chat-time ${isUser ? 'user' : ''}`}>
          {formatTime(message.timestamp)}
          {!isUser && message.source && !isError && (
            <span className="chat-source">
              {' '}· via {message.source === 'orchestrate' ? 'Orchestrate' : 'Granite'}
            </span>
          )}
        </div>
      </div>
      {isUser && (
        <div className="chat-avatar user">👤</div>
      )}
    </div>
  );
}
