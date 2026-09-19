import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchProgress, fetchProfile } from '../services/api';
import { ProgressData, UserProfile } from '../types/index';
import StreakCard from '../components/StreakCard';
import LoadingIndicator from '../components/LoadingIndicator';

const quickActions = [
  { to: '/workout', label: "Today's Workout", icon: '🏋️', desc: 'Get your workout plan' },
  { to: '/nutrition', label: 'Healthy Meal', icon: '🥗', desc: 'Meal suggestions for today' },
  { to: '/workout#checkin', label: 'Daily Check-in', icon: '📋', desc: 'How are you feeling?' },
  { to: '/chat', label: 'Chat with AI', icon: '💬', desc: 'Ask Fitness Buddy anything' },
];

export default function Home() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchProgress('demo'), fetchProfile('demo')])
      .then(([p, pr]) => {
        if (cancelled) return;
        setProgress(p.progress);
        setProfile(pr.profile);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="page-center">
        <LoadingIndicator message="Loading your dashboard…" />
      </div>
    );
  }

  return (
    <div className="page home-page">
      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-greeting">
            {greeting()}, {profile?.name ?? 'there'} 👋
          </h1>
          <p className="home-tagline">Your AI fitness companion is ready.</p>
          {profile && (
            <p className="home-goal">
              Goal: <strong>{profile.goal.replace(/_/g, ' ')}</strong> ·{' '}
              {profile.fitnessLevel}
            </p>
          )}
        </div>
        <div className="home-hero-illustration">💪</div>
      </div>

      {/* Streak + Quick Stats */}
      {progress && (
        <div className="home-stats-row">
          <StreakCard
            streak={progress.currentStreak}
            lastWorkoutDate={progress.lastWorkoutDate}
          />
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <span className="stat-value">{progress.workoutsThisWeek}</span>
            <span className="stat-label">This week</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🏋️</span>
            <span className="stat-value">{progress.totalWorkouts}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <span className="stat-value">{progress.completionRate}%</span>
            <span className="stat-label">Completion</span>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <section className="home-section">
        <h2 className="section-heading">Quick Actions</h2>
        <div className="quick-actions-grid">
          {quickActions.map(({ to, label, icon, desc }) => (
            <Link key={to} to={to} className="quick-action-card">
              <span className="qa-icon">{icon}</span>
              <span className="qa-label">{label}</span>
              <span className="qa-desc">{desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Today's Focus */}
      <section className="home-section">
        <h2 className="section-heading">Today's Focus</h2>
        <div className="focus-card">
          <div className="focus-icon">🎯</div>
          <div className="focus-content">
            <h3>Stay consistent</h3>
            <p>
              Consistency beats perfection. Even a 10-minute workout is better than no
              workout. Start small, stay regular.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      {progress && progress.recentWorkouts.length > 0 && (
        <section className="home-section">
          <h2 className="section-heading">Recent Activity</h2>
          <div className="recent-list">
            {progress.recentWorkouts.slice(0, 3).map((w) => (
              <div key={w.id} className="recent-item">
                <span className="recent-icon">🏋️</span>
                <div className="recent-info">
                  <span className="recent-title">{w.title}</span>
                  <span className="recent-date">
                    {new Date(w.date).toLocaleDateString()}
                  </span>
                </div>
                <span className={`feedback-badge feedback-${w.feedback}`}>
                  {w.feedback.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
