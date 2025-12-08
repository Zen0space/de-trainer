'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export function AdminSignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 bg-bg-elevated hover:bg-bg-primary text-text-secondary hover:text-text-primary border border-border rounded-lg transition-colors"
    >
      Sign Out
    </button>
  );
}
