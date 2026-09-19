// ─────────────────────────────────────────────
//  Shared types used across backend modules
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

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  userContext?: UserContext;
  conversationHistory?: ConversationMessage[];
}

export interface ChatResponse {
  success: boolean;
  message: string;
  source: 'orchestrate' | 'watsonx' | 'error';
  specialist?: string;
}

export interface WorkoutRequest {
  userContext: UserContext;
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
}

export interface NutritionRequest {
  userContext: UserContext;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'full_day';
}

export interface Meal {
  name: string;
  ingredients: string[];
  preparation: string;
  nutrition?: string;
  substitutions?: string[];
}

export interface NutritionPlan {
  breakfast?: Meal;
  lunch?: Meal;
  dinner?: Meal;
  snack?: Meal;
  notes?: string;
}

export interface NutritionResponse {
  success: boolean;
  plan: NutritionPlan | null;
  rawMessage: string;
}

export interface CheckInRequest {
  energyLevel: EnergyLevel;
  sorenessLevel: SorenessLevel;
  availableMinutes: CheckInDuration;
  userId?: string;
}

export type CheckInRecommendation =
  | 'normal_workout'
  | 'light_workout'
  | 'mobility'
  | 'active_recovery'
  | 'rest';

export interface CheckInResponse {
  success: boolean;
  recommendation: CheckInRecommendation;
  message: string;
  reasoning: string;
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

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}
