interface Props {
  streak: number;
  lastWorkoutDate: string | null;
}

function getDaysSinceLastWorkout(lastDate: string | null): number | null {
  if (!lastDate) return null;
  const diff = Date.now() - new Date(lastDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function StreakCard({ streak, lastWorkoutDate }: Props) {
  const daysSince = getDaysSinceLastWorkout(lastWorkoutDate);
  const isActive = daysSince !== null && daysSince <= 1;

  let message = 'Start your first workout to begin your streak!';
  if (streak > 0) {
    if (daysSince === 0) message = 'You worked out today! Keep it up.';
    else if (daysSince === 1) message = 'Work out today to keep your streak alive!';
    else if (daysSince !== null && daysSince > 1)
      message = "You missed a few days — that's okay. Start fresh today!";
  }

  return (
    <div className={`streak-card${isActive ? ' active' : ''}`}>
      <div className="streak-flame">🔥</div>
      <div className="streak-number">{streak}</div>
      <div className="streak-label">Day Streak</div>
      <div className="streak-message">{message}</div>
    </div>
  );
}
