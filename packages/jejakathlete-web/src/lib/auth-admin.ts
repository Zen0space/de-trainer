import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Server-side admin authentication check
 * Use this in Server Components and Server Actions
 */
export async function requireAdmin() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/');
  }

  // Verify admin role
  const { data: userData, error } = await supabase
    .from('users')
    .select('role, id, full_name, username, email')
    .eq('id', user.id)
    .single();

  if (error || userData?.role !== 'admin') {
    redirect('/');
  }

  return {
    user: userData,
    supabase,
  };
}

/**
 * Check if current user is admin (non-redirecting)
 * Returns null if not admin
 */
export async function getAdminUser() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('role, id, full_name, username, email')
    .eq('id', user.id)
    .single();

  if (error || userData?.role !== 'admin') {
    return null;
  }

  return userData;
}
