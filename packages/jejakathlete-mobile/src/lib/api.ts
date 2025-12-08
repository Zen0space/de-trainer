import { tursoDbHelpers } from './turso-database';
import { verifyPassword, hashPassword } from './crypto';

// Legacy auth types for Turso-based operations (to be deprecated)
// New auth is handled by Supabase in AuthContext.tsx
interface LegacyAuthResponse {
  success: boolean;
  user?: {
    id: number | string;
    username: string | null;
    email: string;
    full_name: string | null;
    role: string;
    created_at: string;
    is_verified: boolean;
    trainer_data?: {
      trainer_code: string;
      certification_id: string | null;
      specialization: string | null;
      verification_status: string;
    };
    athlete_data?: {
      sport: string;
      level: string;
    };
  };
  token?: string;
  message?: string;
  error?: string;
}

interface LegacyLoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

interface LegacyRegisterTrainerData {
  email: string;
  password: string;
  full_name: string;
  username: string;
  role: 'trainer';
  trainer_code: string;
  certification_id?: string;
  specialization?: string;
}

interface LegacyRegisterAthleteData {
  email: string;
  password: string;
  full_name: string;
  username: string;
  role: 'athlete';
  sport: string;
  level: string;
}

type AuthResponse = LegacyAuthResponse;
type LoginCredentials = LegacyLoginCredentials;
type RegisterTrainerData = LegacyRegisterTrainerData;
type RegisterAthleteData = LegacyRegisterAthleteData;
type AuthUser = LegacyAuthResponse['user'];

// Toast notification callback (set by UI layer)
let toastCallback: ((message: string, type: 'success' | 'error' | 'warning' | 'info') => void) | null = null;

// Set toast callback for showing notifications from API layer
export function setToastCallback(callback: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void): void {
  toastCallback = callback;
}

// Clear toast callback
export function clearToastCallback(): void {
  toastCallback = null;
}

// Show toast notification if callback is set
function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
  if (toastCallback) {
    toastCallback(message, type);
  }
}

/**
 * API Layer
 * 
 * Direct connection to Turso database.
 */

// ============================================================================
// AUTHENTICATION OPERATIONS
// ============================================================================

/**
 * Login user
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const { email, username, password } = credentials;
    
    console.log('🔐 Login attempt:', { email, username, passwordLength: password?.length });
    
    // User must provide either email or username, plus password
    const identifier = email || username;
    
    if (!identifier || !password) {
      console.log('❌ Missing credentials');
      return {
        success: false,
        error: 'Email/Username and password are required'
      };
    }

    console.log('🔍 Searching for user with identifier:', identifier);

    // Find user by email OR username
    const user = await tursoDbHelpers.get(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identifier, identifier]
    );

    console.log('👤 User found:', user ? { id: user.id, email: user.email, username: user.username, hasPassword: !!user.password } : 'NOT FOUND');

    if (!user) {
      console.log('❌ No user found with identifier:', identifier);
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    console.log('🔑 Verifying password...');

    // Verify password using crypto utility
    const isPasswordValid = await verifyPassword(password, user.password);
    
    console.log('🔑 Password verification result:', { 
      isValid: isPasswordValid,
      providedPassword: password,
      storedHashFormat: user.password.substring(0, 20) + '...'
    });

    if (!isPasswordValid) {
      console.log('❌ Password verification failed');
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    console.log('✅ Login successful for user:', user.id);

    // Get role-specific data
    let userData: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at,
      is_verified: Boolean(user.is_verified)
    };

    if (user.role === 'trainer') {
      const trainerData = await tursoDbHelpers.get(
        'SELECT * FROM trainers WHERE user_id = ?',
        [user.id]
      );
      if (trainerData) {
        userData.trainer_data = {
          trainer_code: trainerData.trainer_code,
          certification_id: trainerData.certification_id,
          specialization: trainerData.specialization,
          verification_status: trainerData.verification_status
        };
      }
    } else if (user.role === 'athlete') {
      const athleteData = await tursoDbHelpers.get(
        'SELECT * FROM athletes WHERE user_id = ?',
        [user.id]
      );
      if (athleteData) {
        userData.athlete_data = {
          sport: athleteData.sport,
          level: athleteData.level
        };
      }
    }

    return {
      success: true,
      user: userData,
      token: `session_${user.id}_${Date.now()}`, // Simple session token
      message: 'Login successful'
    };
  } catch (error) {
    console.error('❌ Login error:', error);
    return {
      success: false,
      error: 'Login failed. Please try again.'
    };
  }
}

/**
 * Register user
 */
