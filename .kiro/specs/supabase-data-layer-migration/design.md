# Design Document

## Overview

This design document outlines the architecture and implementation strategy for migrating the Jejak Atlet application from Turso (SQLite) to Supabase (PostgreSQL) using tRPC as a unified, type-safe API layer. The migration will be executed in four phases, each focusing on a distinct feature domain. The design ensures data integrity, maintains security through layered authorization, and provides a clear rollback strategy.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (React Native)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Athlete    │  │   Trainer    │  │   Shared     │      │
│  │   Screens    │  │   Screens    │  │  Components  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  tRPC Client    │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                             │ HTTPS
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                  Web App (Next.js)                            │
│  ┌──────────────┐                    ┌──────────────┐        │
│  │    Admin     │                    │  tRPC Client │        │
│  │  Dashboard   │────────────────────│  (Web Admin) │        │
│  └──────────────┘                    └──────┬───────┘        │
│                                              │                │
│                   ┌──────────────────────────▼─────────┐     │
│                   │      tRPC Server (API Layer)       │     │
│                   │  ┌────────────────────────────┐    │     │
│                   │  │  Feature Routers:          │    │     │
│                   │  │  - profiles                │    │     │
│                   │  │  - enrollments             │    │     │
│                   │  │  - bodyMetrics             │    │     │
│                   │  │  - testResults             │    │     │
│                   │  │  - workouts                │    │     │
│                   │  │  - events                  │    │     │
│                   │  │  - notifications           │    │     │
│                   │  └────────────────────────────┘    │     │
│                   │                                     │     │
│                   │  ┌────────────────────────────┐    │     │
│                   │  │  Authorization Middleware  │    │     │
│                   │  └────────────────────────────┘    │     │
│                   │                                     │     │
│                   │  ┌────────────────────────────┐    │     │
│                   │  │   Supabase Client          │    │     │
│                   │  └────────┬───────────────────┘    │     │
│                   └───────────┼────────────────────────┘     │
└───────────────────────────────┼──────────────────────────────┘
                                │
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                    Supabase (PostgreSQL)                      │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Tables: users, trainers, athletes, enrollments,   │      │
│  │  test_results, workout_templates, events, etc.     │      │
│  └────────────────────────────────────────────────────┘      │
│  ┌────────────────────────────────────────────────────┐      │
│  │  RLS Policies (Backup Security Layer)              │      │
│  └────────────────────────────────────────────────────┘      │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Storage (Avatars, Images)                         │      │
│  └────────────────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Mobile**: React Native, Expo, tRPC Client (@trpc/client)
- **Web**: Next.js 14, tRPC Client, React Query
- **API Layer**: tRPC Server (@trpc/server), Zod validation
- **Database**: Supabase (PostgreSQL), Supabase JS Client
- **Type Safety**: TypeScript, Zod schemas
- **Authentication**: Supabase Auth (existing)


## Components and Interfaces

### tRPC Router Structure

```typescript
// packages/jejakathlete-web/src/server/routers/
├── profiles.ts          // User profile management
├── enrollments.ts       // Trainer-athlete relationships
├── bodyMetrics.ts       // Body measurements tracking
├── testResults.ts       // Fitness test results
├── workouts.ts          // Workout templates and assignments
├── events.ts            // Calendar events and participants
├── notifications.ts     // User notifications
└── index.ts            // Root router combining all routers
```

### Key Interfaces

#### Profile Router Interface
```typescript
export const profilesRouter = router({
  // Get current user's profile
  getProfile: protectedProcedure
    .query(async ({ ctx }) => { ... }),
  
  // Update user profile
  updateProfile: protectedProcedure
    .input(z.object({
      full_name: z.string().optional(),
      bio: z.string().optional(),
      phone: z.string().optional(),
      // ... other fields
    }))
    .mutation(async ({ ctx, input }) => { ... }),
  
  // Upload avatar
  uploadAvatar: protectedProcedure
    .input(z.object({
      file: z.string(), // base64 encoded
      filename: z.string(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),
});
```

