import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@jejakathlete/shared';
import { z } from 'zod';
import type { AuthUser } from '@jejakathlete/shared';

// Helper: Generate unique trainer code
function generateTrainerCode(): string {
  const randomNum = Math.floor(Math.random() * 900) + 100;
  return `TR${randomNum}`;
}

// Helper: Fetch complete user profile with role-specific data
async function fetchUserProfile(
  supabase: ReturnType<typeof import('@supabase/ssr').createServerClient>,
  userId: string,
  email: string
): Promise<AuthUser | null> {
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return null;
  }

  let trainer_data;
  let athlete_data;

  if (profile.role === 'trainer') {
    const { data } = await supabase
      .from('trainers')
      .select('*')
      .eq('user_id', userId)
      .single();
    trainer_data = data || undefined;
  } else if (profile.role === 'athlete') {
    const { data } = await supabase
      .from('athletes')
      .select('*')
      .eq('user_id', userId)
      .single();
    athlete_data = data || undefined;
  }

  return {
    id: profile.id,
    email,
    full_name: profile.full_name,
    username: profile.username,
    role: profile.role,
    avatar_url: profile.avatar_url,
    is_verified: profile.is_verified,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    trainer_data,
    athlete_data,
  };
}

export const authRouter = router({
  // Get current session
  getSession: publicProcedure.query(async ({ ctx }) => {
    const { data: { session } } = await ctx.supabase.auth.getSession();
    
    if (!session?.user) {
      return { user: null, session: null };
    }

    const profile = await fetchUserProfile(
      ctx.supabase,
      session.user.id,
      session.user.email || ''
    );

    return { user: profile, session };
  }),

  // Login with email and password
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error.message,
        });
      }

      if (!data.user) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve user after login',
        });
      }

      const profile = await fetchUserProfile(
        ctx.supabase,
        data.user.id,
        data.user.email || ''
      );

      return {
        success: true,
        user: profile,
        session: data.session,
      };
    }),

  // Register new user
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Create auth user
      const { data: authData, error: authError } = await ctx.supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.full_name,
            username: input.username,
            role: input.role,
          },
        },
      });

      if (authError) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: authError.message,
        });
      }

      if (!authData.user) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user account',
        });
      }

      const userId = authData.user.id;

      // 2. Create user profile in public.users table
      const { error: profileError } = await ctx.supabase
        .from('users')
        .insert({
          id: userId,
          full_name: input.full_name,
          username: input.username,
          role: input.role,
          is_verified: false,
        });

      if (profileError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user profile: ' + profileError.message,
        });
      }

      // 3. Create role-specific profile
      if (input.role === 'trainer') {
        const { error: trainerError } = await ctx.supabase
          .from('trainers')
          .insert({
            user_id: userId,
            trainer_code: input.trainer_code || generateTrainerCode(),
            certification_id: input.certification_id || null,
            specialization: input.specialization || null,
            verification_status: 'pending',
          });

        if (trainerError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create trainer profile: ' + trainerError.message,
          });
        }
      } else if (input.role === 'athlete') {
        const { error: athleteError } = await ctx.supabase
          .from('athletes')
          .insert({
            user_id: userId,
            sport: input.sport,
            level: input.level || 'beginner',
          });

        if (athleteError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create athlete profile: ' + athleteError.message,
          });
        }
      }

      return {
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
      };
    }),

  // Logout
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase.auth.signOut();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }

    return { success: true };
  }),

  // Forgot password - send reset email
  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const { error } = await ctx.supabase.auth.resetPasswordForEmail(input.email, {
        redirectTo: `${appUrl}/auth/reset-password`,
      });

      if (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }

      return {
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
      };
    }),

  // Reset password with new password
  resetPassword: protectedProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.auth.updateUser({
        password: input.password,
      });

      if (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }

      return {
        success: true,
        message: 'Password updated successfully.',
      };
    }),

  // Get OAuth URL for mobile deep link flow
  getOAuthUrl: publicProcedure
    .input(z.object({
      provider: z.enum(['google', 'apple']),
      redirectToMobile: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const mobileScheme = process.env.NEXT_PUBLIC_MOBILE_SCHEME || 'jejakathlete';
      
      // Redirect to our callback page, which will handle the mobile redirect
      const redirectTo = input.redirectToMobile
        ? `${appUrl}/auth/callback?redirect_to=${mobileScheme}://auth`
        : `${appUrl}/auth/callback`;

      const { data, error } = await ctx.supabase.auth.signInWithOAuth({
        provider: input.provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }

      return {
        url: data.url,
      };
    }),

  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await fetchUserProfile(
      ctx.supabase,
      ctx.user.id,
      ctx.user.email || ''
    );

    if (!profile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User profile not found',
      });
    }

    return profile;
  }),

  // Refresh user data
  refreshUser: protectedProcedure.mutation(async ({ ctx }) => {
    const { data: { session } } = await ctx.supabase.auth.refreshSession();
    
    if (!session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Session expired',
      });
    }

    const profile = await fetchUserProfile(
      ctx.supabase,
      session.user.id,
      session.user.email || ''
    );

    return { user: profile, session };
  }),
});

export type AuthRouter = typeof authRouter;
