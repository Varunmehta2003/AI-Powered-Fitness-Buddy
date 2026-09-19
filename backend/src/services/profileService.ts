import { v4 as uuidv4 } from 'uuid';
import {
  UserProfile,
  FitnessGoal,
  ExperienceLevel,
  Equipment,
  WorkoutLocation,
  DietaryPreference,
} from '../types/index.js';

// In-memory profile store — replace with a real DB for production
const profiles: Map<string, UserProfile> = new Map();

// Demo profile available in development
const DEMO_PROFILE: UserProfile = {
  id: 'demo',
  name: 'Demo User',
  goal: 'weight_management',
  fitnessLevel: 'beginner',
  durationMinutes: 30,
  equipment: 'none',
  location: 'home',
  diet: 'vegetarian',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

profiles.set('demo', DEMO_PROFILE);

export function getProfile(userId: string): UserProfile | null {
  return profiles.get(userId) ?? null;
}

export function getAllProfiles(): UserProfile[] {
  return Array.from(profiles.values());
}

export interface CreateProfileInput {
  name: string;
  goal: FitnessGoal;
  fitnessLevel: ExperienceLevel;
  durationMinutes: number;
  equipment: Equipment;
  location: WorkoutLocation;
  diet: DietaryPreference;
}

export function createProfile(input: CreateProfileInput): UserProfile {
  const id = uuidv4();
  const now = new Date().toISOString();

  const profile: UserProfile = {
    id,
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  profiles.set(id, profile);
  return profile;
}

export function updateProfile(
  userId: string,
  updates: Partial<CreateProfileInput>
): UserProfile | null {
  const existing = profiles.get(userId);
  if (!existing) return null;

  const updated: UserProfile = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  profiles.set(userId, updated);
  return updated;
}

export function deleteProfile(userId: string): boolean {
  return profiles.delete(userId);
}
