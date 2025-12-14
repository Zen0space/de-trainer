'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      
      // Sign in with email/password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (!data.session || !data.user) {
        setError('Login failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userError || userData?.role !== 'admin') {
        await supabase.auth.signOut();
        setError('Access denied. Admin credentials required.');
        setIsLoading(false);
        return;
      }

      // Success - navigate to dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-secondary border border-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent flex items-center justify-center">
              <span className="text-white text-xl font-bold">JA</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Admin Login</h1>
            <p className="text-text-secondary mt-2">Sign in to access the admin panel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
