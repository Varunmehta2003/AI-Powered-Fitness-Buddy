import { useState, useEffect } from 'react';
import { generateNutrition, fetchProfile } from '../services/api';
import { UserProfile } from '../types/index';
import MealCard from '../components/MealCard';
import LoadingIndicator from '../components/LoadingIndicator';

const MEAL_TYPES = [
  { value: 'full_day', label: 'Full Day Plan' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export default function Nutrition() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedMealType, setSelectedMealType] = useState('full_day');
  const [rawMessage, setRawMessage] = useState<string | null>(null);
  const [parsedPlan, setParsedPlan] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile('demo')
      .then((r) => setProfile(r.profile))
      .catch(console.error);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setRawMessage(null);
    setParsedPlan(null);
    try {
      const res = await generateNutrition(
        {
          goal: profile?.goal,
          fitnessLevel: profile?.fitnessLevel,
          diet: profile?.diet,
        },
        selectedMealType
      );
      setRawMessage(res.rawMessage);
      setParsedPlan(res.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate meal plan.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlan = () => {
    if (!rawMessage) return null;

    if (selectedMealType === 'full_day' && parsedPlan) {
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      const rendered = mealTypes.filter((t) => parsedPlan[t]);
      if (rendered.length > 0) {
        return (
          <div className="nutrition-grid">
            {rendered.map((type) => (
              <MealCard
                key={type}
                mealType={type}
                data={parsedPlan[type] as string}
              />
            ))}
          </div>
        );
      }
    }

    // Fallback: display raw text
    return (
      <div className="card">
        <div className="meal-header">
          <span className="meal-icon">
            {selectedMealType === 'full_day'
              ? '📋'
              : selectedMealType === 'breakfast'
              ? '🌅'
              : selectedMealType === 'lunch'
              ? '☀️'
              : selectedMealType === 'dinner'
              ? '🌙'
              : '🍎'}
          </span>
          <span className="meal-type">
            {MEAL_TYPES.find((m) => m.value === selectedMealType)?.label}
          </span>
        </div>
        <pre className="raw-text">{rawMessage}</pre>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🥗 Nutrition</h1>
        <p className="page-subtitle">
          Personalized meal suggestions based on your goals and preferences.
        </p>
      </div>

      {profile && (
        <div className="profile-context-banner">
          🥗 Diet preference: <strong>{profile.diet.replace(/_/g, ' ')}</strong> · Goal:{' '}
          <strong>{profile.goal.replace(/_/g, ' ')}</strong>
        </div>
      )}

      {/* Meal type selector */}
      <div className="meal-type-selector">
        {MEAL_TYPES.map(({ value, label }) => (
          <button
            key={value}
            className={`btn-option${selectedMealType === value ? ' selected' : ''}`}
            onClick={() => setSelectedMealType(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        className="btn btn-primary btn-lg"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <LoadingIndicator size="sm" message="Generating meal plan…" />
        ) : (
          `🥗 Get ${MEAL_TYPES.find((m) => m.value === selectedMealType)?.label ?? 'Meal Plan'}`
        )}
      </button>

      {error && (
        <div className="error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button onClick={handleGenerate} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {rawMessage && !loading && (
        <>
          {renderPlan()}
          <div className="workout-actions">
            <button
              className="btn btn-ghost"
              onClick={handleGenerate}
              disabled={loading}
            >
              🔄 Suggest Another
            </button>
          </div>
        </>
      )}
    </div>
  );
}
