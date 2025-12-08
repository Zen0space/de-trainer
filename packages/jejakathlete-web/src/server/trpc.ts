import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { UserRole } from '@jejakathlete/shared';

// Context type for tRPC procedures
export interface Context {
  supabase: SupabaseClient;
  user: User | null;
  role?: UserRole;
}

// Create context for each request
export async function createContext(opts?: { req?: Request }): Promise<Context> {
  // Check if there's a Bearer token in the Authorization header (for mobile)
  const authHeader = opts?.req?.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token) {
    console.log('🔵 [tRPC Context] Creating mobile client with Bearer token');
    
    // Mobile client with Bearer token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ [tRPC Context] Auth error:', authError);
    } else {
      console.log('✅ [tRPC Context] User authenticated:', {
        id: user?.id,
        email: user?.email,
      });
    }

    return {
      supabase,
      user,
    };
  }

  console.log('🔵 [tRPC Context] Creating web client with cookies');
  
  // Web client with cookies
  const supabase = await createSupabaseServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
  };
}

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Base procedures
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure - requires authenticated user and fetches role
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  // Fetch user role from database
  const { data: userData, error } = await ctx.supabase
    .from('users')
    .select('role')
    .eq('id', ctx.user.id)
    .single();

  if (error || !userData) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch user data',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      role: userData.role as UserRole,
    },
  });
});

// Trainer-only procedure - requires trainer or admin role
export const trainerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== 'trainer' && ctx.role !== 'admin' && ctx.role !== 'rekabytes-admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This action requires trainer privileges',
    });
  }

  return next({
    ctx: {
      ...ctx,
      role: ctx.role,
    },
  });
});

// Athlete-only procedure - requires athlete or admin role
export const athleteProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.role !== 'athlete' && ctx.role !== 'admin' && ctx.role !== 'rekabytes-admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This action requires athlete privileges',
    });
  }

  return next({
    ctx: {
      ...ctx,
      role: ctx.role,
    },
  });
});
