import { useState, useEffect, FormEvent } from 'react';
import { fetchProfile, updateProfile, createProfile } from '../services/api';
import {
  UserProfile,
  FitnessGoal,
  ExperienceLevel,
  Equipment,
  WorkoutLocation,
  DietaryPreference,
  GOAL_LABELS,
  LEVEL_LABELS,
  EQUIPMENT_LABELS,
  LOCATION_LABELS,
  DIET_LABELS,
} from '../types/index';
import LoadingIndicator from '../components/LoadingIndicator';

type FieldOption<T extends string> = { value: T; label: string };

function options<T extends string>(record: Record<T, string>): FieldOption<T>[] {
  return (Object.entries(record) as [T, string][]).map(([value, label]) => ({
    value,
    label,
  }));
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<FitnessGoal>('general_fitness');
  const [fitnessLevel, setFitnessLevel] = useState<ExperienceLevel>('beginner');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [equipment, setEquipment] = useState<Equipment>('none');
  const [location, setLocation] = useState<WorkoutLocation>('home');
  const [diet, setDiet] = useState<DietaryPreference>('no_preference');

  useEffect(() => {
    fetchProfile('demo')
      .then((r) => {
        setProfile(r.profile);
        populateForm(r.profile);
      })
      .catch(() => {
        // No profile yet — user will create one
      })
      .finally(() => setLoading(false));
  }, []);

  function populateForm(p: UserProfile) {
    setName(p.name);
    setGoal(p.goal);
    setFitnessLevel(p.fitnessLevel);
    setDurationMinutes(p.durationMinutes);
    setEquipment(p.equipment);
    setLocation(p.location);
    setDiet(p.diet);
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const data = { name, goal, fitnessLevel, durationMinutes, equipment, location, diet };

    try {
      if (profile) {
        const res = await updateProfile(profile.id, data);
        setProfile(res.profile);
      } else {
        const res = await createProfile(data);
        setProfile(res.profile);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-center">
        <LoadingIndicator message="Loading profile…" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">👤 Profile</h1>
        <p className="page-subtitle">
          Configure your preferences so Fitness Buddy can personalize everything for you.
        </p>
      </div>

      <form className="profile-form card" onSubmit={handleSubmit} noValidate>
        {/* Name */}
        <div className="form-field">
          <label htmlFor="name" className="form-label">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            maxLength={80}
          />
        </div>

        {/* Goal */}
        <div className="form-field">
          <label className="form-label">Fitness Goal</label>
          <div className="option-grid">
            {options(GOAL_LABELS).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`btn-option${goal === value ? ' selected' : ''}`}
                onClick={() => setGoal(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Experience level */}
        <div className="form-field">
          <label className="form-label">Experience Level</label>
          <div className="btn-group">
            {options(LEVEL_LABELS).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`btn-option${fitnessLevel === value ? ' selected' : ''}`}
                onClick={() => setFitnessLevel(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="form-field">
          <label htmlFor="duration" className="form-label">
            Workout Duration: <strong>{durationMinutes} minutes</strong>
          </label>
          <input
            id="duration"
            type="range"
            className="form-range"
            min={10}
            max={90}
            step={5}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
          <div className="range-labels">
            <span>10 min</span>
            <span>90 min</span>
          </div>
        </div>

        {/* Equipment */}
        <div className="form-field">
          <label className="form-label">Equipment Available</label>
          <div className="option-grid">
            {options(EQUIPMENT_LABELS).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`btn-option${equipment === value ? ' selected' : ''}`}
                onClick={() => setEquipment(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="form-field">
          <label className="form-label">Workout Location</label>
          <div className="btn-group">
            {options(LOCATION_LABELS).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`btn-option${location === value ? ' selected' : ''}`}
                onClick={() => setLocation(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Diet */}
        <div className="form-field">
          <label className="form-label">Dietary Preference</label>
          <div className="option-grid">
            {options(DIET_LABELS).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`btn-option${diet === value ? ' selected' : ''}`}
                onClick={() => setDiet(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="success-banner" role="status">
            ✅ Profile saved successfully!
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
          {saving ? <LoadingIndicator size="sm" message="Saving…" /> : '💾 Save Profile'}
        </button>
      </form>
    </div>
  );
}
