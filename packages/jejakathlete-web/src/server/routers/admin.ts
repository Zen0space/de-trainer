import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Admin Router
 * Handles admin dashboard operations
 */
export const adminRouter = router({
  /**
   * Get admin dashboard statistics
   */
  getStats: publicProcedure.query(async ({ ctx }) => {
    try {
      // Verify admin role
      if (!ctx.user || ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Admin access required',
        });
      }

      // Get total users count
      const { count: totalUsers } = await ctx.supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get athletes count
      const { count: totalAthletes } = await ctx.supabase
        .from('athletes')
        .select('*', { count: 'exact', head: true });

      // Get trainers count
      const { count: totalTrainers } = await ctx.supabase
        .from('trainers')
        .select('*', { count: 'exact', head: true });

      // Get enrollments count
      const { count: totalEnrollments } = await ctx.supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true });

      // Get pending trainer verifications
      const { count: pendingVerifications } = await ctx.supabase
        .from('trainers')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending');

      return {
        totalUsers: totalUsers || 0,
        totalAthletes: totalAthletes || 0,
        totalTrainers: totalTrainers || 0,
        totalEnrollments: totalEnrollments || 0,
        pendingVerifications: pendingVerifications || 0,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch admin stats',
      });
    }
  }),

  /**
   * Get all users with optional filtering
   */
  getUsers: publicProcedure
    .input(
      z.object({
        role: z.enum(['athlete', 'trainer', 'admin', 'all']).optional().default('all'),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Admin access required',
          });
        }

        let query = ctx.supabase
          .from('users')
          .select(`
            id,
            full_name,
            username,
            role,
            avatar_url,
            is_verified,
            created_at,
            user_profiling(phone, city, country),
            athletes(sport, level),
            trainers(trainer_code, verification_status)
          `)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.role !== 'all') {
          query = query.eq('role', input.role);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data || [];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch users',
        });
      }
    }),

  /**
   * Get detailed user profile
   */
  getUserDetail: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Admin access required',
          });
        }

        const { data, error } = await ctx.supabase
          .from('users')
          .select(`
            *,
            user_profiling(*),
            athletes(*),
            trainers(*)
          `)
          .eq('id', input.userId)
          .single();

        if (error) throw error;

        return data;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user detail',
        });
      }
    }),

  /**
   * Get athlete workout progress
   */
  getAthleteWorkouts: publicProcedure
    .input(z.object({ athleteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user || ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Admin access required',
          });
        }

        const { data, error } = await ctx.supabase
          .from('workout_assignments')
          .select(`
            *,
            workout_templates(name, description),
            users!workout_assignments_trainer_id_fkey(full_name)
          `)
          .eq('athlete_id', input.athleteId)
          .order('scheduled_date', { ascending: false });

        if (error) throw error;

        return data || [];
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch athlete workouts',
        });
      }
    }),
});
