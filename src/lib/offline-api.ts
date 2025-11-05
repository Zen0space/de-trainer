import { localDbHelpers } from './local-database';
import { syncService } from './sync-service';
import NetInfo from '@react-native-community/netinfo';

// User context for background sync
let currentUserContext: { userId: number; userRole: 'trainer' | 'athlete' } | null = null;

// Set user context for background sync
export function setUserContext(userId: number, userRole: 'trainer' | 'athlete'): void {
  currentUserContext = { userId, userRole };
  syncService.setUserContext(userId, userRole);
}

// Clear user context
export function clearUserContext(): void {
  currentUserContext = null;
  syncService.clearUserContext();
}

/**
 * Offline-First API Layer
 * 
 * This layer provides offline-first data operations:
 * 1. Save to local database immediately
 * 2. Mark record as dirty (needs sync)
 * 3. Return success to user immediately
 * 4. Attempt background sync if online
 * 
 * Benefits:
 * - App works offline
 * - Instant user feedback
 * - Automatic sync when online
 * - No data loss
 */

// Check if device is online
async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  } catch (error) {
    console.warn('Failed to check network status:', error);
    return false; // Assume offline if check fails
  }
}

// Attempt background sync if online (user-scoped)
async function attemptBackgroundSync(): Promise<void> {
  try {
    const online = await isOnline();
    if (online && !syncService.isSyncInProgress() && currentUserContext) {
      // Don't await - let it run in background
      const { userId, userRole } = currentUserContext;
      syncService.sync(userId, userRole).catch(error => {
        console.error('❌ Background sync failed:', error);
      });
    }
  } catch (error) {
    console.error('❌ Error attempting background sync:', error);
  }
}

/**
 * Create a test result (training log entry)
 * Offline-first: Saves to local DB immediately, syncs later
 */
export async function createTestResult(data: {
  athlete_id: number;
  test_id: number;
  result_value: number | null;
  result_text: string | null;
  notes: string | null;
  test_date: string;
  input_unit: string | null;
  is_best_record: boolean;
}): Promise<{ success: boolean; id: number; message: string }> {
  try {
    // Save to local database first
    const result = await localDbHelpers.run(`
      INSERT INTO test_results (
        athlete_id, 
        test_id, 
        result_value, 
        result_text, 
        notes, 
        test_date, 
        input_unit, 
        is_best_record,
        is_dirty,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, datetime('now'))
    `, [
      data.athlete_id,
      data.test_id,
      data.result_value,
      data.result_text,
      data.notes,
      data.test_date,
      data.input_unit,
      data.is_best_record
    ]);

    const insertedId = result.lastInsertRowid;

    // Attempt background sync if online
    attemptBackgroundSync();

    return {
      success: true,
      id: insertedId,
      message: 'Test result saved successfully'
    };
  } catch (error) {
    console.error('❌ Error saving test result:', error);
    return {
      success: false,
      id: 0,
      message: error instanceof Error ? error.message : 'Failed to save test result'
    };
  }
}

/**
 * Update a test result
 * Offline-first: Updates local DB immediately, syncs later
 */
export async function updateTestResult(
  id: number,
  data: Partial<{
    result_value: number | null;
    result_text: string | null;
    notes: string | null;
    test_date: string;
    input_unit: string | null;
    is_best_record: boolean;
  }>
): Promise<{ success: boolean; message: string }> {
  try {
    // Build update query dynamically
    const fields = Object.keys(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => data[field as keyof typeof data]);
    
    // Update local database and mark as dirty
    await localDbHelpers.run(`
      UPDATE test_results 
      SET ${setClause}, is_dirty = TRUE, updated_at = datetime('now')
      WHERE id = ?
    `, [...values, id]);

    // Attempt background sync if online
    attemptBackgroundSync();

    return {
      success: true,
      message: 'Test result updated successfully'
    };
  } catch (error) {
    console.error('❌ Error updating test result:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update test result'
    };
  }
}

/**
 * Delete a test result
 * Offline-first: Deletes from local DB immediately, syncs later
 */
export async function deleteTestResult(id: number): Promise<{ success: boolean; message: string }> {
  try {
    // Delete from local database
    await localDbHelpers.run(`DELETE FROM test_results WHERE id = ?`, [id]);

    // Attempt background sync if online
    attemptBackgroundSync();

    return {
      success: true,
      message: 'Test result deleted successfully'
    };
  } catch (error) {
    console.error('❌ Error deleting test result:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete test result'
    };
  }
}

/**
 * Get test results for an athlete
 * Reads from local database (offline-first)
 */
