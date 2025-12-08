# tRPC Server Infrastructure

This directory contains the tRPC server setup for the JejakAthlete application, providing a type-safe API layer for both web and mobile clients.

## Architecture Overview

```
tRPC Server
├── trpc.ts                 # Core tRPC setup, context, and middleware
├── root.ts                 # Root router combining all feature routers
├── routers/                # Feature-specific routers
│   ├── auth.ts            # Authentication and user management
│   └── [feature].ts       # Additional feature routers
└── utils/                  # Shared utilities
    ├── authorization.ts   # Authorization helper functions
    └── supabase.ts        # Supabase helper functions
```

## Core Concepts

### Context

The tRPC context is created for each request and contains:
- `supabase`: Supabase client instance
- `user`: Authenticated user (from Supabase Auth)
- `role`: User's role (fetched from database in protected procedures)

### Procedures

#### `publicProcedure`
- No authentication required
- Use for public endpoints (e.g., login, register)

#### `protectedProcedure`
- Requires authenticated user
- Automatically fetches user role from database
- Use for endpoints that require authentication

#### `trainerProcedure`
- Requires trainer or admin role
- Extends `protectedProcedure`
- Use for trainer-specific operations

#### `athleteProcedure`
- Requires athlete or admin role
- Extends `protectedProcedure`
- Use for athlete-specific operations

## Creating a New Router

### 1. Create Router File

Create a new file in `routers/` directory:

```typescript
// routers/profiles.ts
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const profilesRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    // Implementation
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      full_name: z.string().optional(),
      bio: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),
});

export type ProfilesRouter = typeof profilesRouter;
```

### 2. Add to Root Router

Update `root.ts` to include your new router:

```typescript
import { router } from './trpc';
import { authRouter } from './routers/auth';
import { profilesRouter } from './routers/profiles';

export const appRouter = router({
  auth: authRouter,
  profiles: profilesRouter,
});

export type AppRouter = typeof appRouter;
```

### 3. Use in Client

The router is automatically available in the tRPC client:

```typescript
// Mobile or Web client
const profile = await trpc.profiles.getProfile.query();
```

## Authorization Patterns

### Pattern 1: Role-Based Access

Use role-specific procedures:

```typescript
export const workoutsRouter = router({
  createTemplate: trainerProcedure
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      // Only trainers and admins can access this
    }),
});
```

### Pattern 2: Ownership Verification

Verify user owns the resource:

```typescript
import { verifyOwnership } from '../utils/authorization';

export const profilesRouter = router({
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      if (!verifyOwnership(ctx.user.id, input.user_id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only update your own profile',
        });
      }
      // Update profile
    }),
});
```

### Pattern 3: Trainer-Athlete Relationship

Verify trainer has access to athlete data:

```typescript
import { verifyAthleteDataAccess } from '../utils/authorization';

export const bodyMetricsRouter = router({
  getAthleteMetrics: protectedProcedure
    .input(z.object({ athlete_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const hasAccess = await verifyAthleteDataAccess(
        ctx.supabase,
        ctx.user.id,
        ctx.role!,
        input.athlete_id
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Access denied',
        });
      }
      // Fetch metrics
    }),
});
```

### Pattern 4: Admin Override

Allow admins to access any data:

```typescript
import { isAdmin } from '../utils/authorization';

export const usersRouter = router({
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    if (!isAdmin(ctx.role!)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }
    // Fetch all users
  }),
});
```

## Error Handling

### Standard Error Codes

- `UNAUTHORIZED` - User not authenticated
- `FORBIDDEN` - User lacks permission
- `BAD_REQUEST` - Invalid input data
- `NOT_FOUND` - Resource not found
- `INTERNAL_SERVER_ERROR` - Unexpected error

### Example

```typescript
export const exampleRouter = router({
  getResource: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('resources')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch resource',
        });
      }

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Resource not found',
        });
      }

      return data;
    }),
});
```

## Type Safety

### Shared Types

All database types are defined in `@jejakathlete/shared`:

```typescript
import type { User, Athlete, Trainer } from '@jejakathlete/shared';
```

### Input Validation

Use Zod schemas for input validation:

```typescript
import { z } from 'zod';

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
});

export const profilesRouter = router({
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      // input is fully typed and validated
    }),
});
```

## Testing

### Unit Tests

Test individual procedures with mocked context:

```typescript
import { createCaller } from '../trpc';

describe('profilesRouter', () => {
  it('should update profile', async () => {
    const mockSupabase = createMockSupabaseClient();
    const caller = createCaller({
      supabase: mockSupabase,
      user: mockUser,
      role: 'athlete',
    });

    const result = await caller.profiles.updateProfile({
      full_name: 'John Doe',
    });

    expect(result.full_name).toBe('John Doe');
  });
});
```

### Integration Tests

Test full flows with real database:

```typescript
describe('Enrollment Flow', () => {
  it('should complete enrollment flow', async () => {
    // Create test users
    const trainer = await createTestUser('trainer');
    const athlete = await createTestUser('athlete');

    // Request enrollment
    const athleteCaller = createCaller({ user: athlete, role: 'athlete' });
    await athleteCaller.enrollments.requestEnrollment({
      trainer_code: trainer.trainer_code,
    });

    // Approve enrollment
    const trainerCaller = createCaller({ user: trainer, role: 'trainer' });
    await trainerCaller.enrollments.respondToEnrollment({
      enrollment_id: 1,
      status: 'approved',
    });

    // Verify access
    const hasAccess = await verifyTrainerAthleteAccess(
      supabase,
      trainer.id,
      athlete.id
    );
    expect(hasAccess).toBe(true);
  });
});
```

## Best Practices

1. **Always validate input** - Use Zod schemas for all inputs
2. **Check authorization** - Verify user has access before fetching data
3. **Handle errors gracefully** - Return appropriate error codes and messages
4. **Use transactions** - For operations that modify multiple tables
5. **Keep procedures focused** - Each procedure should do one thing well
6. **Document complex logic** - Add comments for non-obvious authorization rules
7. **Test authorization** - Write tests for all access control scenarios
8. **Avoid N+1 queries** - Use Supabase's query builder to join related data

## Migration from Turso

When migrating features from Turso to Supabase:

1. Create tRPC procedures for all data operations
2. Update mobile screens to use tRPC client
3. Test thoroughly with real data
4. Keep Turso code commented for rollback
5. Remove Turso code after verification

See the migration spec for detailed phase-by-phase instructions.
