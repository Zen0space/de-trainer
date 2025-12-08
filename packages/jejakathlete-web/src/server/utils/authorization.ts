import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from '@jejakathlete/shared';

/**
 * Verify trainer has access to athlete data through approved enrollment
 */
export async function verifyTrainerAthleteAccess(
  supabase: SupabaseClient,
  trainerId: string,
  athleteId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('athlete_id', athleteId)
    .eq('status', 'approved')
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

/**
 * Verify user owns resource
 */
export function verifyOwnership(
  userId: string,
  resourceUserId: string
): boolean {
  return userId === resourceUserId;
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin' || role === 'rekabytes-admin';
}