#### Enrollments Router Interface
```typescript
export const enrollmentsRouter = router({
  // Request enrollment (athlete)
  requestEnrollment: protectedProcedure
    .input(z.object({
      trainer_code: z.string(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),
  
  // List pending requests (trainer)
  listPendingRequests: protectedProcedure
    .query(async ({ ctx }) => { ... }),
  
  // Approve/reject enrollment (trainer)
  respondToEnrollment: protectedProcedure
    .input(z.object({
      enrollment_id: z.number(),
      status: z.enum(['approved', 'rejected']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),
  
  // List my athletes (trainer)
  listMyAthletes: protectedProcedure
    .query(async ({ ctx }) => { ... }),
});
```

#### Workouts Router Interface
```typescript
export const workoutsRouter = router({
  // Create workout template (trainer)
  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      exercises: z.array(z.object({
        exercise_id: z.number(),
        order_index: z.number(),
        sets: z.number(),
        reps: z.number(),
        rest_time: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => { ... }),
  
  // Assign workout to athlete (trainer)
  assignWorkout: protectedProcedure
    .input(z.object({
      template_id: z.number(),
      athlete_id: z.string(),
      scheduled_date: z.string(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),
  
  // Get my workouts (athlete)
  getMyWorkouts: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'in_progress', 'completed']).optional(),
    }))
    .query(async ({ ctx, input }) => { ... }),
  
  // Update workout progress (athlete)
  updateProgress: protectedProcedure
    .input(z.object({
      assignment_id: z.number(),
      exercise_id: z.number(),
      set_number: z.number(),
      completed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),
});
```


### Authorization Middleware

```typescript
// packages/jejakathlete-web/src/server/trpc.ts

import { createServerClient } from '@supabase/ssr';
import { TRPCError } from '@trpc/server';

// Create context with Supabase client and user
export const createContext = async ({ req, res }) => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get, set, remove } }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  
  return {
    supabase,
    user,
  };
};

// Protected procedure - requires authentication
export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  
  // Fetch user role from database
  const { data: userData } = await ctx.supabase
    .from('users')
    .select('role')
    .eq('id', ctx.user.id)
    .single();
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      role: userData?.role,
    },
  });
});

// Trainer-only procedure
export const trainerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== 'trainer' && ctx.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

// Athlete-only procedure
export const athleteProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== 'athlete' && ctx.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
```

### Authorization Helpers

```typescript
// packages/jejakathlete-web/src/server/utils/authorization.ts

/**
 * Verify trainer has access to athlete data
 */
export async function verifyTrainerAthleteAccess(
  supabase: SupabaseClient,
  trainerId: string,
  athleteId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('enrollments')
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('athlete_id', athleteId)
    .eq('status', 'approved')
    .single();
  
  return !!data;
}

/**
 * Verify user owns resource
 */
export function verifyOwnership(
  userId: string,
  resourceUserId: string
): boolean {
  return userId === resourceUserId;
}

/**
 * Check if user is admin
 */
export function isAdmin(role: string): boolean {
  return role === 'admin' || role === 'rekabytes-admin';
}
```

## Data Models

### Core Type Definitions

