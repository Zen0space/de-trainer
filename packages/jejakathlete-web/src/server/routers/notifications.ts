import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { isAdmin } from '../utils/authorization';

/**
 * Notifications Router
 * Handles user notifications for enrollment requests, workout assignments, events, etc.
 */
export const notificationsRouter = router({
  /**
   * Create a notification (system/trainer)
   * Creates a notification for a specific user
   */
  createNotification: protectedProcedure
    .input(
      z.object({
        user_id: z.string(),
        type: z.enum([
          'enrollment_request',
          'enrollment_response',
          'workout_assigned',
          'event_assigned',
          'test_result',
          'general',
        ]),
        title: z.string().min(1, 'Title is required'),
        message: z.string().min(1, 'Message is required'),
        data: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only trainers and admins can create notifications
      // (In production, this would typically be called by system processes)
      if (ctx.role !== 'trainer' && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only trainers and admins can create notifications',
        });
      }

      // Validate JSON data if provided
      if (input.data) {
        try {
          JSON.stringify(input.data);
        } catch (error) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid JSON data in notification',
          });
        }
      }

      const { data, error } = await ctx.supabase
        .from('notifications')
        .insert({
          user_id: input.user_id,
          type: input.type,
          title: input.title,
          message: input.message,
          data: input.data || null,
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create notification',
        });
      }

      return data;
    }),

  /**
   * Get user's notifications
   * Returns notifications ordered by created_at descending
   * Can filter by read status
   */
  getMyNotifications: protectedProcedure
    .input(
      z.object({
        unread_only: z.boolean().optional().default(false),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false });

      // Filter by read status if requested
      if (input?.unread_only) {
        query = query.eq('is_read', false);
      }

      // Apply pagination
      if (input?.limit) {
        query = query.limit(input.limit);
      }
      if (input?.offset) {
        query = query.range(input.offset, input.offset + (input?.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notifications',
        });
      }

      return {
        notifications: data,
        total: count || 0,
      };
    }),

  /**
   * Mark a notification as read
   * Sets is_read to true and read_at to current timestamp
   */
  markAsRead: protectedProcedure
    .input(
      z.object({
        notification_id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify notification belongs to user
      const { data: notification, error: fetchError } = await ctx.supabase
        .from('notifications')
        .select('user_id')
        .eq('id', input.notification_id)
        .single();

      if (fetchError || !notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      if (notification.user_id !== ctx.user.id && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only mark your own notifications as read',
        });
      }

      // Update notification
      const { data, error } = await ctx.supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', input.notification_id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to mark notification as read',
        });
      }

      return data;
    }),

  /**
   * Mark all notifications as read for the current user
   * Sets is_read to true and read_at to current timestamp for all unread notifications
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', ctx.user.id)
      .eq('is_read', false)
      .select();

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to mark all notifications as read',
      });
    }

    return {
      success: true,
      count: data.length,
    };
  }),

  /**
   * Get unread notification count
   * Returns the count of unread notifications for the current user
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const { count, error } = await ctx.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .eq('is_read', false);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch unread count',
      });
    }

    return { count: count || 0 };
  }),

  /**
   * Delete a notification
   * Allows users to delete their own notifications
   */
  deleteNotification: protectedProcedure
    .input(
      z.object({
        notification_id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify notification belongs to user
      const { data: notification, error: fetchError } = await ctx.supabase
        .from('notifications')
        .select('user_id')
        .eq('id', input.notification_id)
        .single();

      if (fetchError || !notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      if (notification.user_id !== ctx.user.id && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own notifications',
        });
      }

      // Delete notification
      const { error } = await ctx.supabase
        .from('notifications')
        .delete()
        .eq('id', input.notification_id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete notification',
        });
      }

      return { success: true };
    }),
});