export async function getTestResults(athleteId: number): Promise<any[]> {
  try {
    const results = await localDbHelpers.all(`
      SELECT 
        tr.*,
        t.name as test_name,
        t.unit as test_unit,
        fc.name as component_name
      FROM test_results tr
      JOIN tests t ON tr.test_id = t.id
      JOIN fitness_components fc ON t.component_id = fc.id
      WHERE tr.athlete_id = ?
      ORDER BY tr.test_date DESC, tr.created_at DESC
    `, [athleteId]);

    return results;
  } catch (error) {
    console.error('❌ Error getting test results:', error);
    return [];
  }
}

/**
 * Get best records for an athlete
 * Reads from local database (offline-first)
 */
export async function getBestRecords(athleteId: number): Promise<any[]> {
  try {
    const results = await localDbHelpers.all(`
      SELECT 
        tr.*,
        t.name as test_name,
        t.unit as test_unit,
        fc.name as component_name
      FROM test_results tr
      JOIN tests t ON tr.test_id = t.id
      JOIN fitness_components fc ON t.component_id = fc.id
      WHERE tr.athlete_id = ? AND tr.is_best_record = TRUE
      ORDER BY fc.name, t.name
    `, [athleteId]);

    return results;
  } catch (error) {
    console.error('❌ Error getting best records:', error);
    return [];
  }
}

/**
 * Create an enrollment request
 * Offline-first: Saves to local DB immediately, syncs later
 */
export async function createEnrollment(data: {
  athlete_id: number;
  trainer_id: number;
  notes?: string;
}): Promise<{ success: boolean; id: number; message: string }> {
  try {
    const result = await localDbHelpers.run(`
      INSERT INTO enrollments (
        athlete_id, 
        trainer_id, 
        status,
        notes,
        is_dirty,
        updated_at
      ) VALUES (?, ?, 'pending', ?, TRUE, datetime('now'))
    `, [
      data.athlete_id,
      data.trainer_id,
      data.notes || null
    ]);

    const insertedId = result.lastInsertRowid;

    // Attempt background sync if online
    attemptBackgroundSync();

    return {
      success: true,
      id: insertedId,
      message: 'Enrollment request sent successfully'
    };
  } catch (error) {
    console.error('❌ Error creating enrollment:', error);
    return {
      success: false,
      id: 0,
      message: error instanceof Error ? error.message : 'Failed to create enrollment'
    };
  }
}

/**
 * Update enrollment status (approve/reject)
 * Offline-first: Updates local DB immediately, syncs later
 */
export async function updateEnrollmentStatus(
  id: number,
  status: 'approved' | 'rejected'
): Promise<{ success: boolean; message: string }> {
  try {
    await localDbHelpers.run(`
      UPDATE enrollments 
      SET status = ?, 
          responded_at = datetime('now'),
          is_dirty = TRUE,
          updated_at = datetime('now')
      WHERE id = ?
    `, [status, id]);

    // Attempt background sync if online
    attemptBackgroundSync();

    return {
      success: true,
      message: `Enrollment ${status} successfully`
    };
  } catch (error) {
    console.error('❌ Error updating enrollment status:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update enrollment'
    };
  }
}

/**
 * Get enrollments for a trainer
 * Reads from local database (offline-first)
 */
export async function getTrainerEnrollments(trainerId: number, status?: string): Promise<any[]> {
  try {
    const query = status
      ? `SELECT e.*, u.full_name as athlete_name, u.email as athlete_email, a.sport, a.level
         FROM enrollments e
         JOIN users u ON e.athlete_id = u.id
         JOIN athletes a ON a.user_id = u.id
         WHERE e.trainer_id = ? AND e.status = ?
         ORDER BY e.requested_at DESC`
      : `SELECT e.*, u.full_name as athlete_name, u.email as athlete_email, a.sport, a.level
         FROM enrollments e
         JOIN users u ON e.athlete_id = u.id
         JOIN athletes a ON a.user_id = u.id
         WHERE e.trainer_id = ?
         ORDER BY e.requested_at DESC`;
    
    const params = status ? [trainerId, status] : [trainerId];
    const results = await localDbHelpers.all(query, params);

    return results;
  } catch (error) {
    console.error('❌ Error getting trainer enrollments:', error);
    return [];
  }
}

/**
 * Get enrollments for an athlete
 * Reads from local database (offline-first)
 */
export async function getAthleteEnrollments(athleteId: number): Promise<any[]> {
  try {
    const results = await localDbHelpers.all(`
      SELECT e.*, u.full_name as trainer_name, u.email as trainer_email, t.trainer_code, t.specialization
      FROM enrollments e
      JOIN users u ON e.trainer_id = u.id
      JOIN trainers t ON t.user_id = u.id
      WHERE e.athlete_id = ?
      ORDER BY e.requested_at DESC
    `, [athleteId]);

    return results;
  } catch (error) {
    console.error('❌ Error getting athlete enrollments:', error);
    return [];
  }
}
