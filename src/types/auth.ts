// Authentication Type Definitions for Jejak Atlet App

export type UserRole = 'trainer' | 'athlete';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  is_verified: boolean;
}

export interface Trainer extends User {
  role: 'trainer';
  trainer_code: string;
  certification_id?: string;
  specialization?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
}

export interface Athlete extends User {
  role: 'athlete';
  sport: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface AuthUser extends User {
  // Additional fields that might come with the authenticated user
  trainer_data?: Omit<Trainer, keyof User>;
  athlete_data?: Omit<Athlete, keyof User>;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
}

export interface RegisterUserData {
  username: string;
  email: string;
  password: string;
  full_name: string;
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
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
  error?: string;
}

export interface AuthContextType {
  // Authentication state
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Authentication methods
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (userData: RegisterTrainerData | RegisterAthleteData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  
  // Utility methods
  isTrainer: () => boolean;
  isAthlete: () => boolean;
  refreshUser: () => Promise<void>;
}

export interface StorageState<T> {
  isLoading: boolean;
  data: T | null;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Database row types (matching Turso schema)
export interface UserRow {
  id: number;
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: string;
  created_at: string;
  is_verified: boolean;
}

export interface TrainerRow {
  user_id: number;
  trainer_code: string;
  certification_id: string | null;
  specialization: string | null;
  verification_status: string;
}

export interface AthleteRow {
  user_id: number;
  sport: string;
  level: string;
}

export interface EnrollmentRow {
  id: number;
  athlete_id: number;
  trainer_id: number;
  status: string;
  requested_at: string;
  responded_at: string | null;
}