```typescript
// packages/shared/src/types/database.ts

export interface User {
  id: string;
  full_name: string | null;
  username: string | null;
  role: 'athlete' | 'trainer' | 'admin' | 'rekabytes-admin';
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfiling {
  user_id: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  date_of_birth: string | null;
  gender: string | null;
  bio: string | null;
  social_links: Record<string, string> | null;
  preferences: Record<string, any> | null;
}

export interface Enrollment {
  id: number;
  athlete_id: string;
  trainer_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  responded_at: string | null;
  notes: string | null;
}

export interface BodyMetric {
  id: number;
  athlete_id: string;
  measurement_date: string;
  weight: number | null;
  height: number | null;
  muscle_mass: number | null;
  body_fat_percentage: number | null;
  bmi: number | null;
  notes: string | null;
}

export interface WorkoutTemplate {
  id: number;
  trainer_id: string;
  name: string;
  description: string | null;
  exercises: WorkoutExercise[];
}

export interface WorkoutAssignment {
  id: number;
  workout_template_id: number;
  athlete_id: string;
  trainer_id: string;
  scheduled_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  started_at: string | null;
  completed_at: string | null;
}

export interface Event {
  id: number;
  title: string;
  description: string | null;
  event_type_id: number;
  created_by_user_id: string;
  start_date: string;
  end_date: string;
  location: string | null;
  status: 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  is_public: boolean;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties. Many criteria related to architecture, documentation, and code organization are not testable as properties but will be enforced through code review and development practices.

Key observations:
- Data isolation properties (5.5, 6.5, 7.5, 10.4) all verify the same pattern: users only see their own data
- Authorization properties (11.1-11.5) verify access control across different user roles
- CRUD properties (2.1, 2.2, 4.1, 5.1, etc.) verify basic create/read/update operations
- Migration properties (13.1-13.4) verify data integrity during migration
- Ordering properties (5.2, 6.4, 10.2) verify correct sorting of results

### Core Properties

**Property 1: Profile retrieval completeness**
*For any* authenticated user, retrieving their profile should return all profile data including user, user_profiling, and role-specific tables (trainers or athletes)
**Validates: Requirements 2.1, 3.1, 3.5**

**Property 2: Profile update persistence**
*For any* authenticated user and valid profile update, after updating the profile, retrieving it should reflect all the changes made
**Validates: Requirements 2.2, 3.2**

**Property 3: Avatar upload round-trip**
*For any* authenticated user and valid image file, after uploading an avatar, the user's avatar_url should be set and the file should be retrievable from Supabase Storage
**Validates: Requirements 2.4**

**Property 4: Migration data preservation**
*For any* user record in Turso, after migration to Supabase, all fields (full_name, username, role, avatar_url, phone, address, bio, sport, level, trainer_code, etc.) should have identical values
**Validates: Requirements 2.3, 2.5, 13.1, 13.2, 13.3, 13.4**

**Property 5: Trainer code uniqueness**
*For any* two trainers in the system, their trainer_code values should be different
**Validates: Requirements 3.4**

**Property 6: Enrollment creation with pending status**
*For any* athlete requesting enrollment with a valid trainer_code, a new enrollment record should be created with status 'pending' and the current timestamp in requested_at
**Validates: Requirements 4.1**

**Property 7: Enrollment filtering by trainer**
*For any* trainer viewing pending requests, all returned enrollments should have status 'pending' and trainer_id matching the authenticated trainer
**Validates: Requirements 4.2**

**Property 8: Enrollment status update with timestamp**
*For any* enrollment being approved or rejected, the status should be updated to the specified value and responded_at should be set to the current timestamp
**Validates: Requirements 4.3, 4.4**

**Property 9: Enrollment uniqueness constraint**
*For any* athlete-trainer pair, attempting to create a second enrollment should fail, ensuring only one enrollment exists per pair
**Validates: Requirements 4.5, 9.5**

**Property 10: Body metrics recording**
*For any* athlete recording body metrics with valid values, a new record should be created in athlete_body_metrics with all specified fields (weight, height, muscle_mass, body_fat_percentage, bmi)
**Validates: Requirements 5.1, 5.3**

**Property 11: Metrics history ordering**
*For any* athlete viewing their metrics history, all returned records should belong to that athlete and be ordered by measurement_date in descending order
**Validates: Requirements 5.2**

**Property 12: Metrics update with timestamp**
*For any* existing metrics record being updated, the fields should change to the new values and updated_at should be set to the current timestamp
**Validates: Requirements 5.4**

**Property 13: Data isolation by athlete**
*For any* athlete querying their own data (metrics, test results, workouts, notifications), all returned records should have athlete_id or user_id matching the authenticated user's id
**Validates: Requirements 5.5, 6.5, 10.4**

**Property 14: Test result recording with complete information**
*For any* athlete recording a test result, the record should be created with athlete_id, test_id, result_value, test_date, and when retrieved, should include joined data from tests and fitness_components tables
**Validates: Requirements 6.1, 6.2**

**Property 15: Personal record detection**
*For any* new test result, if it represents an improvement based on the test's improvement_direction (higher or lower), the is_best_record flag should be set to true and previous records for that test should have is_best_record set to false
**Validates: Requirements 6.3**

**Property 16: Test results ordering**
*For any* athlete viewing their test history, all returned results should belong to that athlete and be ordered by test_date in descending order
**Validates: Requirements 6.4**

**Property 17: Workout template creation with exercises**
*For any* trainer creating a workout template with exercises, the template should be created in workout_templates and all exercises should be created in workout_exercises with the correct order_index
**Validates: Requirements 7.1, 7.2**

**Property 18: Workout assignment creation**
*For any* trainer assigning a workout to an athlete, a workout_assignment record should be created linking the template_id, athlete_id, trainer_id, and scheduled_date
**Validates: Requirements 7.3**

**Property 19: Template exercises ordering**
*For any* workout template being retrieved, all associated exercises should be included and ordered by order_index in ascending order
**Validates: Requirements 7.4**

**Property 20: Template filtering by trainer**
*For any* trainer viewing their templates, all returned templates should have trainer_id matching the authenticated trainer
**Validates: Requirements 7.5**

**Property 21: Workout status transitions with timestamps**
*For any* workout assignment, when status changes from 'pending' to 'in_progress', started_at should be set; when changing to 'completed', completed_at should be set
**Validates: Requirements 8.1, 8.3**

**Property 22: Workout progress tracking**
*For any* athlete completing a set in a workout, a workout_session_progress record should be created or updated with the completed flag and completed_at timestamp
**Validates: Requirements 8.2**

**Property 23: Workout completion percentage calculation**
*For any* workout assignment, the completion percentage should equal (completed sets / total sets) * 100, where total sets is the sum of all sets across all exercises in the template
**Validates: Requirements 8.4**

**Property 24: Workout progress authorization**
*For any* workout progress update, it should only succeed if the athlete_id in the workout_assignment matches the authenticated user's id
**Validates: Requirements 8.5**

**Property 25: Event creation with type information**
*For any* trainer creating an event, the event should be created in the events table and when retrieved, should include joined data from event_types table (name, color, icon)
**Validates: Requirements 9.1, 9.3**

**Property 26: Event participant assignment**
*For any* trainer assigning athletes to an event, event_participants records should be created for each athlete with the correct event_id, athlete_id, and assigned_by_user_id
**Validates: Requirements 9.2**

**Property 27: Athlete schedule filtering**
*For any* athlete viewing their schedule, all returned events should either have the athlete as a participant OR have is_public set to true
**Validates: Requirements 9.4**

**Property 28: Notification creation and retrieval**
*For any* notification being created for a user, it should be inserted with user_id, type, title, message, and when the user retrieves unread notifications, it should be included if is_read is false
**Validates: Requirements 10.1, 10.2**

**Property 29: Notification ordering**
*For any* user viewing notifications, all returned notifications should belong to that user and be ordered by created_at in descending order
**Validates: Requirements 10.2**

**Property 30: Notification mark as read**
*For any* notification being marked as read, is_read should be set to true and read_at should be set to the current timestamp
**Validates: Requirements 10.3**

**Property 31: Notification JSON validation**
*For any* notification with a non-null data field, the data should be valid JSON and parseable into the expected structure for that notification type
**Validates: Requirements 10.5**

**Property 32: Authentication verification**
*For any* protected tRPC procedure call, if the user is not authenticated (no valid session), the procedure should throw an UNAUTHORIZED error
**Validates: Requirements 11.1**

**Property 33: Athlete data authorization**
*For any* athlete requesting their own data, the request should succeed; for any athlete requesting another athlete's data, the request should fail with FORBIDDEN error
**Validates: Requirements 11.2**

**Property 34: Trainer-athlete enrollment verification**
*For any* trainer requesting an athlete's data, the request should succeed only if an approved enrollment exists between them; otherwise it should fail with FORBIDDEN error
**Validates: Requirements 11.3**

**Property 35: Admin access privileges**
*For any* user with role 'admin' or 'rekabytes-admin', requests for any data should succeed regardless of ownership or enrollment relationships
**Validates: Requirements 11.4**

**Property 36: Authorization error handling**
*For any* unauthorized request (failed authentication or authorization), the tRPC server should return an appropriate error (UNAUTHORIZED or FORBIDDEN) without exposing sensitive information in the error message
**Validates: Requirements 11.5**

**Property 37: Error code consistency**
*For any* Supabase error or validation failure, the tRPC server should return a consistent error structure with appropriate error codes and user-friendly messages
**Validates: Requirements 14.3, 14.4**


## Error Handling

### Error Categories

1. **Authentication Errors**
   - Missing or invalid session token
   - Expired session
   - Return: `UNAUTHORIZED` with message "Authentication required"

2. **Authorization Errors**
   - User lacks permission for requested resource
   - Athlete accessing another athlete's data
   - Trainer accessing non-enrolled athlete's data
   - Return: `FORBIDDEN` with message "Access denied"

3. **Validation Errors**
   - Invalid input data (Zod validation failures)
   - Missing required fields
   - Invalid data types or formats
   - Return: `BAD_REQUEST` with detailed field-level errors

4. **Database Errors**
   - Unique constraint violations
   - Foreign key violations
   - Connection failures
   - Return: `INTERNAL_SERVER_ERROR` with user-friendly message

5. **Not Found Errors**
   - Requested resource doesn't exist
   - Return: `NOT_FOUND` with message "Resource not found"

### Error Handling Strategy

```typescript
// Example error handling in tRPC procedure
export const updateProfile = protectedProcedure
  .input(updateProfileSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      // Validate ownership
      if (ctx.user.id !== input.user_id && !isAdmin(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own profile',
        });
      }
      
      // Perform update
      const { data, error } = await ctx.supabase
        .from('users')
        .update(input)
        .eq('id', input.user_id)
        .select()
        .single();
      
      if (error) {
        // Handle specific database errors
        if (error.code === '23505') { // Unique violation
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Username already taken',
          });
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }
      
      return data;
    } catch (error) {
      // Re-throw TRPCErrors
      if (error instanceof TRPCError) {
        throw error;
      }
      
      // Log unexpected errors
      console.error('Unexpected error in updateProfile:', error);
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  });
```

### Mobile App Error Handling

```typescript
// Example error handling in mobile app
const { mutate: updateProfile, isLoading } = trpc.profiles.updateProfile.useMutation({
  onSuccess: (data) => {
    showToast('Profile updated successfully', 'success');
  },
  onError: (error) => {
    // Handle different error types
    if (error.data?.code === 'UNAUTHORIZED') {
      // Redirect to login
      navigation.navigate('Auth');
    } else if (error.data?.code === 'FORBIDDEN') {
      showToast('You do not have permission to perform this action', 'error');
    } else if (error.data?.code === 'BAD_REQUEST') {
      // Show validation errors
      showToast(error.message, 'error');
    } else {
      // Generic error
      showToast('Something went wrong. Please try again.', 'error');
    }
  },
});
```

## Testing Strategy

### Dual Testing Approach

This migration will use both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties that should hold across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

### Unit Testing

**Framework**: Jest with @testing-library/react for React components

**Scope**:
- tRPC procedure logic (mocked Supabase client)
- Authorization middleware
- Helper functions
- Mobile screen components
- Error handling paths

**Example Unit Tests**:
```typescript
describe('profilesRouter.updateProfile', () => {
  it('should update user profile successfully', async () => {
    const mockSupabase = createMockSupabaseClient();
    const caller = createCaller({ supabase: mockSupabase, user: mockUser });
    
    const result = await caller.profiles.updateProfile({
      full_name: 'John Doe',
      bio: 'Athlete',
    });
    
    expect(result.full_name).toBe('John Doe');
    expect(mockSupabase.from).toHaveBeenCalledWith('users');
  });
  
  it('should throw FORBIDDEN when updating another user\'s profile', async () => {
    const caller = createCaller({ user: mockUser, role: 'athlete' });
    
    await expect(
      caller.profiles.updateProfile({
        user_id: 'different-user-id',
        full_name: 'Hacker',
      })
    ).rejects.toThrow('FORBIDDEN');
  });
});
```

### Property-Based Testing

**Framework**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**: Each property test should run a minimum of 100 iterations

**Tagging Convention**: Each property-based test must include a comment with this exact format:
```typescript
// **Feature: supabase-data-layer-migration, Property {number}: {property_text}**
```

**Example Property Tests**:

```typescript
import fc from 'fast-check';

