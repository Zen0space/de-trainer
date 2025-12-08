/**
 * Phase 4 Migration: Calendar Events and Notifications
 * 
 * Migrates event and notification data from Turso (SQLite) to Supabase (PostgreSQL):
 * - event_types
 * - events
 * - event_participants
 * - event_reminders
 * - event_results
 * - notifications
 * 
 * Requirements: 13.4
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin operations
);

interface MigrationResult {
  success: boolean;
  message: string;
  stats: {
    event_types: number;
    events: number;
    event_participants: number;
    event_reminders: number;
    event_results: number;
    notifications: number;
  };
  errors: string[];
}

/**
 * Main migration function for Phase 4
 */
export async function migratePhase4EventsNotifications(
  tursoData: {
    event_types: any[];
    events: any[];
    event_participants: any[];
    event_reminders: any[];
    event_results: any[];
    notifications: any[];
  }
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    message: '',
    stats: {
      event_types: 0,
      events: 0,
      event_participants: 0,
      event_reminders: 0,
      event_results: 0,
      notifications: 0,
    },
    errors: [],
  };

  console.log('Starting Phase 4 migration: Calendar Events and Notifications');

  try {
    // Step 1: Migrate event types
    console.log('Migrating event types...');
    const eventTypesResult = await migrateEventTypes(tursoData.event_types);
    result.stats.event_types = eventTypesResult.count;
    if (eventTypesResult.errors.length > 0) {
      result.errors.push(...eventTypesResult.errors);
    }

    // Step 2: Migrate events
    console.log('Migrating events...');
    const eventsResult = await migrateEvents(tursoData.events);
    result.stats.events = eventsResult.count;
    if (eventsResult.errors.length > 0) {
      result.errors.push(...eventsResult.errors);
    }

    // Step 3: Migrate event participants
    console.log('Migrating event participants...');
    const participantsResult = await migrateEventParticipants(tursoData.event_participants);
    result.stats.event_participants = participantsResult.count;
    if (participantsResult.errors.length > 0) {
      result.errors.push(...participantsResult.errors);
    }

    // Step 4: Migrate event reminders
    console.log('Migrating event reminders...');
    const remindersResult = await migrateEventReminders(tursoData.event_reminders);
    result.stats.event_reminders = remindersResult.count;
    if (remindersResult.errors.length > 0) {
      result.errors.push(...remindersResult.errors);
    }

    // Step 5: Migrate event results
    console.log('Migrating event results...');
    const resultsResult = await migrateEventResults(tursoData.event_results);
    result.stats.event_results = resultsResult.count;
    if (resultsResult.errors.length > 0) {
      result.errors.push(...resultsResult.errors);
    }

    // Step 6: Migrate notifications
    console.log('Migrating notifications...');
    const notificationsResult = await migrateNotifications(tursoData.notifications);
    result.stats.notifications = notificationsResult.count;
    if (notificationsResult.errors.length > 0) {
      result.errors.push(...notificationsResult.errors);
    }

    // Verify data integrity
    console.log('Verifying data integrity...');
    const integrityCheck = await verifyDataIntegrity(tursoData, result.stats);
    if (!integrityCheck.success) {
      result.errors.push(...integrityCheck.errors);
      result.success = false;
    }

    if (result.errors.length === 0) {
      result.message = 'Phase 4 migration completed successfully';
    } else {
      result.success = false;
      result.message = `Phase 4 migration completed with ${result.errors.length} errors`;
    }

    console.log('Phase 4 migration summary:', result.stats);
    return result;
  } catch (error) {
    console.error('Phase 4 migration failed:', error);
    result.success = false;
    result.message = `Phase 4 migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

/**
 * Migrate event_types table
 */
async function migrateEventTypes(eventTypes: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const eventType of eventTypes) {
    try {
      const { error } = await supabase.from('event_types').upsert({
        id: eventType.id,
        name: eventType.name,
        color: eventType.color,
        icon: eventType.icon,
        description: eventType.description,
        created_at: eventType.created_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Event type ${eventType.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Event type ${eventType.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Migrate events table
 */
async function migrateEvents(events: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const event of events) {
    try {
      const { error } = await supabase.from('events').upsert({
        id: event.id,
        title: event.title,
        description: event.description,
        event_type_id: event.event_type_id,
        created_by_user_id: event.created_by_user_id,
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location,
        status: event.status,
        is_public: event.is_public,
        created_at: event.created_at,
        updated_at: event.updated_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Event ${event.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Migrate event_participants table
 */
async function migrateEventParticipants(participants: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const participant of participants) {
    try {
      const { error } = await supabase.from('event_participants').upsert({
        id: participant.id,
        event_id: participant.event_id,
        athlete_id: participant.athlete_id,
        assigned_by_user_id: participant.assigned_by_user_id,
        status: participant.status,
        created_at: participant.created_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Event participant ${participant.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Event participant ${participant.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Migrate event_reminders table
 */
async function migrateEventReminders(reminders: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const reminder of reminders) {
    try {
      const { error } = await supabase.from('event_reminders').upsert({
        id: reminder.id,
        event_id: reminder.event_id,
        user_id: reminder.user_id,
        reminder_time: reminder.reminder_time,
        sent: reminder.sent,
        created_at: reminder.created_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Event reminder ${reminder.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Event reminder ${reminder.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Migrate event_results table
 */
async function migrateEventResults(results: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const result of results) {
    try {
      const { error } = await supabase.from('event_results').upsert({
        id: result.id,
        event_id: result.event_id,
        athlete_id: result.athlete_id,
        result_data: result.result_data,
        notes: result.notes,
        created_at: result.created_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Event result ${result.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Event result ${result.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Migrate notifications table
 */
async function migrateNotifications(notifications: any[]): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const notification of notifications) {
    try {
      // Validate JSON data if present
      let validatedData = notification.data;
      if (validatedData && typeof validatedData === 'string') {
        try {
          validatedData = JSON.parse(validatedData);
        } catch (e) {
          errors.push(`Notification ${notification.id}: Invalid JSON data`);
          continue;
        }
      }

      const { error } = await supabase.from('notifications').upsert({
        id: notification.id,
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: validatedData,
        is_read: notification.is_read,
        read_at: notification.read_at,
        created_at: notification.created_at,
      }, {
        onConflict: 'id'
      });

      if (error) {
        errors.push(`Notification ${notification.id}: ${error.message}`);
      } else {
        count++;
      }
    } catch (error) {
      errors.push(`Notification ${notification.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { count, errors };
}

/**
 * Verify data integrity after migration
 */
async function verifyDataIntegrity(
  tursoData: any,
  stats: MigrationResult['stats']
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Verify record counts match
  if (stats.event_types !== tursoData.event_types.length) {
    errors.push(`Event type count mismatch: Expected ${tursoData.event_types.length}, got ${stats.event_types}`);
  }

  if (stats.events !== tursoData.events.length) {
    errors.push(`Event count mismatch: Expected ${tursoData.events.length}, got ${stats.events}`);
  }

  if (stats.event_participants !== tursoData.event_participants.length) {
    errors.push(`Event participant count mismatch: Expected ${tursoData.event_participants.length}, got ${stats.event_participants}`);
  }

  if (stats.event_reminders !== tursoData.event_reminders.length) {
    errors.push(`Event reminder count mismatch: Expected ${tursoData.event_reminders.length}, got ${stats.event_reminders}`);
  }

  if (stats.event_results !== tursoData.event_results.length) {
    errors.push(`Event result count mismatch: Expected ${tursoData.event_results.length}, got ${stats.event_results}`);
  }

  if (stats.notifications !== tursoData.notifications.length) {
    errors.push(`Notification count mismatch: Expected ${tursoData.notifications.length}, got ${stats.notifications}`);
  }

  // Sample verification: Check a few random records
  if (tursoData.events.length > 0) {
    const sampleEvent = tursoData.events[0];
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', sampleEvent.id)
      .single();

    if (error || !data) {
      errors.push(`Sample event verification failed: ${error?.message || 'Not found'}`);
    } else {
      // Verify key fields match
      if (data.title !== sampleEvent.title) {
        errors.push(`Event ${sampleEvent.id} title mismatch`);
      }
      if (data.event_type_id !== sampleEvent.event_type_id) {
        errors.push(`Event ${sampleEvent.id} event_type_id mismatch`);
      }
      if (data.created_by_user_id !== sampleEvent.created_by_user_id) {
        errors.push(`Event ${sampleEvent.id} created_by_user_id mismatch`);
      }
    }
  }

  // Verify notification JSON data integrity
  if (tursoData.notifications.length > 0) {
    const sampleNotification = tursoData.notifications.find((n: any) => n.data);
    if (sampleNotification) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', sampleNotification.id)
        .single();

      if (error || !data) {
        errors.push(`Sample notification verification failed: ${error?.message || 'Not found'}`);
      } else {
        // Verify JSON data is valid
        if (data.data) {
          try {
            JSON.stringify(data.data);
          } catch (e) {
            errors.push(`Notification ${sampleNotification.id} has invalid JSON data`);
          }
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Example usage:
 * 
 * // Load data from Turso
 * const tursoData = {
 *   event_types: await tursoDb.query('SELECT * FROM event_types'),
 *   events: await tursoDb.query('SELECT * FROM events'),
 *   event_participants: await tursoDb.query('SELECT * FROM event_participants'),
 *   event_reminders: await tursoDb.query('SELECT * FROM event_reminders'),
 *   event_results: await tursoDb.query('SELECT * FROM event_results'),
 *   notifications: await tursoDb.query('SELECT * FROM notifications'),
 * };
 * 
 * // Run migration
 * const result = await migratePhase4EventsNotifications(tursoData);
 * console.log(result);
 */
