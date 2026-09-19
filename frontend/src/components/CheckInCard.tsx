import { CheckInResponse, CheckInRecommendation } from '../types/index';

interface Props {
  result: CheckInResponse;
}

const RECOMMENDATION_INFO: Record<
  CheckInRecommendation,
  { label: string; icon: string; color: string; description: string }
> = {
  normal_workout: {
    label: 'Full Workout',
    icon: '🏋️',
    color: 'green',
    description: 'You have great energy today! Go for a full workout session.',
  },
  light_workout: {
    label: 'Light Workout',
    icon: '🚶',
    color: 'blue',
    description: 'A lighter session is perfect for today. Focus on form over intensity.',
  },
  mobility: {
    label: 'Mobility Session',
    icon: '🧘',
    color: 'purple',
    description: 'Focus on mobility and flexibility today to help your body recover.',
  },
  active_recovery: {
    label: 'Active Recovery',
    icon: '🌿',
    color: 'teal',
    description:
      'Light movement like a walk or gentle stretching will help your body recover.',
  },
  rest: {
    label: 'Rest Day',
    icon: '😴',
    color: 'orange',
    description: 'Your body needs rest. Taking a day off is part of the fitness journey.',
  },
};

export default function CheckInCard({ result }: Props) {
  const info = RECOMMENDATION_INFO[result.recommendation];

  return (
    <div className={`checkin-result checkin-${info.color}`}>
      <div className="checkin-icon">{info.icon}</div>
      <h3 className="checkin-label">{info.label}</h3>
      <p className="checkin-description">{info.description}</p>
      {result.message && (
        <div className="checkin-ai-message">
          <pre className="checkin-text">{result.message}</pre>
        </div>
      )}
    </div>
  );
}
