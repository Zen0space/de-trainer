import { z } from 'zod';
import { router, protectedProcedure, athleteProcedure, trainerProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import type { EnrollmentWithDetails } from '@jejakathlete/shared';

/**
 * Enrollments Router
 * Handles trainer-athlete enrollment relationships
 */
export const enrollmentsRouter = router({
  /**
   * Request enrollment with a trainer (athlete only)
   * Creates a pending enrollment request
   */
  requestEnrollment: athleteProcedure
    .input(
      z.object({
        trainer_code: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const athleteId = ctx.user.id;

        // Find trainer by code
        const { data: trainer, error: trainerError } = await ctx.supabase
          .from('trainers')
          .select('user_id')
          .eq('trainer_code', input.trainer_code)
          .single();

        if (trainerError || !trainer) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Trainer not found with the provided code',
          });
        }

        const trainerId = trainer.user_id;

        // Check if enrollment already exists
        const { data: existingEnrollment } = await ctx.supabase
          .from('enrollments')
          .select('id, status')
          .eq('athlete_id', athleteId)
          .eq('trainer_id', trainerId)
          .single();

        if (existingEnrollment) {
          if (existingEnrollment.status === 'pending') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'You already have a pending enrollment request with this trainer',
            });
          } else if (existingEnrollment.status === 'approved') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'You are already enrolled with this trainer',
            });
          } else if (existingEnrollment.status === 'rejected') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Your previous enrollment request was rejected. Please contact the trainer directly.',
            });
          }
        }

        // Create enrollment request
        const { data: enrollment, error: enrollmentError } = await ctx.supabase
          .from('enrollments')
          .insert({
            athlete_id: athleteId,
            trainer_id: trainerId,
            status: 'pending',
            requested_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (enrollmentError) {
          // Handle unique constraint violation
          if (enrollmentError.code === '23505') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Enrollment request already exists',
            });
          }

          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create enrollment request',
          });
        }

        return enrollment;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error requesting enrollment:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * List pending enrollment requests (trainer only)
   * Returns all pending requests for the authenticated trainer
   */
  listPendingRequests: trainerProcedure.query(async ({ ctx }): Promise<EnrollmentWithDetails[]> => {
    try {
      const trainerId = ctx.user.id;

      const { data: enrollments, error } = await ctx.supabase
        .from('enrollments')
        .select(`
          *,
          athlete:users!enrollments_athlete_id_fkey(
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('trainer_id', trainerId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch enrollment requests',
        });
      }

      return enrollments || [];
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('Error fetching pending requests:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }),

  /**
   * Respond to enrollment request (trainer only)
   * Approve or reject a pending enrollment
   */
  respondToEnrollment: trainerProcedure
    .input(
      z.object({
        enrollment_id: z.number(),
        status: z.enum(['approved', 'rejected']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const trainerId = ctx.user.id;

        // Verify enrollment belongs to this trainer and is pending
        const { data: enrollment, error: fetchError } = await ctx.supabase
          .from('enrollments')
          .select('*')
          .eq('id', input.enrollment_id)
          .eq('trainer_id', trainerId)
          .single();

        if (fetchError || !enrollment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Enrollment request not found',
          });
        }

        if (enrollment.status !== 'pending') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This enrollment request has already been processed',
          });
        }

        // Update enrollment status
        const { data: updatedEnrollment, error: updateError } = await ctx.supabase
          .from('enrollments')
          .update({
            status: input.status,
            responded_at: new Date().toISOString(),
            notes: input.notes || null,
          })
          .eq('id', input.enrollment_id)
          .select()
          .single();

        if (updateError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update enrollment status',
          });
        }

        return updatedEnrollment;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error responding to enrollment:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * List my athletes (trainer only)
   * Returns all approved enrollments for the authenticated trainer
   */
  listMyAthletes: trainerProcedure.query(async ({ ctx }): Promise<EnrollmentWithDetails[]> => {
    try {
      const trainerId = ctx.user.id;

      const { data: enrollments, error } = await ctx.supabase
        .from('enrollments')
        .select(`
          *,
          athlete:users!enrollments_athlete_id_fkey(
            id,
            full_name,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('trainer_id', trainerId)
        .eq('status', 'approved')
        .order('responded_at', { ascending: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch athletes',
        });
      }

      return enrollments || [];
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('Error fetching athletes:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }),

  /**
   * List my trainers (athlete only)
   * Returns all approved enrollments for the authenticated athlete
   */
  listMyTrainers: athleteProcedure.query(async ({ ctx }): Promise<EnrollmentWithDetails[]> => {
    try {
      const athleteId = ctx.user.id;

      const { data: enrollments, error } = await ctx.supabase
        .from('enrollments')
        .select(`
          *,
          trainer:users!enrollments_trainer_id_fkey(
            id,
            full_name,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('athlete_id', athleteId)
        .eq('status', 'approved')
        .order('responded_at', { ascending: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch trainers',
        });
      }

      return enrollments || [];
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('Error fetching trainers:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }),

  /**
   * Get current trainer enrollment (athlete only)
   * Returns the current enrollment with any status (approved, pending, viewing, accepting)
   */
  getCurrentEnrollment: athleteProcedure.query(async ({ ctx }) => {
    try {
      const athleteId = ctx.user.id;

      console.log('🔵 [getCurrentEnrollment] Fetching enrollment for athlete:', athleteId);

      const { data: enrollment, error } = await ctx.supabase
        .from('enrollments')
        .select(`
          *,
          trainer:users!enrollments_trainer_id_fkey(
            id,
            full_name,
            avatar_url,
            trainers(
              trainer_code,
              specialization,
              certification_id
            )
          )
        `)
        .eq('athlete_id', athleteId)
        .in('status', ['approved', 'pending', 'viewing', 'accepting'])
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ [getCurrentEnrollment] Supabase error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch current enrollment: ${error.message}`,
        });
      }

      console.log('✅ [getCurrentEnrollment] Query successful:', {
        hasEnrollment: !!enrollment,
        enrollmentId: enrollment?.id,
      });

      return enrollment;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('❌ [getCurrentEnrollment] Unexpected error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }),

  /**
   * Search trainers by code or name (athlete only)
   */
  searchTrainers: athleteProcedure
    .input(
      z.object({
        searchMode: z.enum(['code', 'name']),
        query: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        if (input.searchMode === 'code') {
          // Search by trainer code (exact match)
          const { data: trainer, error } = await ctx.supabase
            .from('trainers')
            .select(`
              user_id,
              trainer_code,
              specialization,
              certification_id,
              users!trainers_user_id_fkey(
                id,
                full_name
              )
            `)
            .eq('trainer_code', input.query.trim().toUpperCase())
            .eq('verification_status', 'approved')
            .single();

          if (error || !trainer) {
            return [];
          }

          const user = Array.isArray(trainer.users) ? trainer.users[0] : trainer.users;

          return [{
            id: trainer.user_id,
            full_name: user?.full_name || '',
            email: '', // Email not available in public.users
            trainer_code: trainer.trainer_code,
            specialization: trainer.specialization,
            certification_id: trainer.certification_id,
          }];
        } else {
          // Search by trainer name (partial match)
          const { data: trainers, error } = await ctx.supabase
            .from('users')
            .select(`
              id,
              full_name,
              trainers!trainers_user_id_fkey(
                trainer_code,
                specialization,
                certification_id,
                verification_status
              )
            `)
            .eq('role', 'trainer')
            .ilike('full_name', `%${input.query.trim()}%`)
            .limit(10);

          if (error) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to search trainers',
            });
          }

          // Filter for approved trainers and flatten the structure
          return (trainers || [])
            .filter(t => {
              const trainerData = Array.isArray(t.trainers) ? t.trainers[0] : t.trainers;
              return trainerData && trainerData.verification_status === 'approved';
            })
            .map(t => {
              const trainerData = Array.isArray(t.trainers) ? t.trainers[0] : t.trainers;
              return {
                id: t.id,
                full_name: t.full_name,
                email: '', // Email not available in public.users
                trainer_code: trainerData?.trainer_code || '',
                specialization: trainerData?.specialization || null,
                certification_id: trainerData?.certification_id || null,
              };
            });
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error searching trainers:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * List available trainers (athlete only)
   * Returns a list of verified trainers
   */
  listAvailableTrainers: athleteProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { data: trainers, error } = await ctx.supabase
          .from('users')
          .select(`
            id,
            full_name,
            trainers!trainers_user_id_fkey(
              trainer_code,
              specialization,
              certification_id,
              verification_status
            )
          `)
          .eq('role', 'trainer')
          .order('full_name', { ascending: true })
          .limit(input.limit);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch available trainers',
          });
        }

        // Filter for approved trainers and flatten the structure
        return (trainers || [])
          .filter(t => {
            const trainerData = Array.isArray(t.trainers) ? t.trainers[0] : t.trainers;
            return trainerData && trainerData.verification_status === 'approved';
          })
          .map(t => {
            const trainerData = Array.isArray(t.trainers) ? t.trainers[0] : t.trainers;
            return {
              id: t.id,
              full_name: t.full_name,
              email: '', // Email not available in public.users
              trainer_code: trainerData?.trainer_code || '',
              specialization: trainerData?.specialization || null,
              certification_id: trainerData?.certification_id || null,
            };
          });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error fetching available trainers:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Cancel enrollment (athlete only)
   * Allows athlete to cancel their enrollment with a trainer
   */
  cancelEnrollment: athleteProcedure
    .input(
      z.object({
        enrollment_id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const athleteId = ctx.user.id;

        // Verify enrollment belongs to this athlete
        const { data: enrollment, error: fetchError } = await ctx.supabase
          .from('enrollments')
          .select('*')
          .eq('id', input.enrollment_id)
          .eq('athlete_id', athleteId)
          .single();

        if (fetchError || !enrollment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Enrollment not found',
          });
        }

        // Update enrollment status to cancelled
        const { data: updatedEnrollment, error: updateError } = await ctx.supabase
          .from('enrollments')
          .update({
            status: 'cancelled',
            responded_at: new Date().toISOString(),
          })
          .eq('id', input.enrollment_id)
          .select()
          .single();

        if (updateError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to cancel enrollment',
          });
        }

        return updatedEnrollment;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error cancelling enrollment:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Request enrollment by trainer ID (athlete only)
   * Creates or updates an enrollment request
   */
  requestEnrollmentById: athleteProcedure
    .input(
      z.object({
        trainer_id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const athleteId = ctx.user.id;

        // Get athlete's full name from database
        const { data: athleteData } = await ctx.supabase
          .from('users')
          .select('full_name')
          .eq('id', athleteId)
          .single();

        const athleteName = athleteData?.full_name || 'athlete';

        // Get trainer information
        const { data: trainer, error: trainerError } = await ctx.supabase
          .from('users')
          .select(`
            id,
            full_name,
            trainers!trainers_user_id_fkey(
              trainer_code,
              specialization,
              verification_status
            )
          `)
          .eq('id', input.trainer_id)
          .eq('role', 'trainer')
          .single();

        if (trainerError || !trainer || !trainer.trainers) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Trainer not found',
          });
        }

        const trainerData = Array.isArray(trainer.trainers) ? trainer.trainers[0] : trainer.trainers;

        if (!trainerData || trainerData.verification_status !== 'approved') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This trainer is not verified',
          });
        }

        // Check for existing enrollment
        const { data: existingEnrollment } = await ctx.supabase
          .from('enrollments')
          .select('id, status')
          .eq('athlete_id', athleteId)
          .eq('trainer_id', input.trainer_id)
          .order('requested_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingEnrollment) {
          const { status } = existingEnrollment;

          // Handle different statuses
          if (status === 'approved') {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'You are already enrolled with this trainer',
            });
          } else if (['pending', 'viewing', 'accepting'].includes(status)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'You already have a pending enrollment request with this trainer',
            });
          } else if (['rejected', 'cancelled'].includes(status)) {
            // Update existing enrollment to pending
            const { data: updatedEnrollment, error: updateError } = await ctx.supabase
              .from('enrollments')
              .update({
                status: 'pending',
                requested_at: new Date().toISOString(),
                responded_at: null,
                viewed_at: null,
                accepting_at: null,
                notes: `Enrollment request from ${athleteName} for ${trainerData.trainer_code}`,
              })
              .eq('id', existingEnrollment.id)
              .select()
              .single();

            if (updateError) {
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update enrollment request',
              });
            }

            return {
              enrollment: updatedEnrollment,
              trainer: {
                full_name: trainer.full_name,
                email: '', // Email not available in public.users
                trainer_code: trainerData.trainer_code,
                specialization: trainerData.specialization,
              },
            };
          }
        }

        // Create new enrollment request
        const { data: newEnrollment, error: insertError } = await ctx.supabase
          .from('enrollments')
          .insert({
            athlete_id: athleteId,
            trainer_id: input.trainer_id,
            status: 'pending',
            requested_at: new Date().toISOString(),
            notes: `Enrollment request from ${athleteName} for ${trainerData.trainer_code}`,
          })
          .select()
          .single();

        if (insertError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create enrollment request',
          });
        }

        return {
          enrollment: newEnrollment,
          trainer: {
            full_name: trainer.full_name,
            email: '', // Email not available in public.users
            trainer_code: trainerData.trainer_code,
            specialization: trainerData.specialization,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Error requesting enrollment:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),
});
