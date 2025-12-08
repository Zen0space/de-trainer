/**
 * Example Router - Demonstrates tRPC Infrastructure Usage
 * 
 * This file shows how to use the authorization middleware and utilities
 * created in task 1. It is not meant to be used in production.
 * 
 * Delete this file once actual feature routers are implemented.
 */

import { router, protectedProcedure, trainerProcedure, athleteProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { verifyTrainerAthleteAccess, verifyOwnership, isAdmin } from '../utils/authorization';
import { fetchCompleteProfile } from '../utils/supabase';

export const exampleRouter = router({
  // Example: Public procedure (no authentication required)
  publicExample: protectedProcedure.query(async ({ ctx }) => {
    return { message: 'This is accessible to anyone' };
  }),

  // Example: Protected procedure (requires authentication)
  protectedExample: protectedProcedure.query(async ({ ctx }) => {
    return {
      message: 'This is accessible to authenticated users',
      userId: ctx.user.id,
      role: ctx.role,
    };
  }),

  // Example: Trainer-only procedure
  trainerOnlyExample: trainerProcedure.query(async ({ ctx }) => {
    return {
      message: 'This is accessible only to trainers and admins',
      userId: ctx.user.id,
      role: ctx.role,
    };
  }),

  // Example: Athlete-only procedure
  athleteOnlyExample: athleteProcedure.query(async ({ ctx }) => {
    return {
      message: 'This is accessible only to athletes and admins',
      userId: ctx.user.id,
      role: ctx.role,
    };
  }),

  // Example: Accessing athlete data with authorization check
  getAthleteDataExample: protectedProcedure
    .input(z.object({
      athlete_id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Check if user is accessing their own data
      if (verifyOwnership(ctx.user.id, input.athlete_id)) {
        // User is accessing their own data - allow
      } else if (ctx.role === 'trainer') {
        // Trainer accessing athlete data - verify enrollment
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
      } else if (!isAdmin(ctx.role!)) {
        // Not admin, not trainer, not own data - deny
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this athlete\'s data',
        });
      }

      // Fetch athlete data (example)
      const { data, error } = await ctx.supabase
        .from('athletes')
        .select('*')
        .eq('user_id', input.athlete_id)
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Athlete not found',
        });
      }

      return data;
    }),

  // Example: Fetching complete profile
  getCompleteProfileExample: protectedProcedure.query(async ({ ctx }) => {
    const profile = await fetchCompleteProfile(ctx.supabase, ctx.user.id);

    if (!profile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profile not found',
      });
    }

    return profile;
  }),

  // Example: Admin-only operation
  adminOnlyExample: protectedProcedure.query(async ({ ctx }) => {
    if (!isAdmin(ctx.role!)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This action requires admin privileges',
      });
    }

    return {
      message: 'This is accessible only to admins',
      userId: ctx.user.id,
      role: ctx.role,
    };
  }),
});

export type ExampleRouter = typeof exampleRouter;
