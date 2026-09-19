// ─────────────────────────────────────────────
//  Shared types used across the React frontend
// ─────────────────────────────────────────────

export type FitnessGoal =
  | 'weight_management'
  | 'muscle_building'
  | 'general_fitness'
  | 'endurance'
  | 'flexibility';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'none' | 'dumbbells' | 'resistance_bands' | 'full_gym' | 'other';
export type WorkoutLocation = 'home' | 'gym' | 'outdoors';
export type DietaryPreference =
  | 'vegetarian'
  | 'non_vegetarian'
  | 'vegan'
  | 'eggetarian'
  | 'no_preference';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type SorenessLevel = 'not_sore' | 'slightly_sore' | 'very_sore';
export type WorkoutFeedback = 'too_easy' | 'perfect' | 'too_hard' | 'not_completed';
export type CheckInDuration = 10 | 20 | 30 | 45;
export type CheckInRecommendation =
  | 'normal_workout'
  | 'light_workout'
  | 'mobility'
  | 'active_recovery'
  | 'rest';

export interface UserProfile {
  id: string;
  name: string;
  goal: FitnessGoal;
  fitnessLevel: ExperienceLevel;
  durationMinutes: number;
  equipment: Equipment;
  location: WorkoutLocation;
  diet: DietaryPreference;
  createdAt: string;
  updatedAt: string;
}

export interface UserContext {
  goal?: FitnessGoal;
  fitnessLevel?: ExperienceLevel;
  durationMinutes?: number;
  equipment?: Equipment;
  location?: WorkoutLocation;
  diet?: DietaryPreference;
  energyLevel?: EnergyLevel;
  sorenessLevel?: SorenessLevel;
  lastWorkoutFeedback?: WorkoutFeedback;
  recentActivity?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  specialist?: string;
  source?: 'orchestrate' | 'watsonx' | 'error';
}

export interface ChatRequest {
  message: string;
  userContext?: UserContext;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  source: 'orchestrate' | 'watsonx' | 'error';
  specialist?: string;
  error?: string;
}

export interface Exercise {
  name: string;
  setsReps?: string;
  duration?: string;
  rest?: string;
  instructions: string;
  modification?: string;
}

export interface WorkoutPlan {
  title: string;
  goal: string;
  durationMinutes: number;
  difficulty: ExperienceLevel;
  warmUp: string[];
  exercises: Exercise[];
  coolDown: string[];
  notes?: string;
}

export interface WorkoutResponse {
  success: boolean;
  workout: WorkoutPlan | null;
  rawMessage: string;
  error?: string;
}

export interface NutritionResponse {
  success: boolean;
  plan: Record<string, unknown> | null;
  rawMessage: string;
  error?: string;
}

export interface CheckInRequest {
  energyLevel: EnergyLevel;
  sorenessLevel: SorenessLevel;
  availableMinutes: CheckInDuration;
}

export interface CheckInResponse {
  success: boolean;
  recommendation: CheckInRecommendation;
  message: string;
  reasoning: string;
  error?: string;
}

export interface CompletedWorkout {
  id: string;
  date: string;
  title: string;
  durationMinutes: number;
  feedback: WorkoutFeedback;
  notes?: string;
}

export interface ProgressData {
  currentStreak: number;
  totalWorkouts: number;
  workoutsThisWeek: number;
  completionRate: number;
  lastWorkoutDate: string | null;
  recentWorkouts: CompletedWorkout[];
  feedbackHistory: Array<{ date: string; feedback: WorkoutFeedback }>;
}

export interface ProgressResponse {
  success: boolean;
  progress: ProgressData;
  error?: string;
}

export interface CompleteWorkoutRequest {
  userId?: string;
  title: string;
  durationMinutes: number;
  feedback: WorkoutFeedback;
  notes?: string;
}

export interface CompleteWorkoutResponse {
  success: boolean;
  message: string;
  workout: CompletedWorkout;
  streak: number;
  error?: string;
}

export interface ProfileResponse {
  success: boolean;
  profile: UserProfile;
  error?: string;
}

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  weight_management: 'Weight Management',
  muscle_building: 'Muscle Building',
  general_fitness: 'General Fitness',
  endurance: 'Endurance',
  flexibility: 'Flexibility',
};

export const LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  none: 'No Equipment',
  dumbbells: 'Dumbbells',
  resistance_bands: 'Resistance Bands',
  full_gym: 'Full Gym',
  other: 'Other',
};

export const LOCATION_LABELS: Record<WorkoutLocation, string> = {
  home: 'Home',
  gym: 'Gym',
  outdoors: 'Outdoors',
};

export const DIET_LABELS: Record<DietaryPreference, string> = {
  vegetarian: 'Vegetarian',
  non_vegetarian: 'Non-Vegetarian',
  vegan: 'Vegan',
  eggetarian: 'Eggetarian',
  no_preference: 'No Preference',
};
