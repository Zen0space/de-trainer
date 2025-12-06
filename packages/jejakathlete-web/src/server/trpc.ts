import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

// Context type for tRPC procedures
export interface Context {
  supabase: SupabaseClient;
  user: User | null;
}

// Create context for each request
export async function createContext(): Promise<Context> {
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

// Protected procedure - requires authenticated user
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
