/**
 * Phase 3 Migration: Workout Management
 * 
 * Migrates workout-related data from Turso (SQLite) to Supabase (PostgreSQL):
 * - workout_templates
 * - exercises
 * - workout_exercises
 * - workout_assignments
 * - workout_session_progress
 * 
 * Requirements: 13.3
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin operations
);

interface MigrationResult {
  success: boolean;
  message: string;
  stats: {
    exercises: number;
    workout_templates: number;
    workout_exercises: number;
    workout_assignments: number;
    workout_session_progress: number;
  };
  errors: string[];
}

/**
 * Main migration function for Phase 3
 */
export async function migratePhase3Workouts(
  tursoData: {
    exercises: any[];
    workout_templates: any[];
    workout_exercises: any[];
    workout_assignments: any[];
    workout_session_progress: any[];
  }
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    message: '',
    stats: {
      exercises: 0,
      workout_templates: 0,
      workout_exercises: 0,
      workout_assignments: 0,
      workout_session_progress: 0,
    },
    errors: [],
  };

  console.log('Starting Phase 3 migration: Workout Management');

  try {
    // Step 1: Migrate exercises
    console.log('Migrating exercises...');
    const exercisesResult = await migrateExercises(tursoData.exercises);
    result.stats.exercises = exercisesResult.count;
    if (exercisesResult.errors.length > 0) {
      result.errors.push(...exercisesResult.errors);
    }

    // Step 2: Migrate workout templates
    console.log('Migrating workout templates...');
    const templatesResult = await migrateWorkoutTemplates(tursoData.workout_templates);
    result.stats.workout_templates = templatesResult.count;
    if (templatesResult.errors.length > 0) {
      result.errors.push(...templatesResult.errors);
    }

    // Step 3: Migrate workout exercises
    console.log('Migrating workout exercises...');
    const workoutExercisesResult = await migrateWorkoutExercises(tursoData.workout_exercises);
    result.stats.workout_exercises = workoutExercisesResult.count;
    if (workoutExercisesResult.errors.length > 0) {
      result.errors.push(...workoutExercisesResult.errors);
    }

    // Step 4: Migrate workout assignments
    console.log('Migrating workout assignments...');
    const assignmentsResult = await migrateWorkoutAssignments(tursoData.workout_assignments);
    result.stats.workout_assignments = assignmentsResult.count;
    if (assignmentsResult.errors.length > 0) {
      result.errors.push(...assignmentsResult.errors);
    }

    // Step 5: Migrate workout session progress
    console.log('Migrating workout session progress...');
    const progressResult = await migrateWorkoutSessionProgress(tursoData.workout_session_progress);
    result.stats.workout_session_progress = progressResult.count;
    if (progressResult.errors.length > 0) {
      result.errors.push(...progressResult.errors);
    }

    // Verify data integrity
    console.log('Verifying data integrity...');
    const integrityCheck = await verifyDataIntegrity(tursoData, result.stats);
    if (!integrityCheck.success) {
      result.errors.push(...integrityCheck.errors);
      result.success = false;
    }

    if (result.errors.length === 0) {
      result.message = 'Phase 3 migration completed successfully';
    } else {
      result.success = false;
      result.message = `Phase 3 migration completed with ${result.errors.length} errors`;
    }

    console.log('Phase 3 migration summary:', result.stats);
    return result;
  } catch (error) {
    console.error('Phase 3 migration failed:', error);
    result.success = false;
    result.message = `Phase 3 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

/**
 * Migrate exercises table
 */
async function migrateExercises(exercises: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const exercise of exercises) {
    try {
      const { error } = await supabase.from('exercises').upsert({
        id: exercise.id,
        name: exercise.name,
        description: exercise.description,
        muscle_group: exercise.muscle_group,
        equipment: exercise.equipment,
        difficulty_level: exercise.difficulty_level,
        video_url: exercise.video_url,
        created_at: exercise.created_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Exercise ${exercise.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Exercise ${exercise.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Migrate workout_templates table
 */
async function migrateWorkoutTemplates(templates: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const template of templates) {
    try {
      const { error } = await supabase.from('workout_templates').upsert({
        id: template.id,
        trainer_id: template.trainer_id,
        name: template.name,
        description: template.description,
        created_at: template.created_at,
        updated_at: template.updated_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Workout template ${template.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Workout template ${template.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Migrate workout_exercises table
 */
async function migrateWorkoutExercises(workoutExercises: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const we of workoutExercises) {
    try {
      const { error } = await supabase.from('workout_exercises').upsert({
        id: we.id,
        workout_template_id: we.workout_template_id,
        exercise_id: we.exercise_id,
        order_index: we.order_index,
        sets: we.sets,
        reps: we.reps,
        rest_time: we.rest_time,
        notes: we.notes,
        created_at: we.created_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Workout exercise ${we.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Workout exercise ${we.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Migrate workout_assignments table
 */
async function migrateWorkoutAssignments(assignments: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const assignment of assignments) {
    try {
      const { error } = await supabase.from('workout_assignments').upsert({
        id: assignment.id,
        workout_template_id: assignment.workout_template_id,
        athlete_id: assignment.athlete_id,
        trainer_id: assignment.trainer_id,
        scheduled_date: assignment.scheduled_date,
        status: assignment.status,
        started_at: assignment.started_at,
        completed_at: assignment.completed_at,
        notes: assignment.notes,
        created_at: assignment.created_at,
        updated_at: assignment.updated_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Workout assignment ${assignment.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Workout assignment ${assignment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Migrate workout_session_progress table
 */
async function migrateWorkoutSessionProgress(progressRecords: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const progress of progressRecords) {
    try {
      const { error } = await supabase.from('workout_session_progress').upsert({
        id: progress.id,
        workout_assignment_id: progress.workout_assignment_id,
        workout_exercise_id: progress.workout_exercise_id,
        set_number: progress.set_number,
        reps_completed: progress.reps_completed,
        weight_used: progress.weight_used,
        completed: progress.completed,
        completed_at: progress.completed_at,
        notes: progress.notes,
        created_at: progress.created_at,
        updated_at: progress.updated_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Workout session progress ${progress.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Workout session progress ${progress.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Verify data integrity after migration
 */
async function verifyDataIntegrity(
  tursoData: any,
  stats: MigrationResult['stats']
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Verify record counts match
  if (stats.exercises !== tursoData.exercises.length) {
    errors.push(`Exercise count mismatch: Expected ${tursoData.exercises.length}, got ${stats.exercises}`);
  }

  if (stats.workout_templates !== tursoData.workout_templates.length) {
    errors.push(`Workout template count mismatch: Expected ${tursoData.workout_templates.length}, got ${stats.workout_templates}`);
  }

  if (stats.workout_exercises !== tursoData.workout_exercises.length) {
    errors.push(`Workout exercise count mismatch: Expected ${tursoData.workout_exercises.length}, got ${stats.workout_exercises}`);
  }

  if (stats.workout_assignments !== tursoData.workout_assignments.length) {
    errors.push(`Workout assignment count mismatch: Expected ${tursoData.workout_assignments.length}, got ${stats.workout_assignments}`);
  }

  if (stats.workout_session_progress !== tursoData.workout_session_progress.length) {
    errors.push(`Workout session progress count mismatch: Expected ${tursoData.workout_session_progress.length}, got ${stats.workout_session_progress}`);
  }

  // Sample verification: Check a few random records
  if (tursoData.workout_templates.length > 0) {
    const sampleTemplate = tursoData.workout_templates[0];
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('id', sampleTemplate.id)
      .single();

    if (error || !data) {
      errors.push(`Sample workout template verification failed: ${error?.message || 'Not found'}`);
    } else {
      // Verify key fields match
      if (data.name !== sampleTemplate.name) {
        errors.push(`Workout template ${sampleTemplate.id} name mismatch`);
      }
      if (data.trainer_id !== sampleTemplate.trainer_id) {
        errors.push(`Workout template ${sampleTemplate.id} trainer_id mismatch`);
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Example usage:
 * 
 * // Load data from Turso
 * const tursoData = {
 *   exercises: await tursoDb.query('SELECT * FROM exercises'),
 *   workout_templates: await tursoDb.query('SELECT * FROM workout_templates'),
 *   workout_exercises: await tursoDb.query('SELECT * FROM workout_exercises'),
 *   workout_assignments: await tursoDb.query('SELECT * FROM workout_assignments'),
 *   workout_session_progress: await tursoDb.query('SELECT * FROM workout_session_progress'),
 * };
 * 
 * // Run migration
 * const result = await migratePhase3Workouts(tursoData);
 * console.log(result);
 */
