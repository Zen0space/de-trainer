/**
 * Supabase Client Utilities for tRPC Server
 * 
 * These utilities provide helper functions for common Supabase operations
 * used across tRPC procedures.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompleteProfile } from '@jejakathlete/shared';

/**
 * Fetch complete user profile with role-specific data
 * Joins users, user_profiling, and role-specific tables (trainers/athletes)
 * 
 * @param supabase - Supabase client instance
 * @param userId - ID of the user to fetch
 * @returns Complete user profile or null if not found
 */
export async function fetchCompleteProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<CompleteProfile | null> {
  // Fetch base user data
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return null;
  }

  // Fetch user profiling data
  const { data: profiling } = await supabase
    .from('user_profiling')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Fetch role-specific data
  let trainer_data;
  let athlete_data;

  if (user.role === 'trainer') {
    const { data } = await supabase
      .from('trainers')
      .select('*')
      .eq('user_id', userId)
      .single();
    trainer_data = data || undefined;
  } else if (user.role === 'athlete') {
    const { data } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', userId)
      .single();
    athlete_data = data || undefined;
  }

  return {
    ...user,
    profiling: profiling || undefined,
    trainer_data,
    athlete_data,
  };
}

/**
 * Check if a username is available
 * 
 * @param supabase - Supabase client instance
 * @param username - Username to check
 * @param excludeUserId - Optional user ID to exclude from check (for updates)
 * @returns true if username is available, false otherwise
 */
export async function isUsernameAvailable(
  supabase: SupabaseClient,
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  let query = supabase
    .from('users')
    .select('id')
    .eq('username', username);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query.single();

  // If no data found, username is available
  return !data && !error;
}

/**
 * Check if a trainer code is available
 * 
 * @param supabase - Supabase client instance
 * @param trainerCode - Trainer code to check
 * @param excludeUserId - Optional user ID to exclude from check (for updates)
 * @returns true if trainer code is available, false otherwise
 */
export async function isTrainerCodeAvailable(
  supabase: SupabaseClient,
  trainerCode: string,
  excludeUserId?: string
): Promise<boolean> {
  let query = supabase
    .from('trainers')
    .select('user_id')
    .eq('trainer_code', trainerCode);

  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId);
  }

  const { data, error } = await query.single();

  // If no data found, trainer code is available
  return !data && !error;
}

/**
 * Generate a unique trainer code
 * Format: TR + 3 random digits
 * 
 * @param supabase - Supabase client instance
 * @returns A unique trainer code
 */
export async function generateUniqueTrainerCode(
  supabase: SupabaseClient
): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const randomNum = Math.floor(Math.random() * 900) + 100;
    const code = `TR${randomNum}`;

    const isAvailable = await isTrainerCodeAvailable(supabase, code);
    if (isAvailable) {
      return code;
    }

    attempts++;
  }

  // Fallback to timestamp-based code if random generation fails
  const timestamp = Date.now().toString().slice(-6);
  return `TR${timestamp}`;
}
