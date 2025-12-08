// Authentication Type Definitions for JejakAthlete
// Shared between web and mobile applications

import type { User as DbUser, Trainer, Athlete } from './database';

// Re-export database types used in auth
export type { User, Trainer, Athlete } from './database';

export type UserRole = 'athlete' | 'trainer' | 'admin' | 'rekabytes-admin';

// AuthUser extends User with optional role-specific data
export interface AuthUser extends DbUser {
  trainer_data?: Trainer;
  athlete_data?: Athlete;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterUserData {
  email: string;
  password: string;
  full_name: string;
  username: string;
  role: UserRole;
}

export interface RegisterTrainerData extends RegisterUserData {
  role: 'trainer';
  trainer_code: string;
  certification_id?: string;
  specialization?: string;
}

export interface RegisterAthleteData extends RegisterUserData {
  role: 'athlete';
  sport: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  password: string;
}

export interface OAuthCallbackResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  redirectTo?: string;
  error?: string;
}
