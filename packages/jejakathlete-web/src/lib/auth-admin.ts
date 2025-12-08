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
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/');
  }

  // Verify admin role
  const { data: userData, error } = await supabase
    .from('users')
    .select('role, id, full_name, username, email')
    .eq('id', session.user.id)
    .single();

  if (error || userData?.role !== 'admin') {
    await supabase.auth.signOut();
    redirect('/');
  }

  return {
    user: userData,
    session,
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
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('role, id, full_name, username, email')
    .eq('id', session.user.id)
    .single();

  if (error || userData?.role !== 'admin') {
    return null;
  }

  return userData;
}
