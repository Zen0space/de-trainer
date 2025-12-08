// Database Type Definitions for JejakAthlete
// Shared between web and mobile applications

import type { UserRole } from './auth';

// ============================================================================
// User Management
// ============================================================================

export interface User {
  id: string;
  email?: string; // Optional as it comes from auth.users, not public.users
  full_name: string | null;
  username: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfiling {
  user_id: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  date_of_birth: string | null;
  gender: string | null;
  bio: string | null;
  social_links: Record<string, string> | null;
  preferences: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Trainer {
  user_id: string;
  trainer_code: string;
  certification_id: string | null;
  specialization: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Athlete {
  user_id: string;
  sport: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Enrollments
// ============================================================================

export interface Enrollment {
  id: number;
  athlete_id: string;
  trainer_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  responded_at: string | null;
  notes: string | null;
}

export interface EnrollmentWithDetails extends Enrollment {
  athlete?: User;
  trainer?: User;
}

// ============================================================================
// Body Metrics
// ============================================================================

export interface BodyMetric {
  id: number;
  athlete_id: string;
  measurement_date: string;
  weight: number | null;
  height: number | null;
  muscle_mass: number | null;
  body_fat_percentage: number | null;
  bmi: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Fitness Tests
// ============================================================================

export interface FitnessComponent {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Test {
  id: number;
  fitness_component_id: number;
  name: string;
  description: string | null;
  unit: string;
  improvement_direction: 'higher' | 'lower';
  created_at: string;
}

export interface TestResult {
  id: number;
  athlete_id: string;
  test_id: number;
  result_value: number;
  test_date: string;
  notes: string | null;
  is_best_record: boolean;
  created_at: string;
}

export interface TestResultWithDetails extends TestResult {
  test?: Test;
  fitness_component?: FitnessComponent;
}

// ============================================================================
// Workouts
// ============================================================================

export interface Exercise {
  id: number;
  name: string;
  description: string | null;
  muscle_group: string | null;
  equipment: string | null;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  video_url: string | null;
  created_at: string;
}

export interface WorkoutTemplate {
  id: number;
  trainer_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: number;
  workout_template_id: number;
  exercise_id: number;
  order_index: number;
  sets: number;
  reps: number;
  rest_time: number;
  notes: string | null;
  created_at: string;
}

export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercise?: Exercise;
}

export interface WorkoutTemplateWithExercises extends WorkoutTemplate {
  exercises: WorkoutExerciseWithDetails[];
}

export interface WorkoutAssignment {
  id: number;
  workout_template_id: number;
  athlete_id: string;
  trainer_id: string;
  scheduled_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkoutAssignmentWithDetails extends WorkoutAssignment {
  workout_template?: WorkoutTemplateWithExercises;
  athlete?: User;
  trainer?: User;
  completion_percentage?: number;
}

export interface WorkoutSessionProgress {
  id: number;
  workout_assignment_id: number;
  exercise_id: number;
  set_number: number;
  reps_completed: number | null;
  weight_used: number | null;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Calendar Events
// ============================================================================

export interface EventType {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  created_at: string;
}

export interface Event {
  id: number;
  title: string;
  description: string | null;
  event_type_id: number;
  created_by_user_id: string;
  start_date: string;
  end_date: string;
  location: string | null;
  status: 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventWithDetails extends Event {
  event_type?: EventType;
  created_by?: User;
  participants?: User[];
}

export interface EventParticipant {
  id: number;
  event_id: number;
  athlete_id: string;
  assigned_by_user_id: string;
  status: 'invited' | 'confirmed' | 'declined';
  created_at: string;
}

export interface EventReminder {
  id: number;
  event_id: number;
  user_id: string;
  reminder_time: string;
  sent: boolean;
  created_at: string;
}

export interface EventResult {
  id: number;
  event_id: number;
  athlete_id: string;
  result_data: Record<string, any>;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// Notifications
// ============================================================================

export interface Notification {
  id: number;
  user_id: string;
  type: 'enrollment_request' | 'enrollment_response' | 'workout_assigned' | 'event_assigned' | 'test_result' | 'general';
  title: string;
  message: string;
  data: Record<string, any> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ============================================================================
// ============================================================================
// Complete Profile Types
// ============================================================================

export interface CompleteProfile extends User {
  profiling?: UserProfiling;
  trainer_data?: Trainer;
  athlete_data?: Athlete;
}
