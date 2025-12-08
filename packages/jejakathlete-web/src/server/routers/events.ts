import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { verifyTrainerAthleteAccess, isAdmin } from '../utils/authorization';

/**
 * Events Router
 * Handles calendar events, event types, and participant management
 */
export const eventsRouter = router({
  /**
   * Get all event types (public)
   * Returns list of available event types with their colors and icons
   */
  getEventTypes: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('event_types')
      .select('*')
      .order('name');

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch event types',
      });
    }

    return data;
  }),

  /**
   * Create a new event (trainer only)
   * Creates an event and optionally assigns athletes
   */
  createEvent: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        event_type_id: z.number(),
        start_date: z.string(),
        end_date: z.string(),
        location: z.string().optional(),
        status: z.enum(['draft', 'upcoming', 'ongoing', 'completed', 'cancelled']).default('upcoming'),
        is_public: z.boolean().default(false),
        athlete_ids: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is trainer or admin
      if (ctx.role !== 'trainer' && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only trainers can create events',
        });
      }

      const { athlete_ids, ...eventData } = input;

      // Create the event
      const { data: event, error: eventError } = await ctx.supabase
        .from('events')
        .insert({
          ...eventData,
          created_by_user_id: ctx.user.id,
        })
        .select()
        .single();

      if (eventError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create event',
        });
      }

      // Assign athletes if provided
      if (athlete_ids && athlete_ids.length > 0) {
        const participants = athlete_ids.map((athlete_id) => ({
          event_id: event.id,
          athlete_id,
          assigned_by_user_id: ctx.user.id,
          status: 'invited' as const,
        }));

        const { error: participantsError } = await ctx.supabase
          .from('event_participants')
          .insert(participants);

        if (participantsError) {
          // Log error but don't fail the event creation
          console.error('Failed to assign athletes to event:', participantsError);
        }
      }

      return event;
    }),

  /**
   * List events created by the trainer
   * Returns all events with their type information
   */
  listMyEvents: protectedProcedure
    .input(
      z.object({
        status: z.enum(['draft', 'upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Verify user is trainer or admin
      if (ctx.role !== 'trainer' && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only trainers can list their events',
        });
      }

      let query = ctx.supabase
        .from('events')
        .select(`
          *,
          event_type:event_types(*)
        `)
        .eq('created_by_user_id', ctx.user.id)
        .order('start_date', { ascending: false });

      // Apply filters
      if (input?.status) {
        query = query.eq('status', input.status);
      }
      if (input?.start_date) {
        query = query.gte('start_date', input.start_date);
      }
      if (input?.end_date) {
        query = query.lte('end_date', input.end_date);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch events',
        });
      }

      return data;
    }),

  /**
   * Update an existing event (trainer only)
   * Only the creator can update their events
   */
  updateEvent: protectedProcedure
    .input(
      z.object({
        event_id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        event_type_id: z.number().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        location: z.string().optional(),
        status: z.enum(['draft', 'upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
        is_public: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { event_id, ...updates } = input;

      // Verify ownership
      const { data: event, error: fetchError } = await ctx.supabase
        .from('events')
        .select('created_by_user_id')
        .eq('id', event_id)
        .single();

      if (fetchError || !event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.created_by_user_id !== ctx.user.id && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own events',
        });
      }

      // Update the event
      const { data: updatedEvent, error: updateError } = await ctx.supabase
        .from('events')
        .update(updates)
        .eq('id', event_id)
        .select()
        .single();

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update event',
        });
      }

      return updatedEvent;
    }),

  /**
   * Delete an event (trainer only)
   * Only the creator can delete their events
   */
  deleteEvent: protectedProcedure
    .input(
      z.object({
        event_id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const { data: event, error: fetchError } = await ctx.supabase
        .from('events')
        .select('created_by_user_id')
        .eq('id', input.event_id)
        .single();

      if (fetchError || !event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.created_by_user_id !== ctx.user.id && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own events',
        });
      }

      // Delete the event (cascade will handle participants)
      const { error: deleteError } = await ctx.supabase
        .from('events')
        .delete()
        .eq('id', input.event_id);

      if (deleteError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete event',
        });
      }

      return { success: true };
    }),

  /**
   * Assign athletes to an event (trainer only)
   * Verifies trainer has access to the athletes
   */
  assignAthletes: protectedProcedure
    .input(
      z.object({
        event_id: z.number(),
        athlete_ids: z.array(z.string()).min(1, 'At least one athlete is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is trainer or admin
      if (ctx.role !== 'trainer' && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only trainers can assign athletes to events',
        });
      }

      // Verify event exists and user owns it
      const { data: event, error: eventError } = await ctx.supabase
        .from('events')
        .select('created_by_user_id')
        .eq('id', input.event_id)
        .single();

      if (eventError || !event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.created_by_user_id !== ctx.user.id && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only assign athletes to your own events',
        });
      }

      // Verify trainer has access to all athletes (unless admin)
      if (!isAdmin(ctx.role)) {
        for (const athlete_id of input.athlete_ids) {
          const hasAccess = await verifyTrainerAthleteAccess(
            ctx.supabase,
            ctx.user.id,
            athlete_id
          );

          if (!hasAccess) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: `You do not have access to athlete ${athlete_id}`,
            });
          }
        }
      }

      // Create participant records
      const participants = input.athlete_ids.map((athlete_id) => ({
        event_id: input.event_id,
        athlete_id,
        assigned_by_user_id: ctx.user.id,
        status: 'invited' as const,
      }));

      const { data, error } = await ctx.supabase
        .from('event_participants')
        .insert(participants)
        .select();

      if (error) {
        // Check for duplicate constraint violation
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'One or more athletes are already assigned to this event',
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to assign athletes to event',
        });
      }

      return data;
    }),

  /**
   * Get athlete's schedule (athlete only)
   * Returns events where athlete is a participant or public events
   */
  getMySchedule: protectedProcedure
    .input(
      z.object({
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        status: z.enum(['draft', 'upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      console.log('🔵 [getMySchedule] Fetching schedule for athlete:', ctx.user.id, {
        start_date: input?.start_date,
        end_date: input?.end_date,
        status: input?.status,
      });

      // Verify user is athlete or admin
      if (ctx.role !== 'athlete' && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only athletes can view their schedule',
        });
      }

      // Get events where user is a participant
      let participantQuery = ctx.supabase
        .from('event_participants')
        .select('event_id')
        .eq('athlete_id', ctx.user.id);

      const { data: participantEvents, error: participantError } = await participantQuery;

      if (participantError) {
        console.error('❌ [getMySchedule] Supabase error fetching participants:', {
          code: participantError.code,
          message: participantError.message,
          details: participantError.details,
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch participant events',
        });
      }

      console.log('✅ [getMySchedule] Found', participantEvents.length, 'participant events');

      const participantEventIds = participantEvents.map((p) => p.event_id);

      // Build query for events
      let query = ctx.supabase
        .from('events')
        .select(`
          *,
          event_type:event_types(*),
          created_by:users!events_created_by_user_id_fkey(id, full_name, avatar_url)
        `)
        .order('start_date', { ascending: true });

      // Filter by participant events or public events
      if (participantEventIds.length > 0) {
        query = query.or(`id.in.(${participantEventIds.join(',')}),is_public.eq.true`);
      } else {
        query = query.eq('is_public', true);
      }

      // Apply additional filters
      if (input?.start_date) {
        query = query.gte('start_date', input.start_date);
      }
      if (input?.end_date) {
        query = query.lte('end_date', input.end_date);
      }
      if (input?.status) {
        query = query.eq('status', input.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [getMySchedule] Supabase error fetching events:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch schedule',
        });
      }

      console.log('✅ [getMySchedule] Found', data.length, 'events in schedule');

      return data;
    }),
});