export async function registerUser(data: RegisterTrainerData | RegisterAthleteData): Promise<AuthResponse> {
  try {
    // Check if email already exists
    const existingUser = await tursoDbHelpers.get(
      'SELECT id FROM users WHERE email = ?',
      [data.email]
    );

    if (existingUser) {
      return {
        success: false,
        error: 'Email already registered'
      };
    }

    // Check if username already exists
    const existingUsername = await tursoDbHelpers.get(
      'SELECT id FROM users WHERE username = ?',
      [data.username]
    );

    if (existingUsername) {
      return {
        success: false,
        error: 'Username already taken'
      };
    }

    // Hash the password before storing
    const hashedPassword = await hashPassword(data.password);

    // Insert user
    const userResult = await tursoDbHelpers.run(`
      INSERT INTO users (
        email,
        password,
        full_name,
        role,
        username,
        is_verified
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.email,
      hashedPassword,
      data.full_name,
      data.role,
      data.username,
      false // is_verified default
    ]);

    const userId = userResult.lastInsertRowid;

    // Insert role-specific data
    if (data.role === 'trainer') {
      const trainerData = data as RegisterTrainerData;
      await tursoDbHelpers.run(`
        INSERT INTO trainers (
          user_id,
          trainer_code,
          certification_id,
          specialization,
          verification_status
        ) VALUES (?, ?, ?, ?, 'pending')
      `, [
        userId,
        trainerData.trainer_code,
        trainerData.certification_id || null,
        trainerData.specialization || null
      ]);
    } else {
      const athleteData = data as RegisterAthleteData;
      await tursoDbHelpers.run(`
        INSERT INTO athletes (
          user_id,
          sport,
          level
        ) VALUES (?, ?, ?)
      `, [
        userId,
        athleteData.sport,
        athleteData.level
      ]);
    }

    // Construct response user object
    const userData: AuthUser = {
      id: userId,
      username: data.username,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      created_at: new Date().toISOString(),
      is_verified: false
    };

    if (data.role === 'trainer') {
      const trainerData = data as RegisterTrainerData;
      userData.trainer_data = {
        trainer_code: trainerData.trainer_code,
        certification_id: trainerData.certification_id ?? null,
        specialization: trainerData.specialization ?? null,
        verification_status: 'pending'
      };
    } else {
      const athleteData = data as RegisterAthleteData;
      userData.athlete_data = {
        sport: athleteData.sport,
        level: athleteData.level
      };
    }

    return {
      success: true,
      user: userData,
      token: `session_${userId}_${Date.now()}`,
      message: 'Registration successful'
    };
  } catch (error) {
    console.error('❌ Registration error:', error);
    return {
      success: false,
      error: 'Registration failed. Please try again.'
    };
  }
}

/**
 * Refresh user data
 */
export async function refreshUserData(userId: number): Promise<AuthResponse> {
  try {
    const user = await tursoDbHelpers.get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    let userData: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at,
      is_verified: Boolean(user.is_verified)
    };

    if (user.role === 'trainer') {
      const trainerData = await tursoDbHelpers.get(
        'SELECT * FROM trainers WHERE user_id = ?',
        [user.id]
      );
      if (trainerData) {
        userData.trainer_data = {
          trainer_code: trainerData.trainer_code,
          certification_id: trainerData.certification_id,
          specialization: trainerData.specialization,
          verification_status: trainerData.verification_status
        };
      }
    } else if (user.role === 'athlete') {
      const athleteData = await tursoDbHelpers.get(
        'SELECT * FROM athletes WHERE user_id = ?',
        [user.id]
      );
      if (athleteData) {
        userData.athlete_data = {
          sport: athleteData.sport,
          level: athleteData.level
        };
      }
    }

    return {
      success: true,
      user: userData,
      message: 'User data refreshed'
    };
  } catch (error) {
    console.error('❌ Refresh user error:', error);
    return {
      success: false,
      error: 'Failed to refresh user data'
    };
  }
}

/**
 * Delete user and all related data (CASCADE)
 * This will automatically delete:
 * - Trainer/Athlete profile
 * - Enrollments
 * - Test results
 * - Body metrics
 * - Notifications
 * - Workout templates and assignments
 * - Events and event participations
 * - Event reminders and results
 */
export async function deleteUser(userId: number): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🗑️ Deleting user:', userId);
    
    // Check if user exists
    const user = await tursoDbHelpers.get(
      'SELECT id, email, full_name, role FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    console.log('👤 Deleting user:', { id: user.id, email: user.email, role: user.role });

    // Delete user (CASCADE will handle all related records)
    const result = await tursoDbHelpers.run(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    if (result.changes > 0) {
      console.log('✅ User deleted successfully:', userId);
      return {
        success: true,
        message: `User ${user.full_name} and all related data deleted successfully`
      };
    } else {
      return {
        success: false,
        message: 'Failed to delete user'
      };
    }
  } catch (error) {
    console.error('❌ Delete user error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete user'
    };
  }
}

/**
 * Create a test result (training log entry)
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
    const result = await tursoDbHelpers.run(`
      INSERT INTO test_results (
        athlete_id,
        test_id,
        result_value,
        result_text,
        notes,
        test_date,
        input_unit,
        is_best_record
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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

    return {
      success: true,
      id: result.lastInsertRowid,
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
    
    await tursoDbHelpers.run(`
      UPDATE test_results
      SET ${setClause}
      WHERE id = ?
    `, [...values, id]);

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
 */
export async function deleteTestResult(id: number): Promise<{ success: boolean; message: string }> {
  try {
    await tursoDbHelpers.run(`DELETE FROM test_results WHERE id = ?`, [id]);

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
 */
export async function getTestResults(athleteId: number): Promise<any[]> {
  try {
    const results = await tursoDbHelpers.all(`
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
 */
export async function getBestRecords(athleteId: number): Promise<any[]> {
  try {
    const results = await tursoDbHelpers.all(`
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
 */
export async function createEnrollment(data: {
  athlete_id: number;
  trainer_id: number;
  notes?: string;
}): Promise<{ success: boolean; id: number; message: string }> {
  try {
    const result = await tursoDbHelpers.run(`
      INSERT INTO enrollments (
        athlete_id,
        trainer_id,
        status,
        notes
      ) VALUES (?, ?, 'pending', ?)
    `, [
      data.athlete_id,
      data.trainer_id,
      data.notes || null
    ]);

    return {
      success: true,
      id: result.lastInsertRowid,
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
 */
export async function updateEnrollmentStatus(
  id: number,
  status: 'approved' | 'rejected'
): Promise<{ success: boolean; message: string }> {
  try {
    await tursoDbHelpers.run(`
      UPDATE enrollments
      SET status = ?,
          responded_at = datetime('now')
      WHERE id = ?
    `, [status, id]);

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
    const results = await tursoDbHelpers.all(query, params);

    return results;
  } catch (error) {
    console.error('❌ Error getting trainer enrollments:', error);
    return [];
  }
}

/**
 * Get enrollments for an athlete
 */
export async function getAthleteEnrollments(athleteId: number): Promise<any[]> {
  try {
    const results = await tursoDbHelpers.all(`
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

// ============================================================================
// WORKOUT TEMPLATE OPERATIONS
// ============================================================================

/**
 * Create a workout template with exercises
 */
export async function createWorkoutTemplate(data: {
  trainer_id: number;
  name: string;
  description?: string;
  exercises: Array<{
    exercise_id: number;
    order_index: number;
    sets: number;
    reps: number;
    rest_time: number;
  }>;
}): Promise<{ success: boolean; id: number; message: string }> {
  try {
    // Validate workout name
    if (!data.name || data.name.trim().length < 3) {
      return {
        success: false,
        id: 0,
        message: 'Workout name must be at least 3 characters'
      };
    }

    if (data.name.length > 100) {
      return {
        success: false,
        id: 0,
        message: 'Workout name must be less than 100 characters'
      };
    }

    // Validate at least one exercise
    if (!data.exercises || data.exercises.length === 0) {
      return {
        success: false,
        id: 0,
        message: 'Add at least one exercise to the workout'
      };
    }

    // Insert workout template
    const result = await tursoDbHelpers.run(`
      INSERT INTO workout_templates (
        trainer_id,
        name,
        description,
        updated_at
      ) VALUES (?, ?, ?, datetime('now'))
    `, [
      data.trainer_id,
      data.name.trim(),
      data.description?.trim() || null
    ]);

    const workoutTemplateId = result.lastInsertRowid;

    // Insert workout exercises
    for (const exercise of data.exercises) {
      await tursoDbHelpers.run(`
        INSERT INTO workout_exercises (
          workout_template_id,
          exercise_id,
          order_index,
          sets,
          reps,
          rest_time,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        workoutTemplateId,
        exercise.exercise_id,
        exercise.order_index,
        exercise.sets,
        exercise.reps,
        exercise.rest_time
      ]);
    }

    return {
      success: true,
      id: workoutTemplateId,
      message: 'Workout template created successfully'
    };
  } catch (error) {
    console.error('❌ Error creating workout template:', error);
    return {
      success: false,
      id: 0,
      message: error instanceof Error ? error.message : 'Failed to create workout template'
    };
  }
}

/**
 * Update a workout template
 */
export async function updateWorkoutTemplate(
  id: number,
  trainerId: number,
  data: {
    name?: string;
    description?: string;
    exercises?: Array<{
      exercise_id: number;
      order_index: number;
      sets: number;
      reps: number;
      rest_time: number;
    }>;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify template belongs to trainer
    const template = await tursoDbHelpers.get(
      'SELECT id, trainer_id FROM workout_templates WHERE id = ?',
      [id]
    );

    if (!template) {
      return {
        success: false,
        message: 'Workout template not found'
      };
    }

    if (template.trainer_id !== trainerId) {
      return {
        success: false,
        message: 'Unauthorized: Template does not belong to this trainer'
      };
    }

    // Validate workout name if provided
    if (data.name !== undefined) {
      if (data.name.trim().length < 3) {
        return {
          success: false,
          message: 'Workout name must be at least 3 characters'
        };
      }

      if (data.name.length > 100) {
        return {
          success: false,
          message: 'Workout name must be less than 100 characters'
        };
      }
    }

    // Update template metadata if provided
    if (data.name !== undefined || data.description !== undefined) {
      const updates: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name.trim());
      }

      if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description?.trim() || null);
      }

      updates.push('updated_at = datetime(\'now\')');
      params.push(id);

      await tursoDbHelpers.run(
        `UPDATE workout_templates SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    // Update exercises if provided
    if (data.exercises !== undefined) {
      if (data.exercises.length === 0) {
        return {
          success: false,
          message: 'Add at least one exercise to the workout'
        };
      }

      // Delete existing exercises
      await tursoDbHelpers.run(
        'DELETE FROM workout_exercises WHERE workout_template_id = ?',
        [id]
      );

      // Insert new exercises
      for (const exercise of data.exercises) {
        await tursoDbHelpers.run(`
          INSERT INTO workout_exercises (
            workout_template_id,
            exercise_id,
            order_index,
            sets,
            reps,
            rest_time,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          id,
          exercise.exercise_id,
          exercise.order_index,
          exercise.sets,
          exercise.reps,
          exercise.rest_time
        ]);
      }
    }

    return {
      success: true,
      message: 'Workout template updated successfully'
    };
  } catch (error) {
    console.error('❌ Error updating workout template:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update workout template'
    };
  }
}

/**
 * Delete a workout template
 */
export async function deleteWorkoutTemplate(
  id: number,
  trainerId: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify template belongs to trainer
    const template = await tursoDbHelpers.get(
      'SELECT id, trainer_id FROM workout_templates WHERE id = ?',
      [id]
    );

    if (!template) {
      return {
        success: false,
        message: 'Workout template not found'
      };
    }

    if (template.trainer_id !== trainerId) {
      return {
        success: false,
        message: 'Unauthorized: Template does not belong to this trainer'
      };
    }

    // Delete template (cascade will delete workout_exercises)
    await tursoDbHelpers.run(
      'DELETE FROM workout_templates WHERE id = ?',
      [id]
    );

    return {
      success: true,
      message: 'Workout template deleted successfully'
    };
  } catch (error) {
    console.error('❌ Error deleting workout template:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete workout template'
    };
  }
}

/**
 * Get all workout templates for a trainer
 */
export async function getWorkoutTemplates(trainerId: number): Promise<any[]> {
  try {
    const templates = await tursoDbHelpers.all(`
      SELECT 
        wt.*,
        COUNT(we.id) as exercise_count
      FROM workout_templates wt
      LEFT JOIN workout_exercises we ON wt.id = we.workout_template_id
      WHERE wt.trainer_id = ?
      GROUP BY wt.id
      ORDER BY wt.created_at DESC
    `, [trainerId]);

    return templates;
  } catch (error) {
    console.error('❌ Error getting workout templates:', error);
    return [];
  }
}

/**
 * Get a workout template by ID with exercises
 */
export async function getWorkoutTemplateById(
  id: number,
  trainerId?: number
): Promise<any | null> {
  try {
    // Get template
    const template = await tursoDbHelpers.get(`
      SELECT * FROM workout_templates WHERE id = ?
    `, [id]);

    if (!template) {
      return null;
    }

    // Verify ownership if trainerId provided
    if (trainerId !== undefined && template.trainer_id !== trainerId) {
      return null;
    }

    // Get exercises with details
    const exercises = await tursoDbHelpers.all(`
      SELECT 
        we.*,
        e.name as exercise_name,
        e.muscle_group
      FROM workout_exercises we
      JOIN exercises e ON we.exercise_id = e.id
      WHERE we.workout_template_id = ?
      ORDER BY we.order_index ASC
    `, [id]);

    return {
      ...template,
      exercises
    };
  } catch (error) {
    console.error('❌ Error getting workout template by ID:', error);
    return null;
  }
}

// ============================================================================
// EXERCISE LIBRARY OPERATIONS
// ============================================================================

/**
 * Get exercises with optional search and muscle group filter
 */
export async function getExercises(options?: {
  search?: string;
  muscleGroup?: string;
}): Promise<any[]> {
  try {
    let query = 'SELECT * FROM exercises WHERE 1=1';
    const params: any[] = [];

    // Add search filter
    if (options?.search && options.search.trim().length > 0) {
      query += ' AND name LIKE ?';
      params.push(`%${options.search.trim()}%`);
    }

    // Add muscle group filter
    if (options?.muscleGroup && options.muscleGroup !== 'all') {
      query += ' AND muscle_group = ?';
      params.push(options.muscleGroup);
    }

    query += ' ORDER BY name ASC';

    const exercises = await tursoDbHelpers.all(query, params);
    return exercises;
  } catch (error) {
    console.error('❌ Error getting exercises:', error);
    return [];
  }
}

/**
 * Get exercises by muscle group
 */
export async function getExercisesByMuscleGroup(muscleGroup: string): Promise<any[]> {
  try {
    const exercises = await tursoDbHelpers.all(`
      SELECT * FROM exercises 
      WHERE muscle_group = ?
      ORDER BY name ASC
    `, [muscleGroup]);

    return exercises;
  } catch (error) {
    console.error('❌ Error getting exercises by muscle group:', error);
    return [];
  }
}

// ============================================================================
// WORKOUT ASSIGNMENT OPERATIONS
// ============================================================================

/**
 * Create workout assignments for multiple athletes
 */
export async function createWorkoutAssignment(data: {
  workout_template_id: number;
  athlete_ids: number[];
  trainer_id: number;
  scheduled_date: string;
}): Promise<{ success: boolean; ids: number[]; message: string }> {
  try {
    // Validate inputs
    if (!data.athlete_ids || data.athlete_ids.length === 0) {
      return {
        success: false,
        ids: [],
        message: 'Select at least one athlete'
      };
    }

    // Validate scheduled date is not in the past
    const scheduledDate = new Date(data.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (scheduledDate < today) {
      return {
        success: false,
        ids: [],
        message: 'Scheduled date cannot be in the past'
      };
    }

    // Verify workout template exists and belongs to trainer
    const template = await tursoDbHelpers.get(
      'SELECT id, trainer_id FROM workout_templates WHERE id = ?',
      [data.workout_template_id]
    );

    if (!template) {
      return {
        success: false,
        ids: [],
        message: 'Workout template not found'
      };
    }

    if (template.trainer_id !== data.trainer_id) {
      return {
        success: false,
        ids: [],
        message: 'Unauthorized: Template does not belong to this trainer'
      };
    }

    // Verify athletes are enrolled with approved status
    const enrolledAthletes = await tursoDbHelpers.all(`
      SELECT athlete_id 
      FROM enrollments 
      WHERE trainer_id = ? 
        AND athlete_id IN (${data.athlete_ids.map(() => '?').join(',')})
        AND status = 'approved'
    `, [data.trainer_id, ...data.athlete_ids]);

    const enrolledAthleteIds = enrolledAthletes.map((e: any) => e.athlete_id);
    const invalidAthleteIds = data.athlete_ids.filter(id => !enrolledAthleteIds.includes(id));

    if (invalidAthleteIds.length > 0) {
      return {
        success: false,
        ids: [],
        message: 'Some athletes are not enrolled or approved'
      };
    }

    // Create assignments for each athlete
    const assignmentIds: number[] = [];
    for (const athleteId of data.athlete_ids) {
      const result = await tursoDbHelpers.run(`
        INSERT INTO workout_assignments (
          workout_template_id,
          athlete_id,
          trainer_id,
          scheduled_date,
          status,
          updated_at
        ) VALUES (?, ?, ?, ?, 'pending', datetime('now'))
      `, [
        data.workout_template_id,
        athleteId,
        data.trainer_id,
        data.scheduled_date
      ]);

      assignmentIds.push(result.lastInsertRowid);
    }

    return {
      success: true,
      ids: assignmentIds,
      message: `Workout assigned to ${data.athlete_ids.length} athlete(s) successfully`
    };
  } catch (error) {
    console.error('❌ Error creating workout assignment:', error);
    return {
      success: false,
      ids: [],
      message: error instanceof Error ? error.message : 'Failed to create workout assignment'
    };
  }
}

/**
 * Update workout assignment status
 */
export async function updateWorkoutAssignmentStatus(
  id: number,
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled',
  athleteId?: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Get current assignment
    const assignment = await tursoDbHelpers.get(
      'SELECT * FROM workout_assignments WHERE id = ?',
      [id]
    );

    if (!assignment) {
      return {
        success: false,
        message: 'Workout assignment not found'
      };
    }

    // Verify athlete ownership if athleteId provided
    if (athleteId !== undefined && assignment.athlete_id !== athleteId) {
      return {
        success: false,
        message: 'Unauthorized: Assignment does not belong to this athlete'
      };
    }

    // Build update query based on status
    const updates: string[] = ['status = ?'];
    const params: any[] = [status];

    if (status === 'in_progress' && !assignment.started_at) {
      updates.push('started_at = datetime(\'now\')');
    }

    if (status === 'completed') {
      updates.push('completed_at = datetime(\'now\')');
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(id);

    await tursoDbHelpers.run(
      `UPDATE workout_assignments SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return {
      success: true,
      message: 'Workout status updated successfully'
    };
  } catch (error) {
    console.error('❌ Error updating workout assignment status:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update workout status'
    };
  }
}

/**
 * Get workout assignments for an athlete
 * @deprecated Use trpc.workouts.getMyWorkouts.query() instead
 */
export async function getWorkoutAssignments(
  athleteId: number,
  options?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<any[]> {
  console.warn('⚠️ getWorkoutAssignments is deprecated. Use tRPC workouts.getMyWorkouts instead.');
  try {
    let query = `
      SELECT 
        wa.*,
        wt.name as workout_name,
        wt.description as workout_description,
        u.full_name as trainer_name
      FROM workout_assignments wa
      JOIN workout_templates wt ON wa.workout_template_id = wt.id
      JOIN users u ON wa.trainer_id = u.id
      WHERE wa.athlete_id = ?
    `;
    const params: any[] = [athleteId];

    // Add status filter
    if (options?.status) {
      query += ' AND wa.status = ?';
      params.push(options.status);
    }

    // Add date range filters
    if (options?.startDate) {
      query += ' AND wa.scheduled_date >= ?';
      params.push(options.startDate);
    }

    if (options?.endDate) {
      query += ' AND wa.scheduled_date <= ?';
      params.push(options.endDate);
    }

    query += ' ORDER BY wa.scheduled_date DESC, wa.created_at DESC';

    const assignments = await tursoDbHelpers.all(query, params);
    return assignments;
  } catch (error) {
    console.error('❌ Error getting workout assignments:', error);
    return [];
  }
}

/**
 * Get workout assignments for a trainer with completion stats
 */
export async function getTrainerWorkoutAssignments(
  trainerId: number,
  options?: {
    athleteId?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<any[]> {
  try {
    let query = `
      SELECT 
        wa.*,
        wt.name as workout_name,
        wt.description as workout_description,
        u.full_name as athlete_name,
        (
          SELECT COUNT(*)
          FROM workout_session_progress wsp
          WHERE wsp.workout_assignment_id = wa.id AND wsp.completed = TRUE
        ) as completed_sets,
        (
          SELECT COUNT(*)
          FROM workout_session_progress wsp
          WHERE wsp.workout_assignment_id = wa.id
        ) as total_sets
      FROM workout_assignments wa
      JOIN workout_templates wt ON wa.workout_template_id = wt.id
      JOIN users u ON wa.athlete_id = u.id
      WHERE wa.trainer_id = ?
    `;
    const params: any[] = [trainerId];

    // Add athlete filter
    if (options?.athleteId) {
      query += ' AND wa.athlete_id = ?';
      params.push(options.athleteId);
    }

    // Add status filter
    if (options?.status) {
      query += ' AND wa.status = ?';
      params.push(options.status);
    }

    // Add date range filters
    if (options?.startDate) {
      query += ' AND wa.scheduled_date >= ?';
      params.push(options.startDate);
    }

    if (options?.endDate) {
      query += ' AND wa.scheduled_date <= ?';
      params.push(options.endDate);
    }

    query += ' ORDER BY wa.scheduled_date DESC, wa.created_at DESC';

    const assignments = await tursoDbHelpers.all(query, params);
    return assignments;
  } catch (error) {
    console.error('❌ Error getting trainer workout assignments:', error);
    return [];
  }
}

/**
 * Reschedule a workout assignment
 */
export async function rescheduleWorkoutAssignment(
  id: number,
  trainerId: number,
  newScheduledDate: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get current assignment
    const assignment = await tursoDbHelpers.get(
      'SELECT * FROM workout_assignments WHERE id = ?',
      [id]
    );

    if (!assignment) {
      return {
        success: false,
        message: 'Workout assignment not found'
      };
    }

    // Verify trainer ownership
    if (assignment.trainer_id !== trainerId) {
      return {
        success: false,
        message: 'Unauthorized: Assignment does not belong to this trainer'
      };
    }

    // Prevent rescheduling if workout is completed
    if (assignment.status === 'completed') {
      return {
        success: false,
        message: 'Cannot reschedule a completed workout'
      };
    }

    // Validate new scheduled date is not in the past
    const scheduledDate = new Date(newScheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (scheduledDate < today) {
      return {
        success: false,
        message: 'Scheduled date cannot be in the past'
      };
    }

    // Update scheduled date
    await tursoDbHelpers.run(`
      UPDATE workout_assignments 
      SET scheduled_date = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `, [newScheduledDate, id]);

    return {
      success: true,
      message: 'Workout rescheduled successfully'
    };
  } catch (error) {
    console.error('❌ Error rescheduling workout assignment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reschedule workout assignment'
    };
  }
}

/**
 * Cancel a workout assignment
 */
export async function cancelWorkoutAssignment(
  id: number,
  trainerId: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Get current assignment
    const assignment = await tursoDbHelpers.get(
      'SELECT * FROM workout_assignments WHERE id = ?',
      [id]
    );

    if (!assignment) {
      return {
        success: false,
        message: 'Workout assignment not found'
      };
    }

    // Verify trainer ownership
    if (assignment.trainer_id !== trainerId) {
      return {
        success: false,
        message: 'Unauthorized: Assignment does not belong to this trainer'
      };
    }

    // Prevent cancellation if workout is completed
    if (assignment.status === 'completed') {
      return {
        success: false,
        message: 'Cannot cancel a completed workout'
      };
    }

    // Update status to cancelled
    await tursoDbHelpers.run(`
      UPDATE workout_assignments 
      SET status = 'cancelled',
          updated_at = datetime('now')
      WHERE id = ?
    `, [id]);

    return {
      success: true,
      message: 'Workout assignment cancelled successfully'
    };
  } catch (error) {
    console.error('❌ Error cancelling workout assignment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel workout assignment'
    };
  }
}

// ============================================================================
// WORKOUT SESSION PROGRESS OPERATIONS
// ============================================================================

/**
 * Create or update session progress for a set
 */
export async function createSessionProgress(data: {
  workout_assignment_id: number;
  workout_exercise_id: number;
  set_number: number;
  completed: boolean;
  athlete_id: number;
}): Promise<{ success: boolean; id: number; message: string }> {
  try {
    // Verify assignment belongs to athlete
    const assignment = await tursoDbHelpers.get(
      'SELECT id, athlete_id, status FROM workout_assignments WHERE id = ?',
      [data.workout_assignment_id]
    );

    if (!assignment) {
      return {
        success: false,
        id: 0,
        message: 'Workout assignment not found'
      };
    }

    if (assignment.athlete_id !== data.athlete_id) {
      return {
        success: false,
        id: 0,
        message: 'Unauthorized: Assignment does not belong to this athlete'
      };
    }

    // Check if progress record already exists
    const existingProgress = await tursoDbHelpers.get(`
      SELECT id FROM workout_session_progress
      WHERE workout_assignment_id = ?
        AND workout_exercise_id = ?
        AND set_number = ?
    `, [
      data.workout_assignment_id,
      data.workout_exercise_id,
      data.set_number
    ]);

    let progressId: number;

    if (existingProgress) {
      // Update existing progress
      await tursoDbHelpers.run(`
        UPDATE workout_session_progress
        SET completed = ?,
            completed_at = CASE WHEN ? = TRUE THEN datetime('now') ELSE NULL END,
            updated_at = datetime('now')
        WHERE id = ?
      `, [data.completed, data.completed, existingProgress.id]);

      progressId = existingProgress.id;
    } else {
      // Create new progress record
      const result = await tursoDbHelpers.run(`
        INSERT INTO workout_session_progress (
          workout_assignment_id,
          workout_exercise_id,
          set_number,
          completed,
          completed_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [
        data.workout_assignment_id,
        data.workout_exercise_id,
        data.set_number,
        data.completed,
        data.completed ? new Date().toISOString() : null
      ]);

      progressId = result.lastInsertRowid;
    }

    // Update assignment status to in_progress if this is the first set
    if (data.completed && assignment.status === 'pending') {
      await updateWorkoutAssignmentStatus(
        data.workout_assignment_id,
        'in_progress',
        data.athlete_id
      );
    }

    return {
      success: true,
      id: progressId,
      message: 'Progress saved successfully'
    };
  } catch (error) {
    console.error('❌ Error creating session progress:', error);
    return {
      success: false,
      id: 0,
      message: error instanceof Error ? error.message : 'Failed to save progress'
    };
  }
}

/**
 * Get session progress for a workout assignment
 */
export async function getSessionProgress(
  workoutAssignmentId: number,
  athleteId?: number
): Promise<any[]> {
  try {
    // Verify assignment belongs to athlete if athleteId provided
    if (athleteId !== undefined) {
      const assignment = await tursoDbHelpers.get(
        'SELECT athlete_id FROM workout_assignments WHERE id = ?',
        [workoutAssignmentId]
      );

      if (!assignment || assignment.athlete_id !== athleteId) {
        return [];
      }
    }

    const progress = await tursoDbHelpers.all(`
      SELECT 
        wsp.*,
        we.exercise_id,
        we.sets,
        we.reps,
        we.rest_time,
        we.order_index,
        e.name as exercise_name,
        e.muscle_group
      FROM workout_session_progress wsp
      JOIN workout_exercises we ON wsp.workout_exercise_id = we.id
      JOIN exercises e ON we.exercise_id = e.id
      WHERE wsp.workout_assignment_id = ?
      ORDER BY we.order_index ASC, wsp.set_number ASC
    `, [workoutAssignmentId]);

    return progress;
  } catch (error) {
    console.error('❌ Error getting session progress:', error);
    return [];
  }
}

/**
 * Complete a workout session
 */
export async function completeWorkoutSession(
  workoutAssignmentId: number,
  athleteId: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify assignment belongs to athlete
    const assignment = await tursoDbHelpers.get(
      'SELECT id, athlete_id, workout_template_id, status FROM workout_assignments WHERE id = ?',
      [workoutAssignmentId]
    );

    if (!assignment) {
      return {
        success: false,
        message: 'Workout assignment not found'
      };
    }

    if (assignment.athlete_id !== athleteId) {
      return {
        success: false,
        message: 'Unauthorized: Assignment does not belong to this athlete'
      };
    }

    // Get all exercises for this workout
    const exercises = await tursoDbHelpers.all(`
      SELECT id, sets FROM workout_exercises
      WHERE workout_template_id = ?
      ORDER BY order_index ASC
    `, [assignment.workout_template_id]);

    // Create progress records for all sets if they don't exist
    for (const exercise of exercises) {
      for (let setNum = 1; setNum <= exercise.sets; setNum++) {
        const existingProgress = await tursoDbHelpers.get(`
          SELECT id FROM workout_session_progress
          WHERE workout_assignment_id = ?
            AND workout_exercise_id = ?
            AND set_number = ?
        `, [workoutAssignmentId, exercise.id, setNum]);

        if (!existingProgress) {
          await tursoDbHelpers.run(`
            INSERT INTO workout_session_progress (
              workout_assignment_id,
              workout_exercise_id,
              set_number,
              completed,
              completed_at,
              updated_at
            ) VALUES (?, ?, ?, TRUE, datetime('now'), datetime('now'))
          `, [workoutAssignmentId, exercise.id, setNum]);
        } else {
          // Mark existing incomplete sets as complete
          await tursoDbHelpers.run(`
            UPDATE workout_session_progress
            SET completed = TRUE,
                completed_at = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ? AND completed = FALSE
          `, [existingProgress.id]);
        }
      }
    }

    // Update assignment status to completed
    await updateWorkoutAssignmentStatus(
      workoutAssignmentId,
      'completed',
      athleteId
    );

    return {
      success: true,
      message: 'Workout completed successfully'
    };
  } catch (error) {
    console.error('❌ Error completing workout session:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to complete workout'
    };
  }
}