'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '../../auth/_components/AuthCard';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { loginSchema } from '@jejakathlete/shared';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessKey = searchParams.get('key');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    // Validate access key
    const validateKey = async () => {
      if (!accessKey) {
        setError('Access denied. Invalid entry point.');
        return;
      }

      try {
        const response = await fetch('/api/admin/validate-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: accessKey }),
        });

        if (response.ok) {
          setIsValidated(true);
          setError(null);
        } else {
          setError('Access denied. Invalid access key.');
        }
      } catch (err) {
        setError('Access denied. System error.');
      }
    };

    validateKey();
  }, [accessKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidated) {
      setError('Access denied. Invalid access key.');
      return;
    }

    setError(null);
    setIsLoading(true);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0]?.message || 'Invalid input');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      // Verify admin role
      if (data.session) {
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

        router.push('/admin/dashboard');
      }
    } catch (err) {
      console.error('[Admin Login] Error:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  if (!isValidated && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-text-secondary">Validating access...</div>
      </div>
    );
  }

  if (error && !isValidated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="max-w-md w-full p-8 bg-bg-secondary rounded-2xl border border-border">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
            <p className="text-text-secondary">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthCard title="Admin Portal" subtitle="Authorized access only">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && isValidated && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
            Admin Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@jejakathlete.com"
            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
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
            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Sign in as Admin'}
        </button>
      </form>

      <p className="mt-6 text-center text-text-secondary text-sm">
        Need admin access?{' '}
        <Link 
          href={`/admin/register?key=${accessKey}`}
          className="text-accent hover:text-accent-hover font-medium"
        >
          Register
        </Link>
      </p>
    </AuthCard>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-text-secondary">Loading...</div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
