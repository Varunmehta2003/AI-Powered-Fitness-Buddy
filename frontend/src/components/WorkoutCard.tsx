import { WorkoutPlan, WorkoutFeedback, LEVEL_LABELS } from '../types/index';

interface Props {
  workout: WorkoutPlan;
  rawMessage?: string;
  onComplete?: (feedback: WorkoutFeedback) => void;
  isLoading?: boolean;
}

const FEEDBACK_OPTIONS: Array<{ value: WorkoutFeedback; label: string; emoji: string; variant: string }> = [
  { value: 'perfect', label: 'Perfect', emoji: '👌', variant: 'success' },
  { value: 'too_easy', label: 'Too Easy', emoji: '⚡', variant: 'info' },
  { value: 'too_hard', label: 'Too Hard', emoji: '😅', variant: 'warning' },
  { value: 'not_completed', label: "Couldn't Complete", emoji: '🙏', variant: 'neutral' },
];

export default function WorkoutCard({ workout, rawMessage, onComplete, isLoading }: Props) {
  return (
    <div className="workout-card">
      <div className="workout-header">
        <div>
          <h2 className="workout-title">{workout.title}</h2>
          {workout.goal && <p className="workout-goal">Goal: {workout.goal}</p>}
        </div>
        <div className="workout-meta">
          <span className="badge badge-primary">{workout.durationMinutes} min</span>
          <span className="badge badge-secondary">{LEVEL_LABELS[workout.difficulty]}</span>
        </div>
      </div>

      {workout.warmUp.length > 0 && (
        <div className="workout-section">
          <h3 className="section-title">🔥 Warm-Up</h3>
          <ul className="workout-list">
            {workout.warmUp.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {workout.exercises.length > 0 && (
        <div className="workout-section">
          <h3 className="section-title">💪 Exercises</h3>
          <div className="exercise-grid">
            {workout.exercises.map((ex, i) => (
              <div key={i} className="exercise-card">
                <div className="exercise-name">{ex.name}</div>
                {(ex.setsReps || ex.duration) && (
                  <div className="exercise-sets">{ex.setsReps ?? ex.duration}</div>
                )}
                {ex.rest && <div className="exercise-rest">Rest: {ex.rest}</div>}
                {ex.instructions && (
                  <div className="exercise-instructions">{ex.instructions}</div>
                )}
                {ex.modification && (
                  <div className="exercise-modification">
                    <span className="mod-label">Modification:</span> {ex.modification}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {workout.coolDown.length > 0 && (
        <div className="workout-section">
          <h3 className="section-title">🧘 Cool-Down</h3>
          <ul className="workout-list">
            {workout.coolDown.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {workout.exercises.length === 0 && rawMessage && (
        <div className="workout-raw">
          <pre className="raw-text">{rawMessage}</pre>
        </div>
      )}

      {onComplete && (
        <div className="workout-feedback">
          <h3 className="section-title">How did it go?</h3>
          <div className="feedback-grid">
            {FEEDBACK_OPTIONS.map(({ value, label, emoji, variant }) => (
              <button
                key={value}
                className={`feedback-btn feedback-${variant}`}
                onClick={() => onComplete(value)}
                disabled={isLoading}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
