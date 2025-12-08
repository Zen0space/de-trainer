import { z } from 'zod';
import { router, trainerProcedure, athleteProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { verifyTrainerAthleteAccess } from '../utils/authorization';

// ============================================================================
// Input Schemas
// ============================================================================

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  exercises: z.array(
    z.object({
      exercise_id: z.number(),
      order_index: z.number(),
      sets: z.number().min(1),
      reps: z.number().min(1),
      rest_time: z.number().min(0),
      notes: z.string().optional(),
    })
  ).min(1, 'At least one exercise is required'),
});

const updateTemplateSchema = z.object({
  template_id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  exercises: z.array(
    z.object({
      exercise_id: z.number(),
      order_index: z.number(),
      sets: z.number().min(1),
      reps: z.number().min(1),
      rest_time: z.number().min(0),
      notes: z.string().optional(),
    })
  ).optional(),
});

const assignWorkoutSchema = z.object({
  template_id: z.number(),
  athlete_id: z.string(),
  scheduled_date: z.string(),
  notes: z.string().optional(),
});

// ============================================================================
// Workouts Router
// ============================================================================

export const workoutsRouter = router({
  /**
   * Create a new workout template with exercises (trainer only)
   * Requirements: 7.1, 7.2
   */
  createTemplate: trainerProcedure
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Insert workout template
        const { data: template, error: templateError } = await ctx.supabase
          .from('workout_templates')
          .insert({
            trainer_id: ctx.user.id,
            name: input.name,
            description: input.description || null,
          })
          .select()
          .single();

        if (templateError || !template) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create workout template',
          });
        }

        // Insert workout exercises
        const exercisesToInsert = input.exercises.map((exercise) => ({
          workout_template_id: template.id,
          exercise_id: exercise.exercise_id,
          order_index: exercise.order_index,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_time: exercise.rest_time,
          notes: exercise.notes || null,
        }));

        const { error: exercisesError } = await ctx.supabase
          .from('workout_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) {
          // Rollback: delete the template
          await ctx.supabase
            .from('workout_templates')
            .delete()
            .eq('id', template.id);

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to add exercises to template',
          });
        }

        // Fetch the complete template with exercises
        const { data: completeTemplate, error: fetchError } = await ctx.supabase
          .from('workout_templates')
          .select(`
            *,
            exercises:workout_exercises(
              *,
              exercise:exercises(*)
            )
          `)
          .eq('id', template.id)
          .single();

        if (fetchError || !completeTemplate) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch created template',
          });
        }

        return completeTemplate;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error creating workout template:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * List all templates for the authenticated trainer
   * Requirements: 7.5
   */
  listMyTemplates: trainerProcedure.query(async ({ ctx }) => {
    try {
      const { data: templates, error } = await ctx.supabase
        .from('workout_templates')
        .select(`
          *,
          exercises:workout_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq('trainer_id', ctx.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch workout templates',
        });
      }

      // Sort exercises by order_index
      const templatesWithSortedExercises = templates.map((template) => ({
        ...template,
        exercises: template.exercises.sort((a: any, b: any) => a.order_index - b.order_index),
      }));

      return templatesWithSortedExercises;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('Error fetching workout templates:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }),

  /**
   * Update an existing workout template
   * Requirements: 7.1, 7.2, 7.4
   */
  updateTemplate: trainerProcedure
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const { data: existingTemplate, error: fetchError } = await ctx.supabase
          .from('workout_templates')
          .select('trainer_id')
          .eq('id', input.template_id)
          .single();

        if (fetchError || !existingTemplate) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workout template not found',
          });
        }

        if (existingTemplate.trainer_id !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update your own templates',
          });
        }

        // Update template basic info if provided
        if (input.name || input.description !== undefined) {
          const updateData: any = {};
          if (input.name) updateData.name = input.name;
          if (input.description !== undefined) updateData.description = input.description;

          const { error: updateError } = await ctx.supabase
            .from('workout_templates')
            .update(updateData)
            .eq('id', input.template_id);

          if (updateError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to update workout template',
            });
          }
        }

        // Update exercises if provided
        if (input.exercises) {
          // Delete existing exercises
          const { error: deleteError } = await ctx.supabase
            .from('workout_exercises')
            .delete()
            .eq('workout_template_id', input.template_id);

          if (deleteError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to update exercises',
            });
          }

          // Insert new exercises
          const exercisesToInsert = input.exercises.map((exercise) => ({
            workout_template_id: input.template_id,
            exercise_id: exercise.exercise_id,
            order_index: exercise.order_index,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_time: exercise.rest_time,
            notes: exercise.notes || null,
          }));

          const { error: insertError } = await ctx.supabase
            .from('workout_exercises')
            .insert(exercisesToInsert);

          if (insertError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to add exercises to template',
            });
          }
        }

        // Fetch the updated template
        const { data: updatedTemplate, error: finalFetchError } = await ctx.supabase
          .from('workout_templates')
          .select(`
            *,
            exercises:workout_exercises(
              *,
              exercise:exercises(*)
            )
          `)
          .eq('id', input.template_id)
          .single();

        if (finalFetchError || !updatedTemplate) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch updated template',
          });
        }

        // Sort exercises by order_index
        updatedTemplate.exercises = updatedTemplate.exercises.sort(
          (a: any, b: any) => a.order_index - b.order_index
        );

        return updatedTemplate;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error updating workout template:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Delete a workout template
   * Requirements: 7.5
   */
  deleteTemplate: trainerProcedure
    .input(z.object({ template_id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const { data: existingTemplate, error: fetchError } = await ctx.supabase
          .from('workout_templates')
          .select('trainer_id')
          .eq('id', input.template_id)
          .single();

        if (fetchError || !existingTemplate) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workout template not found',
          });
        }

        if (existingTemplate.trainer_id !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only delete your own templates',
          });
        }

        // Delete the template (cascade will handle exercises)
        const { error: deleteError } = await ctx.supabase
          .from('workout_templates')
          .delete()
          .eq('id', input.template_id);

        if (deleteError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete workout template',
          });
        }

        return { success: true, message: 'Template deleted successfully' };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error deleting workout template:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Assign a workout template to an athlete
   * Requirements: 7.3
   */
  assignWorkout: trainerProcedure
    .input(assignWorkoutSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log('🔵 [assignWorkout] Assigning workout:', {
          template_id: input.template_id,
          athlete_id: input.athlete_id,
          scheduled_date: input.scheduled_date,
        });

        // Verify template ownership
        const { data: template, error: templateError } = await ctx.supabase
          .from('workout_templates')
          .select('trainer_id')
          .eq('id', input.template_id)
          .single();

        if (templateError || !template) {
          console.error('❌ [assignWorkout] Template not found:', templateError);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workout template not found',
          });
        }

        if (template.trainer_id !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only assign your own templates',
          });
        }

        // Verify trainer-athlete enrollment
        const hasAccess = await verifyTrainerAthleteAccess(
          ctx.supabase,
          ctx.user.id,
          input.athlete_id
        );

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only assign workouts to your enrolled athletes',
          });
        }

        // Create workout assignment
        const { data: assignment, error: assignmentError } = await ctx.supabase
          .from('workout_assignments')
          .insert({
            workout_template_id: input.template_id,
            athlete_id: input.athlete_id,
            trainer_id: ctx.user.id,
            scheduled_date: input.scheduled_date,
            status: 'pending',
            notes: input.notes || null,
          })
          .select(`
            *,
            workout_template:workout_templates(
              *,
              exercises:workout_exercises(
                *,
                exercise:exercises(*)
              )
            ),
            athlete:users!workout_assignments_athlete_id_fkey(*)
          `)
          .single();

        if (assignmentError || !assignment) {
          console.error('❌ [assignWorkout] Failed to create assignment:', {
            code: assignmentError?.code,
            message: assignmentError?.message,
            details: assignmentError?.details,
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to assign workout: ${assignmentError?.message}`,
          });
        }

        console.log('✅ [assignWorkout] Workout assigned successfully:', assignment.id);
        return assignment;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error assigning workout:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get all available exercises (public)
   * Requirements: 7.1
   */
  getExercises: publicProcedure
    .input(
      z.object({
        muscle_group: z.string().optional(),
        difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        let query = ctx.supabase
          .from('exercises')
          .select('*')
          .order('name', { ascending: true });

        if (input?.muscle_group) {
          query = query.eq('muscle_group', input.muscle_group);
        }

        if (input?.difficulty_level) {
          query = query.eq('difficulty_level', input.difficulty_level);
        }

        const { data: exercises, error } = await query;

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch exercises',
          });
        }

        return exercises;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error fetching exercises:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get workouts assigned to the authenticated athlete
   * Requirements: 8.1
   */
  getMyWorkouts: athleteProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'in_progress', 'completed', 'skipped', 'cancelled']).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        console.log('🔵 [getMyWorkouts] Fetching workouts for athlete:', ctx.user.id, 'status:', input?.status);

        let query = ctx.supabase
          .from('workout_assignments')
          .select(`
            *,
            workout_template:workout_templates(
              *,
              exercises:workout_exercises(
                *,
                exercise:exercises(*)
              )
            ),
            trainer:users!workout_assignments_trainer_id_fkey(*)
          `)
          .eq('athlete_id', ctx.user.id)
          .order('scheduled_date', { ascending: false });

        if (input?.status) {
          query = query.eq('status', input.status);
        }

        const { data: assignments, error } = await query;

        if (error) {
          console.error('❌ [getMyWorkouts] Supabase error:', {
            code: error.code,
            message: error.message,
            details: error.details,
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to fetch workouts: ${error.message}`,
          });
        }

        console.log('✅ [getMyWorkouts] Found', assignments.length, 'workout assignments');

        // Calculate completion percentage for each assignment
        const assignmentsWithProgress = await Promise.all(
          assignments.map(async (assignment: any) => {
            const { data: progress } = await ctx.supabase
              .from('workout_session_progress')
              .select('*')
              .eq('workout_assignment_id', assignment.id);

            // Calculate total sets from template
            const totalSets = assignment.workout_template?.exercises?.reduce(
              (sum: number, ex: any) => sum + ex.sets,
              0
            ) || 0;

            // Count completed sets
            const completedSets = progress?.filter((p: any) => p.completed).length || 0;

            const completion_percentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

            // Sort exercises by order_index
            if (assignment.workout_template?.exercises) {
              assignment.workout_template.exercises = assignment.workout_template.exercises.sort(
                (a: any, b: any) => a.order_index - b.order_index
              );
            }

            return {
              ...assignment,
              completion_percentage,
            };
          })
        );

        return assignmentsWithProgress;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error fetching athlete workouts:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get detailed information about a specific workout assignment
   * Requirements: 8.1, 8.2
   */
  getWorkoutDetail: athleteProcedure
    .input(z.object({ assignment_id: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        // Fetch assignment with template and exercises
        const { data: assignment, error: assignmentError } = await ctx.supabase
          .from('workout_assignments')
          .select(`
            *,
            workout_template:workout_templates(
              *,
              exercises:workout_exercises(
                *,
                exercise:exercises(*)
              )
            ),
            trainer:users!workout_assignments_trainer_id_fkey(*)
          `)
          .eq('id', input.assignment_id)
          .single();

        if (assignmentError || !assignment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workout assignment not found',
          });
        }

        // Verify ownership
        if (assignment.athlete_id !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view your own workouts',
          });
        }

        // Fetch progress for this assignment
        const { data: progress, error: progressError } = await ctx.supabase
          .from('workout_session_progress')
          .select('*')
          .eq('workout_assignment_id', input.assignment_id);

        if (progressError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch workout progress',
          });
        }

        // Sort exercises by order_index
        if (assignment.workout_template?.exercises) {
          assignment.workout_template.exercises = assignment.workout_template.exercises.sort(
            (a: any, b: any) => a.order_index - b.order_index
          );
        }

        // Calculate completion percentage
        const totalSets = assignment.workout_template?.exercises?.reduce(
          (sum: number, ex: any) => sum + ex.sets,
          0
        ) || 0;
        const completedSets = progress?.filter((p: any) => p.completed).length || 0;
        const completion_percentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

        return {
          ...assignment,
          progress,
          completion_percentage,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error fetching workout detail:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Start a workout (change status to in_progress)
   * Requirements: 8.1, 8.3
   */
  startWorkout: athleteProcedure
    .input(z.object({ assignment_id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership and current status
        const { data: assignment, error: fetchError } = await ctx.supabase
          .from('workout_assignments')
          .select('athlete_id, status')
          .eq('id', input.assignment_id)
          .single();

        if (fetchError || !assignment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workout assignment not found',
          });
        }

        if (assignment.athlete_id !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only start your own workouts',
          });
        }

        if (assignment.status !== 'pending') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Workout has already been started or completed',
          });
        }

        // Update status to in_progress and set started_at
        const { data: updatedAssignment, error: updateError } = await ctx.supabase
          .from('workout_assignments')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', input.assignment_id)
          .select()
          .single();

        if (updateError || !updatedAssignment) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to start workout',
          });
        }

        return updatedAssignment;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error starting workout:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Update progress for a specific exercise set
   * Requirements: 8.2
   */
  updateProgress: athleteProcedure
    .input(
      z.object({
        assignment_id: z.number(),
        workout_exercise_id: z.number(),
        set_number: z.number().min(1),
        completed: z.boolean(),
        reps_completed: z.number().optional(),
        weight_used: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const { data: assignment, error: fetchError } = await ctx.supabase
          .from('workout_assignments')
          .select('athlete_id, status')
          .eq('id', input.assignment_id)
          .single();

        if (fetchError || !assignment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workout assignment not found',
          });
        }

        if (assignment.athlete_id !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update progress for your own workouts',
          });
        }

        // Check if progress record exists
        const { data: existingProgress } = await ctx.supabase
          .from('workout_session_progress')
          .select('id')
          .eq('workout_assignment_id', input.assignment_id)
          .eq('workout_exercise_id', input.workout_exercise_id)
          .eq('set_number', input.set_number)
          .single();

        let progressRecord;

        if (existingProgress) {
          // Update existing progress
          const { data, error } = await ctx.supabase
            .from('workout_session_progress')
            .update({
              completed: input.completed,
              reps_completed: input.reps_completed || null,
              weight_used: input.weight_used || null,
              notes: input.notes || null,
              completed_at: input.completed ? new Date().toISOString() : null,
            })
            .eq('id', existingProgress.id)
            .select()
            .single();

          if (error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to update progress',
            });
          }

          progressRecord = data;
        } else {
          // Create new progress record
          const { data, error } = await ctx.supabase
            .from('workout_session_progress')
            .insert({
              workout_assignment_id: input.assignment_id,
              workout_exercise_id: input.workout_exercise_id,
              set_number: input.set_number,
              completed: input.completed,
              reps_completed: input.reps_completed || null,
              weight_used: input.weight_used || null,
              notes: input.notes || null,
              completed_at: input.completed ? new Date().toISOString() : null,
            })
            .select()
            .single();

          if (error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create progress record',
            });
          }

          progressRecord = data;
        }

        // If this is the first completed set and status is pending, update to in_progress
        if (input.completed && assignment.status === 'pending') {
          await ctx.supabase
            .from('workout_assignments')
            .update({
              status: 'in_progress',
              started_at: new Date().toISOString(),
            })
            .eq('id', input.assignment_id);
        }

        return progressRecord;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error updating workout progress:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Finish a workout (change status to completed)
   * Requirements: 8.3
   */
  finishWorkout: athleteProcedure
    .input(z.object({ assignment_id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership and current status
        const { data: assignment, error: fetchError } = await ctx.supabase
          .from('workout_assignments')
          .select('athlete_id, status')
          .eq('id', input.assignment_id)
          .single();

        if (fetchError || !assignment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Workout assignment not found',
          });
        }

        if (assignment.athlete_id !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only finish your own workouts',
          });
        }

        if (assignment.status === 'completed') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Workout has already been completed',
          });
        }

        // Update status to completed and set completed_at
        const { data: updatedAssignment, error: updateError } = await ctx.supabase
          .from('workout_assignments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            // Set started_at if it wasn't set (in case they finish without explicitly starting)
            started_at: assignment.status === 'pending' ? new Date().toISOString() : undefined,
          })
          .eq('id', input.assignment_id)
          .select()
          .single();

        if (updateError || !updatedAssignment) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to finish workout',
          });
        }

        return updatedAssignment;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error finishing workout:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get workout assignments for athletes enrolled with the trainer
   * Requirements: 8.5
   */
  getAthleteWorkouts: trainerProcedure
    .input(
      z.object({
        athlete_id: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed', 'skipped', 'cancelled']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verify trainer-athlete enrollment
        const hasAccess = await verifyTrainerAthleteAccess(
          ctx.supabase,
          ctx.user.id,
          input.athlete_id
        );

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view workouts for your enrolled athletes',
          });
        }

        let query = ctx.supabase
          .from('workout_assignments')
          .select(`
            *,
            workout_template:workout_templates(
              *,
              exercises:workout_exercises(
                *,
                exercise:exercises(*)
              )
            ),
            athlete:users!workout_assignments_athlete_id_fkey(*)
          `)
          .eq('athlete_id', input.athlete_id)
          .eq('trainer_id', ctx.user.id)
          .order('scheduled_date', { ascending: false });

        if (input.status) {
          query = query.eq('status', input.status);
        }

        const { data: assignments, error } = await query;

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch athlete workouts',
          });
        }

        // Calculate completion percentage for each assignment
        const assignmentsWithProgress = await Promise.all(
          assignments.map(async (assignment: any) => {
            const { data: progress } = await ctx.supabase
              .from('workout_session_progress')
              .select('*')
              .eq('workout_assignment_id', assignment.id);

            // Calculate total sets from template
            const totalSets = assignment.workout_template?.exercises?.reduce(
              (sum: number, ex: any) => sum + ex.sets,
              0
            ) || 0;

            // Count completed sets
            const completedSets = progress?.filter((p: any) => p.completed).length || 0;

            const completion_percentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

            // Sort exercises by order_index
            if (assignment.workout_template?.exercises) {
              assignment.workout_template.exercises = assignment.workout_template.exercises.sort(
                (a: any, b: any) => a.order_index - b.order_index
              );
            }

            return {
              ...assignment,
              completion_percentage,
            };
          })
        );

        return assignmentsWithProgress;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error fetching athlete workouts:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),
});
