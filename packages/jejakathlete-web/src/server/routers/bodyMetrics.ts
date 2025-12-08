import { z } from 'zod';
import { router, protectedProcedure, athleteProcedure, trainerProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { verifyTrainerAthleteAccess, isAdmin } from '../utils/authorization';

/**
 * Body Metrics Router
 * Handles athlete body metrics tracking including weight, height, muscle mass, body fat, and BMI
 */
export const bodyMetricsRouter = router({
  /**
   * Record new body metrics for an athlete
   * Only athletes can record their own metrics
   */
  recordMetrics: athleteProcedure
    .input(
      z.object({
        measurement_date: z.string(),
        weight: z.number().positive().optional(),
        height: z.number().positive().optional(),
        muscle_mass: z.number().positive().optional(),
        body_fat_percentage: z.number().min(0).max(100).optional(),
        bmi: z.number().positive().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('athlete_body_metrics')
          .insert({
            athlete_id: ctx.user.id,
            measurement_date: input.measurement_date,
            weight: input.weight ?? null,
            height: input.height ?? null,
            muscle_mass: input.muscle_mass ?? null,
            body_fat_percentage: input.body_fat_percentage ?? null,
            bmi: input.bmi ?? null,
            notes: input.notes ?? null,
          })
          .select()
          .single();

        if (error) {
          console.error('Error recording body metrics:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to record body metrics',
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Unexpected error in recordMetrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get athlete's own body metrics history
   * Returns metrics ordered by measurement_date descending
   */
  getMyMetrics: athleteProcedure
    .input(
      z
        .object({
          limit: z.number().positive().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        let query = ctx.supabase
          .from('athlete_body_metrics')
          .select('*')
          .eq('athlete_id', ctx.user.id)
          .order('measurement_date', { ascending: false });

        if (input?.limit) {
          query = query.limit(input.limit);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching body metrics:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch body metrics',
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Unexpected error in getMyMetrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Update existing body metrics
   * Only athletes can update their own metrics
   */
  updateMetrics: athleteProcedure
    .input(
      z.object({
        id: z.number(),
        measurement_date: z.string().optional(),
        weight: z.number().positive().optional(),
        height: z.number().positive().optional(),
        muscle_mass: z.number().positive().optional(),
        body_fat_percentage: z.number().min(0).max(100).optional(),
        bmi: z.number().positive().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // First verify the metric belongs to the authenticated athlete
        const { data: existingMetric, error: fetchError } = await ctx.supabase
          .from('athlete_body_metrics')
          .select('athlete_id')
          .eq('id', input.id)
          .single();

        if (fetchError || !existingMetric) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Body metric not found',
          });
        }

        if (existingMetric.athlete_id !== ctx.user.id && !isAdmin(ctx.role)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only update your own body metrics',
          });
        }

        // Build update object with only provided fields
        const updateData: any = {};
        if (input.measurement_date !== undefined) updateData.measurement_date = input.measurement_date;
        if (input.weight !== undefined) updateData.weight = input.weight;
        if (input.height !== undefined) updateData.height = input.height;
        if (input.muscle_mass !== undefined) updateData.muscle_mass = input.muscle_mass;
        if (input.body_fat_percentage !== undefined) updateData.body_fat_percentage = input.body_fat_percentage;
        if (input.bmi !== undefined) updateData.bmi = input.bmi;
        if (input.notes !== undefined) updateData.notes = input.notes;

        const { data, error } = await ctx.supabase
          .from('athlete_body_metrics')
          .update(updateData)
          .eq('id', input.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating body metrics:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update body metrics',
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Unexpected error in updateMetrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get body metrics for a specific athlete (trainer access)
   * Requires approved enrollment between trainer and athlete
   */
  getAthleteMetrics: trainerProcedure
    .input(
      z.object({
        athlete_id: z.string().uuid(),
        limit: z.number().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verify trainer has access to this athlete
        if (!isAdmin(ctx.role)) {
          const hasAccess = await verifyTrainerAthleteAccess(
            ctx.supabase,
            ctx.user.id,
            input.athlete_id
          );

          if (!hasAccess) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have access to this athlete\'s data',
            });
          }
        }

        let query = ctx.supabase
          .from('athlete_body_metrics')
          .select('*')
          .eq('athlete_id', input.athlete_id)
          .order('measurement_date', { ascending: false });

        if (input.limit) {
          query = query.limit(input.limit);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching athlete body metrics:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch athlete body metrics',
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Unexpected error in getAthleteMetrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),
});
