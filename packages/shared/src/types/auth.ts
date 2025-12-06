// Authentication Type Definitions for JejakAthlete
// Shared between web and mobile applications

export type UserRole = 'athlete' | 'trainer' | 'admin' | 'rekabytes-admin';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trainer {
  user_id: string;
  trainer_code: string;
  certification_id: string | null;
  specialization: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
}

export interface Athlete {
  user_id: string;
  sport: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
}

export interface AuthUser extends User {
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
