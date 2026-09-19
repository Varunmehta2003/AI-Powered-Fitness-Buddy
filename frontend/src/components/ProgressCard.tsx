import { ProgressData } from '../types/index';

interface Props {
  progress: ProgressData;
}

export default function ProgressCard({ progress }: Props) {
  const stats = [
    { label: 'Total Workouts', value: progress.totalWorkouts, icon: '🏋️' },
    { label: 'This Week', value: progress.workoutsThisWeek, icon: '📅' },
    { label: 'Completion Rate', value: `${progress.completionRate}%`, icon: '✅' },
  ];

  return (
    <div className="progress-card">
      <div className="progress-stats-grid">
        {stats.map(({ label, value, icon }) => (
          <div key={label} className="progress-stat">
            <span className="progress-stat-icon">{icon}</span>
            <span className="progress-stat-value">{value}</span>
            <span className="progress-stat-label">{label}</span>
          </div>
        ))}
      </div>

      {progress.recentWorkouts.length > 0 ? (
        <div className="recent-workouts">
          <h3 className="section-title">Recent Workouts</h3>
          {progress.recentWorkouts.slice(0, 5).map((w) => (
            <div key={w.id} className="recent-workout-item">
              <div className="recent-workout-info">
                <span className="recent-workout-title">{w.title}</span>
                <span className="recent-workout-date">
                  {new Date(w.date).toLocaleDateString()}
                </span>
              </div>
              <span className={`feedback-badge feedback-${w.feedback}`}>
                {w.feedback.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No workouts completed yet.</p>
          <p className="empty-hint">
            Complete your first workout to start tracking your progress.
          </p>
        </div>
      )}
    </div>
  );
}
