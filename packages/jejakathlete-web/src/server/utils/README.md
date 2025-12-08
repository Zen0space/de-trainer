# Server Utilities

This directory contains utility functions for tRPC procedures.

## Authorization Utilities (`authorization.ts`)

Helper functions for verifying access control in tRPC procedures.

### Functions

- `verifyTrainerAthleteAccess(supabase, trainerId, athleteId)` - Verify trainer has approved enrollment with athlete
- `verifyOwnership(userId, resourceUserId)` - Verify user owns a resource
- `isAdmin(role)` - Check if user has admin privileges
- `verifyAthleteDataAccess(supabase, userId, role, athleteId)` - Comprehensive athlete data access check
- `verifyTrainerDataAccess(userId, role, trainerId)` - Comprehensive trainer data access check
- `getTrainerId(supabase, userId)` - Get trainer ID for a user
- `getAthleteId(supabase, userId)` - Get athlete ID for a user

### Example Usage

```typescript
import { verifyAthleteDataAccess } from '../utils/authorization';

export const bodyMetricsRouter = router({
  getAthleteMetrics: protectedProcedure
    .input(z.object({ athlete_id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify access
      const hasAccess = await verifyAthleteDataAccess(
        ctx.supabase,
        ctx.user.id,
        ctx.role!,
        input.athlete_id
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this athlete\'s data',
        });
      }

      // Fetch data...
    }),
});
```

## Supabase Utilities (`supabase.ts`)

Helper functions for common Supabase operations.

### Functions

- `fetchCompleteProfile(supabase, userId)` - Fetch complete user profile with role-specific data
- `isUsernameAvailable(supabase, username, excludeUserId?)` - Check if username is available
- `isTrainerCodeAvailable(supabase, trainerCode, excludeUserId?)` - Check if trainer code is available
- `generateUniqueTrainerCode(supabase)` - Generate a unique trainer code

### Example Usage

```typescript
import { fetchCompleteProfile } from '../utils/supabase';

export const profilesRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await fetchCompleteProfile(ctx.supabase, ctx.user.id);
    
    if (!profile) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profile not found',
      });
    }

    return profile;
  }),
});
```
