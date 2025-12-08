import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { isAdmin, verifyOwnership } from '../utils/authorization';
import type { CompleteProfile } from '@jejakathlete/shared';

/**
 * Profiles Router
 * Handles user profile operations including retrieval, updates, and avatar uploads
 */
export const profilesRouter = router({
  /**
   * Get current user's complete profile
   * Joins users, user_profiling, and role-specific tables (trainers/athletes)
   */
  getProfile: protectedProcedure.query(async ({ ctx }): Promise<CompleteProfile> => {
    try {
      // Fetch user data
      const { data: user, error: userError } = await ctx.supabase
        .from('users')
        .select('*')
        .eq('id', ctx.user.id)
        .single();

      if (userError || !user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      // Fetch user profiling data
      const { data: profiling } = await ctx.supabase
        .from('user_profiling')
        .select('*')
        .eq('user_id', ctx.user.id)
        .single();

      // Fetch role-specific data
      let trainer_data = undefined;
      let athlete_data = undefined;

      if (user.role === 'trainer' || user.role === 'admin' || user.role === 'rekabytes-admin') {
        const { data: trainerData } = await ctx.supabase
          .from('trainers')
          .select('*')
          .eq('user_id', ctx.user.id)
          .single();
        
        trainer_data = trainerData || undefined;
      }

      if (user.role === 'athlete' || user.role === 'admin' || user.role === 'rekabytes-admin') {
        const { data: athleteData } = await ctx.supabase
          .from('athletes')
          .select('*')
          .eq('user_id', ctx.user.id)
          .single();
        
        athlete_data = athleteData || undefined;
      }

      return {
        ...user,
        profiling: profiling || undefined,
        trainer_data,
        athlete_data,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('Error fetching profile:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch profile',
      });
    }
  }),

  /**
   * Update user profile
   * Supports updating users, user_profiling, and role-specific tables
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        // User table fields
        full_name: z.string().optional(),
        username: z.string().optional(),
        
        // User profiling fields
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        date_of_birth: z.string().optional(),
        gender: z.string().optional(),
        bio: z.string().optional(),
        social_links: z.record(z.string()).optional(),
        preferences: z.record(z.any()).optional(),
        
        // Athlete-specific fields
        sport: z.string().optional(),
        level: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).optional(),
        
        // Trainer-specific fields
        certification_id: z.string().optional(),
        specialization: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;

        // Update users table if relevant fields are provided
        const userFields = {
          full_name: input.full_name,
          username: input.username,
        };

        const hasUserFields = Object.values(userFields).some(v => v !== undefined);

        if (hasUserFields) {
          const updateData = Object.fromEntries(
            Object.entries(userFields).filter(([_, v]) => v !== undefined)
          );

          const { error: userError } = await ctx.supabase
            .from('users')
            .update({
              ...updateData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (userError) {
            // Handle unique constraint violation for username
            if (userError.code === '23505') {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Username already taken',
              });
            }

            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to update user profile',
            });
          }
        }

        // Update user_profiling table if relevant fields are provided
        const profilingFields = {
          phone: input.phone,
          address: input.address,
          city: input.city,
          country: input.country,
          date_of_birth: input.date_of_birth,
          gender: input.gender,
          bio: input.bio,
          social_links: input.social_links,
          preferences: input.preferences,
        };

        const hasProfilingFields = Object.values(profilingFields).some(v => v !== undefined);

        if (hasProfilingFields) {
          const updateData = Object.fromEntries(
            Object.entries(profilingFields).filter(([_, v]) => v !== undefined)
          );

          // Check if profiling record exists
          const { data: existingProfiling } = await ctx.supabase
            .from('user_profiling')
            .select('user_id')
            .eq('user_id', userId)
            .single();

          if (existingProfiling) {
            // Update existing record
            const { error: profilingError } = await ctx.supabase
              .from('user_profiling')
              .update({
                ...updateData,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);

            if (profilingError) {
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update user profiling',
              });
            }
          } else {
            // Insert new record
            const { error: profilingError } = await ctx.supabase
              .from('user_profiling')
              .insert({
                user_id: userId,
                ...updateData,
              });

            if (profilingError) {
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create user profiling',
              });
            }
          }
        }

        // Update athlete-specific fields if provided
        if (ctx.role === 'athlete' && (input.sport || input.level)) {
          const athleteFields = {
            sport: input.sport,
            level: input.level,
          };

          const updateData = Object.fromEntries(
            Object.entries(athleteFields).filter(([_, v]) => v !== undefined)
          );

          const { error: athleteError } = await ctx.supabase
            .from('athletes')
            .update({
              ...updateData,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          if (athleteError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to update athlete profile',
            });
          }
        }

        // Update trainer-specific fields if provided
        if (ctx.role === 'trainer' && (input.certification_id || input.specialization)) {
          const trainerFields = {
            certification_id: input.certification_id,
            specialization: input.specialization,
          };

          const updateData = Object.fromEntries(
            Object.entries(trainerFields).filter(([_, v]) => v !== undefined)
          );

          const { error: trainerError } = await ctx.supabase
            .from('trainers')
            .update({
              ...updateData,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          if (trainerError) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to update trainer profile',
            });
          }
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error updating profile:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Upload avatar to Supabase Storage
   * Accepts base64 encoded image and uploads to storage bucket
   */
  uploadAvatar: protectedProcedure
    .input(
      z.object({
        file: z.string(), // base64 encoded image
        filename: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.id;

        // Decode base64 file
        const base64Data = input.file.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate unique filename
        const fileExt = input.filename.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await ctx.supabase.storage
          .from('avatars')
          .upload(filePath, buffer, {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (uploadError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to upload avatar',
          });
        }

        // Get public URL
        const { data: urlData } = ctx.supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        const avatarUrl = urlData.publicUrl;

        // Update user's avatar_url
        const { error: updateError } = await ctx.supabase
          .from('users')
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update avatar URL',
          });
        }

        return { avatar_url: avatarUrl };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error uploading avatar:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get trainer by trainer code
   * Public endpoint for athletes to find trainers
   */
  getTrainerByCode: publicProcedure
    .input(
      z.object({
        trainer_code: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Find trainer by code
        const { data: trainer, error: trainerError } = await ctx.supabase
          .from('trainers')
          .select('user_id, trainer_code, certification_id, specialization, verification_status')
          .eq('trainer_code', input.trainer_code)
          .single();

        if (trainerError || !trainer) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Trainer not found',
          });
        }

        // Get user details
        const { data: user, error: userError } = await ctx.supabase
          .from('users')
          .select('id, full_name, username, avatar_url')
          .eq('id', trainer.user_id)
          .single();

        if (userError || !user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Trainer profile not found',
          });
        }

        return {
          ...user,
          trainer_code: trainer.trainer_code,
          certification_id: trainer.certification_id,
          specialization: trainer.specialization,
          verification_status: trainer.verification_status,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error fetching trainer by code:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch trainer',
        });
      }
    }),
});
