import { v4 as uuidv4 } from 'uuid';
import {
  ProgressData,
  CompletedWorkout,
  WorkoutFeedback,
} from '../types/index.js';

// In-memory progress store — keyed by userId
// Replace with a real DB for production
const progressStore: Map<string, ProgressData> = new Map();

function getOrCreate(userId: string): ProgressData {
  if (!progressStore.has(userId)) {
    progressStore.set(userId, {
      currentStreak: 0,
      totalWorkouts: 0,
      workoutsThisWeek: 0,
      completionRate: 0,
      lastWorkoutDate: null,
      recentWorkouts: [],
      feedbackHistory: [],
    });
  }
  return progressStore.get(userId)!;
}

export function getProgress(userId: string): ProgressData {
  return getOrCreate(userId);
}

export function completeWorkout(
  userId: string,
  title: string,
  durationMinutes: number,
  feedback: WorkoutFeedback,
  notes?: string
): CompletedWorkout {
  const progress = getOrCreate(userId);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0]!;

  const completed: CompletedWorkout = {
    id: uuidv4(),
    date: now.toISOString(),
    title,
    durationMinutes,
    feedback,
    notes,
  };

  // Update streak
  const lastDate = progress.lastWorkoutDate
    ? new Date(progress.lastWorkoutDate).toISOString().split('T')[0]
    : null;

  if (lastDate === null) {
    // First workout ever
    progress.currentStreak = 1;
  } else if (lastDate === todayStr) {
    // Already completed one today — don't double-count streak
  } else {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      // Consecutive day — extend streak
      progress.currentStreak += 1;
    } else {
      // Gap — reset streak
      progress.currentStreak = 1;
    }
  }

  progress.totalWorkouts += 1;
  progress.lastWorkoutDate = now.toISOString();

  // Weekly count: workouts completed in the current calendar week
  const weekStart = getWeekStart(now);
  progress.workoutsThisWeek = [completed, ...progress.recentWorkouts].filter((w) => {
    return new Date(w.date) >= weekStart;
  }).length;

  // Completion rate: percentage of workouts not marked not_completed (last 30)
  const recent30 = [completed, ...progress.recentWorkouts].slice(0, 30);
  const completed30 = recent30.filter((w) => w.feedback !== 'not_completed').length;
  progress.completionRate = Math.round((completed30 / recent30.length) * 100);

  // Keep last 20 workouts
  progress.recentWorkouts = [completed, ...progress.recentWorkouts].slice(0, 20);

  // Keep last 50 feedback entries
  progress.feedbackHistory = [
    { date: now.toISOString(), feedback },
    ...progress.feedbackHistory,
  ].slice(0, 50);

  progressStore.set(userId, progress);
  return completed;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
