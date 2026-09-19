import {
  ChatRequest,
  ChatResponse,
  WorkoutResponse,
  NutritionResponse,
  CheckInRequest,
  CheckInResponse,
  CompleteWorkoutRequest,
  CompleteWorkoutResponse,
  ProgressResponse,
  ProfileResponse,
  UserProfile,
  UserContext,
} from '../types/index';

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000';

// Session ID is generated per browser session for Orchestrate conversation continuity
const SESSION_ID = `session_${Math.random().toString(36).slice(2)}_${Date.now()}`;

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-id': SESSION_ID,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
  });

  const data = (await res.json()) as T & { error?: string };

  if (!res.ok) {
    const errData = data as { error?: string };
    throw new Error(
      errData.error ?? `Request failed with status ${res.status}`
    );
  }

  return data;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ── Workout ───────────────────────────────────────────────────────────────────

export async function generateWorkout(userContext: UserContext): Promise<WorkoutResponse> {
  return apiFetch<WorkoutResponse>('/api/workouts', {
    method: 'POST',
    body: JSON.stringify({ userContext }),
  });
}

// ── Nutrition ─────────────────────────────────────────────────────────────────

export async function generateNutrition(
  userContext: UserContext,
  mealType: string = 'full_day'
): Promise<NutritionResponse> {
  return apiFetch<NutritionResponse>('/api/nutrition', {
    method: 'POST',
    body: JSON.stringify({ userContext, mealType }),
  });
}

// ── Check-in ──────────────────────────────────────────────────────────────────

export async function submitCheckIn(request: CheckInRequest): Promise<CheckInResponse> {
  return apiFetch<CheckInResponse>('/api/checkin', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ── Progress ──────────────────────────────────────────────────────────────────

export async function fetchProgress(userId: string = 'demo'): Promise<ProgressResponse> {
  return apiFetch<ProgressResponse>(`/api/progress?userId=${userId}`);
}

export async function completeWorkout(
  request: CompleteWorkoutRequest
): Promise<CompleteWorkoutResponse> {
  return apiFetch<CompleteWorkoutResponse>('/api/progress/complete-workout', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string = 'demo'): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>(`/api/profile?userId=${userId}`);
}

export async function createProfile(
  profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>('/api/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  });
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ProfileResponse> {
  return apiFetch<ProfileResponse>(`/api/profile/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}
