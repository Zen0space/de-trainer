import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, athleteProcedure, trainerProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { verifyTrainerAthleteAccess, isAdmin } from '../utils/authorization';

/**
 * Test Results Router
 * Handles fitness test results tracking with personal record detection
 */
export const testResultsRouter = router({
  /**
   * Record a new test result for an athlete
   * Automatically detects and updates personal records
   */
  recordTestResult: athleteProcedure
    .input(
      z.object({
        test_id: z.number(),
        result_value: z.number(),
        test_date: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get test information to determine improvement direction
        const { data: test, error: testError } = await ctx.supabase
          .from('tests')
          .select('improvement_direction')
          .eq('id', input.test_id)
          .single();

        if (testError || !test) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Test not found',
          });
        }

        // Get all previous results for this test and athlete
        const { data: previousResults, error: previousError } = await ctx.supabase
          .from('test_results')
          .select('id, result_value, is_best_record')
          .eq('athlete_id', ctx.user.id)
          .eq('test_id', input.test_id);

        if (previousError) {
          console.error('Error fetching previous test results:', previousError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch previous test results',
          });
        }

        // Determine if this is a new personal record
        let isNewRecord = true;
        if (previousResults && previousResults.length > 0) {
          const bestPrevious = previousResults.reduce((best, current) => {
            if (test.improvement_direction === 'higher') {
              return current.result_value > best.result_value ? current : best;
            } else {
              return current.result_value < best.result_value ? current : best;
            }
          });

          if (test.improvement_direction === 'higher') {
            isNewRecord = input.result_value > bestPrevious.result_value;
          } else {
            isNewRecord = input.result_value < bestPrevious.result_value;
          }

          // If this is a new record, update all previous records to not be best
          if (isNewRecord) {
            const { error: updateError } = await ctx.supabase
              .from('test_results')
              .update({ is_best_record: false })
              .eq('athlete_id', ctx.user.id)
              .eq('test_id', input.test_id);

            if (updateError) {
              console.error('Error updating previous records:', updateError);
              // Continue anyway - this is not critical
            }
          }
        }

        // Insert the new test result
        const { data, error } = await ctx.supabase
          .from('test_results')
          .insert({
            athlete_id: ctx.user.id,
            test_id: input.test_id,
            result_value: input.result_value,
            test_date: input.test_date,
            notes: input.notes ?? null,
            is_best_record: isNewRecord,
          })
          .select()
          .single();

        if (error) {
          console.error('Error recording test result:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to record test result',
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Unexpected error in recordTestResult:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get athlete's own test results with complete test information
   * Returns results ordered by test_date descending
   */
  getMyTestResults: athleteProcedure
    .input(
      z
        .object({
          test_id: z.number().optional(),
          limit: z.number().positive().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        console.log('🔵 [getMyTestResults] Fetching test results for athlete:', ctx.user.id, {
          test_id: input?.test_id,
          limit: input?.limit,
        });

        let query = ctx.supabase
          .from('test_results')
          .select(`
            *,
            test:tests (
              id,
              name,
              description,
              unit,
              improvement_direction,
              component_id,
              fitness_component:fitness_components (
                id,
                name,
                description
              )
            )
          `)
          .eq('athlete_id', ctx.user.id)
          .order('test_date', { ascending: false });

        if (input?.test_id) {
          query = query.eq('test_id', input.test_id);
        }

        if (input?.limit) {
          query = query.limit(input.limit);
        }

        const { data, error } = await query;

        if (error) {
          console.error('❌ [getMyTestResults] Supabase error:', {
            code: error.code,
            message: error.message,
            details: error.details,
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to fetch test results: ${error.message}`,
          });
        }

        console.log('✅ [getMyTestResults] Found', data.length, 'test results');

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('❌ [getMyTestResults] Unexpected error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get test results for a specific athlete (trainer access)
   * Requires approved enrollment between trainer and athlete
   */
  getAthleteTestResults: trainerProcedure
    .input(
      z.object({
        athlete_id: z.string().uuid(),
        test_id: z.number().optional(),
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
          .from('test_results')
          .select(`
            *,
            test:tests (
              id,
              name,
              description,
              unit,
              improvement_direction,
              component_id,
              fitness_component:fitness_components (
                id,
                name,
                description
              )
            )
          `)
          .eq('athlete_id', input.athlete_id)
          .order('test_date', { ascending: false });

        if (input.test_id) {
          query = query.eq('test_id', input.test_id);
        }

        if (input.limit) {
          query = query.limit(input.limit);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching athlete test results:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch athlete test results',
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Unexpected error in getAthleteTestResults:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get all fitness components (public)
   * Used for categorizing tests
   */
  getFitnessComponents: publicProcedure.query(async ({ ctx }) => {
    try {
      const { data, error } = await ctx.supabase
        .from('fitness_components')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching fitness components:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch fitness components',
        });
      }

      return data;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error('Unexpected error in getFitnessComponents:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }),

  /**
   * Get all tests for a specific fitness component (public)
   * Used for selecting tests to perform
   */
  getTestsByComponent: publicProcedure
    .input(
      z.object({
        fitness_component_id: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from('tests')
          .select('*')
          .eq('fitness_component_id', input.fitness_component_id)
          .order('name');

        if (error) {
          console.error('Error fetching tests:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch tests',
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Unexpected error in getTestsByComponent:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),
});
