import { useState, useEffect } from 'react';
import { fetchProgress } from '../services/api';
import { ProgressData } from '../types/index';
import StreakCard from '../components/StreakCard';
import ProgressCard from '../components/ProgressCard';
import LoadingIndicator from '../components/LoadingIndicator';

export default function Progress() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = () => {
    setLoading(true);
    setError(null);
    fetchProgress('demo')
      .then((r) => setProgress(r.progress))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load progress.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadProgress, []);

  if (loading) {
    return (
      <div className="page-center">
        <LoadingIndicator message="Loading your progress…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button onClick={loadProgress} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!progress) return null;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📈 Progress</h1>
        <p className="page-subtitle">Track your fitness journey over time.</p>
      </div>

      {/* Streak */}
      <div className="progress-hero">
        <StreakCard
          streak={progress.currentStreak}
          lastWorkoutDate={progress.lastWorkoutDate}
        />
      </div>

      {/* Stats */}
      <ProgressCard progress={progress} />

      {/* Feedback history */}
      {progress.feedbackHistory.length > 0 && (
        <div className="card mt-4">
          <h3 className="section-title">Workout Feedback History</h3>
          <div className="feedback-history">
            {progress.feedbackHistory.slice(0, 10).map((entry, i) => (
              <div key={i} className="feedback-history-item">
                <span className="feedback-date">
                  {new Date(entry.date).toLocaleDateString()}
                </span>
                <span className={`feedback-badge feedback-${entry.feedback}`}>
                  {entry.feedback.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn btn-ghost mt-4" onClick={loadProgress}>
        🔄 Refresh
      </button>
    </div>
  );
}