describe('Property Tests: Profile Operations', () => {
  // **Feature: supabase-data-layer-migration, Property 2: Profile update persistence**
  it('should persist all profile updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          full_name: fc.string({ minLength: 1, maxLength: 100 }),
          bio: fc.option(fc.string({ maxLength: 500 })),
          phone: fc.option(fc.string()),
        }),
        async (profileUpdate) => {
          // Create test user
          const user = await createTestUser();
          const caller = createCaller({ user, role: 'athlete' });
          
          // Update profile
          await caller.profiles.updateProfile({
            ...profileUpdate,
            user_id: user.id,
          });
          
          // Retrieve profile
          const retrieved = await caller.profiles.getProfile();
          
          // Verify all fields match
          expect(retrieved.full_name).toBe(profileUpdate.full_name);
          expect(retrieved.bio).toBe(profileUpdate.bio);
          expect(retrieved.phone).toBe(profileUpdate.phone);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // **Feature: supabase-data-layer-migration, Property 13: Data isolation by athlete**
  it('should only return data belonging to authenticated athlete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          weight: fc.float({ min: 30, max: 200 }),
          height: fc.float({ min: 100, max: 250 }),
        }), { minLength: 1, maxLength: 10 }),
        async (metricsArray) => {
          // Create two athletes
          const athlete1 = await createTestUser('athlete');
          const athlete2 = await createTestUser('athlete');
          
          // Create metrics for both athletes
          for (const metrics of metricsArray) {
            await createBodyMetrics(athlete1.id, metrics);
            await createBodyMetrics(athlete2.id, metrics);
          }
          
          // Athlete 1 queries their metrics
          const caller1 = createCaller({ user: athlete1, role: 'athlete' });
          const athlete1Metrics = await caller1.bodyMetrics.getMyMetrics();
          
          // Verify all returned metrics belong to athlete 1
          expect(athlete1Metrics.every(m => m.athlete_id === athlete1.id)).toBe(true);
          expect(athlete1Metrics.length).toBe(metricsArray.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**Scope**:
- End-to-end flows (create workout → assign → complete)
- Mobile app tRPC client integration
- Supabase RLS policy verification
- Migration data integrity

**Example Integration Test**:
```typescript
describe('Integration: Workout Assignment Flow', () => {
  it('should complete full workout assignment and tracking flow', async () => {
    // Create trainer and athlete
    const trainer = await createTestUser('trainer');
    const athlete = await createTestUser('athlete');
    
    // Create enrollment
    await createEnrollment(athlete.id, trainer.id, 'approved');
    
    // Trainer creates workout template
    const trainerCaller = createCaller({ user: trainer, role: 'trainer' });
    const template = await trainerCaller.workouts.createTemplate({
      name: 'Test Workout',
      exercises: [
        { exercise_id: 1, order_index: 0, sets: 3, reps: 10, rest_time: 60 },
      ],
    });
    
    // Trainer assigns workout
    const assignment = await trainerCaller.workouts.assignWorkout({
      template_id: template.id,
      athlete_id: athlete.id,
      scheduled_date: '2024-01-01',
    });
    
    // Athlete starts workout
    const athleteCaller = createCaller({ user: athlete, role: 'athlete' });
    await athleteCaller.workouts.startWorkout({ assignment_id: assignment.id });
    
    // Athlete completes sets
    for (let set = 1; set <= 3; set++) {
      await athleteCaller.workouts.updateProgress({
        assignment_id: assignment.id,
        exercise_id: 1,
        set_number: set,
        completed: true,
      });
    }
    
    // Athlete finishes workout
    await athleteCaller.workouts.finishWorkout({ assignment_id: assignment.id });
    
    // Verify final state
    const finalAssignment = await athleteCaller.workouts.getWorkout({
      assignment_id: assignment.id,
    });
    
    expect(finalAssignment.status).toBe('completed');
    expect(finalAssignment.completed_at).toBeTruthy();
  });
});
```

### Migration Testing

**Data Integrity Verification**:
```typescript
describe('Migration: Data Integrity', () => {
  it('should preserve all user data during migration', async () => {
    // Get all users from Turso
    const tursoUsers = await tursoDb.query('SELECT * FROM users');
    
    // Run migration
    await migrateUsers();
    
    // Get all users from Supabase
    const { data: supabaseUsers } = await supabase
      .from('users')
      .select('*');
    
    // Verify counts match
    expect(supabaseUsers.length).toBe(tursoUsers.length);
    
    // Verify each user's data matches
    for (const tursoUser of tursoUsers) {
      const supabaseUser = supabaseUsers.find(u => u.id === tursoUser.id);
      expect(supabaseUser).toBeDefined();
      expect(supabaseUser.full_name).toBe(tursoUser.full_name);
      expect(supabaseUser.username).toBe(tursoUser.username);
      expect(supabaseUser.role).toBe(tursoUser.role);
      // ... verify all fields
    }
  });
});
```

