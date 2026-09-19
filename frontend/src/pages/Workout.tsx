import { useState, useEffect } from 'react';
import { generateWorkout, completeWorkout, fetchProfile } from '../services/api';
import { WorkoutPlan, WorkoutFeedback, UserContext, UserProfile } from '../types/index';
import WorkoutCardComponent from '../components/WorkoutCard';
import CheckInCard from '../components/CheckInCard';
import LoadingIndicator from '../components/LoadingIndicator';
import { submitCheckIn } from '../services/api';
import { CheckInResponse, EnergyLevel, SorenessLevel, CheckInDuration } from '../types/index';

export default function Workout() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [rawMessage, setRawMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [completingFeedback, setCompletingFeedback] = useState(false);

  // Check-in state
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [energy, setEnergy] = useState<EnergyLevel>('medium');
  const [soreness, setSoreness] = useState<SorenessLevel>('not_sore');
  const [availableMinutes, setAvailableMinutes] = useState<CheckInDuration>(30);
  const [checkInResult, setCheckInResult] = useState<CheckInResponse | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  useEffect(() => {
    fetchProfile('demo')
      .then((r) => setProfile(r.profile))
      .catch(console.error);
  }, []);

  const getUserContext = (): UserContext => ({
    goal: profile?.goal,
    fitnessLevel: profile?.fitnessLevel,
    durationMinutes: profile?.durationMinutes,
    equipment: profile?.equipment,
    location: profile?.location,
    diet: profile?.diet,
    energyLevel: energy,
    sorenessLevel: soreness,
  });

  const handleGenerateWorkout = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await generateWorkout(getUserContext());
      if (res.workout) {
        setWorkout(res.workout);
      }
      setRawMessage(res.rawMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate workout.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (feedback: WorkoutFeedback) => {
    setCompletingFeedback(true);
    setError(null);
    try {
      const res = await completeWorkout({
        userId: 'demo',
        title: workout?.title ?? "Today's Workout",
        durationMinutes: workout?.durationMinutes ?? profile?.durationMinutes ?? 30,
        feedback,
      });
      setSuccessMsg(res.message);
      setWorkout(null);
      setRawMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record workout.');
    } finally {
      setCompletingFeedback(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const res = await submitCheckIn({
        energyLevel: energy,
        sorenessLevel: soreness,
        availableMinutes,
      });
      setCheckInResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed.');
    } finally {
      setCheckInLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🏋️ Workout</h1>
        <p className="page-subtitle">AI-powered workout plans adapted to you.</p>
      </div>

      {/* Daily Check-in toggle */}
      <div className="checkin-section">
        <button
          className="btn btn-ghost"
          onClick={() => setShowCheckIn((v) => !v)}
        >
          {showCheckIn ? 'Hide Check-in' : '📋 Daily Check-in'}
        </button>

        {showCheckIn && (
          <div className="checkin-form card">
            <h3>How are you feeling today?</h3>

            <div className="form-group">
              <label>Energy Level</label>
              <div className="btn-group">
                {(['low', 'medium', 'high'] as EnergyLevel[]).map((e) => (
                  <button
                    key={e}
                    className={`btn-option${energy === e ? ' selected' : ''}`}
                    onClick={() => setEnergy(e)}
                  >
                    {e === 'low' ? '😴 Low' : e === 'medium' ? '😊 Medium' : '⚡ High'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Soreness</label>
              <div className="btn-group">
                {(['not_sore', 'slightly_sore', 'very_sore'] as SorenessLevel[]).map((s) => (
                  <button
                    key={s}
                    className={`btn-option${soreness === s ? ' selected' : ''}`}
                    onClick={() => setSoreness(s)}
                  >
                    {s === 'not_sore'
                      ? '✅ Not sore'
                      : s === 'slightly_sore'
                      ? '🟡 Slightly'
                      : '🔴 Very sore'}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Available Time</label>
              <div className="btn-group">
                {([10, 20, 30, 45] as CheckInDuration[]).map((m) => (
                  <button
                    key={m}
                    className={`btn-option${availableMinutes === m ? ' selected' : ''}`}
                    onClick={() => setAvailableMinutes(m)}
                  >
                    {m === 45 ? '45+ min' : `${m} min`}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleCheckIn}
              disabled={checkInLoading}
            >
              {checkInLoading ? <LoadingIndicator size="sm" message="" /> : 'Get Recommendation'}
            </button>

            {checkInResult && <CheckInCard result={checkInResult} />}
          </div>
        )}
      </div>

      {/* Generate workout */}
      {!workout && !rawMessage && (
        <div className="generate-section">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleGenerateWorkout}
            disabled={loading}
          >
            {loading ? (
              <LoadingIndicator size="sm" message="Generating your workout…" />
            ) : (
              "🏋️ Generate Today's Workout"
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button onClick={handleGenerateWorkout} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {successMsg && (
        <div className="success-banner" role="status">
          {successMsg}
        </div>
      )}

      {/* Workout display */}
      {(workout || rawMessage) && (
        <>
          {workout ? (
            <WorkoutCardComponent
              workout={workout}
              rawMessage={rawMessage}
              onComplete={handleComplete}
              isLoading={completingFeedback}
            />
          ) : (
            <div className="card">
              <pre className="raw-text">{rawMessage}</pre>
            </div>
          )}

          <div className="workout-actions">
            <button
              className="btn btn-ghost"
              onClick={handleGenerateWorkout}
              disabled={loading}
            >
              🔄 Generate New Workout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
