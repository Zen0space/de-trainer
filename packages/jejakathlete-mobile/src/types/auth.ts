// Authentication Type Definitions for Jejak Atlet App (Supabase Auth)

export type UserRole = 'athlete' | 'trainer' | 'admin' | 'rekabytes-admin';

export interface User {
  id: string; // UUID from Supabase Auth
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

export interface AuthContextType {
  user: AuthUser | null;
  session: unknown; // Supabase Session type
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (userData: RegisterTrainerData | RegisterAthleteData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  isTrainer: () => boolean;
  isAthlete: () => boolean;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

export interface StorageState<T> {
  isLoading: boolean;
  data: T | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Database row types (matching Supabase schema)
export interface UserRow {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainerRow {
  user_id: string;
  trainer_code: string;
  certification_id: string | null;
  specialization: string | null;
  verification_status: string;
}

export interface AthleteRow {
  user_id: string;
  sport: string;
  level: string;
}

export interface EnrollmentRow {
  id: number;
  athlete_id: string;
  trainer_id: string;
  status: string;
  requested_at: string;
  responded_at: string | null;
}
