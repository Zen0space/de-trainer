import { z } from 'zod';
import { router, athleteProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Dashboard Router
 * Handles athlete dashboard statistics and recent activities
 */
export const dashboardRouter = router({
  /**
   * Get athlete dashboard statistics
   */
  getAthleteStats: athleteProcedure.query(async ({ ctx }) => {
    try {
      const athleteId = ctx.user.id;

      console.log('🔵 [getAthleteStats] Fetching stats for athlete:', athleteId);

      // Get athlete's current trainer
      const { data: trainerData, error: trainerError } = await ctx.supabase
        .from('enrollments')
        .select(`
          trainer:users!enrollments_trainer_id_fkey(
            full_name,
            trainers(
              trainer_code
            )
          )
        `)
        .eq('athlete_id', athleteId)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle();

      if (trainerError && trainerError.code !== 'PGRST116') {
        console.error('❌ [getAthleteStats] Error fetching trainer:', trainerError);
      }

      // Get total workout count (test results)
      const { count: workoutCount, error: workoutError } = await ctx.supabase
        .from('test_results')
        .select('*', { count: 'exact', head: true })
        .eq('athlete_id', athleteId);

      if (workoutError) {
        console.error('❌ [getAthleteStats] Error counting workouts:', workoutError);
      }

      // Get recent test results count (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: recentTestCount, error: recentError } = await ctx.supabase
        .from('test_results')
        .select('*', { count: 'exact', head: true })
        .eq('athlete_id', athleteId)
        .gte('test_date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (recentError) {
        console.error('❌ [getAthleteStats] Error counting recent tests:', recentError);
      }

      // Get personal records count
      const { count: personalRecordsCount, error: recordsError } = await ctx.supabase
        .from('test_results')
        .select('*', { count: 'exact', head: true })
        .eq('athlete_id', athleteId)
        .eq('is_best_record', true);

      if (recordsError) {
        console.error('❌ [getAthleteStats] Error counting personal records:', recordsError);
      }

      const stats = {
        totalWorkouts: workoutCount || 0,
        recentTestResults: recentTestCount || 0,
        currentTrainer: trainerData?.trainer?.full_name || null,
        personalRecords: personalRecordsCount || 0,
      };

      console.log('✅ [getAthleteStats] Stats fetched:', stats);

      return stats;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('❌ [getAthleteStats] Unexpected error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch athlete statistics',
      });
    }
  }),

  /**
   * Get recent activities for athlete dashboard
   */
  getRecentActivities: athleteProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const athleteId = ctx.user.id;

        console.log('🔵 [getRecentActivities] Fetching activities for athlete:', athleteId);

        // Get recent activities (last N test results)
        const { data: recentTests, error } = await ctx.supabase
          .from('test_results')
          .select(`
            id,
            result_text,
            test_date,
            is_best_record,
            notes,
            tests(name)
          `)
          .eq('athlete_id', athleteId)
          .order('test_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(input.limit);

        if (error) {
          console.error('❌ [getRecentActivities] Supabase error:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to fetch recent activities: ${error.message}`,
          });
        }

        // Transform the data
        const activities = recentTests?.map((test: any) => ({
          id: test.id,
          test_name: test.tests?.name || 'Unknown Test',
          result_text: test.result_text || '',
          test_date: test.test_date,
          is_best_record: test.is_best_record || false,
          notes: test.notes,
        })) || [];

        console.log('✅ [getRecentActivities] Found', activities.length, 'activities');

        return activities;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('❌ [getRecentActivities] Unexpected error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch recent activities',
        });
      }
    }),
});
