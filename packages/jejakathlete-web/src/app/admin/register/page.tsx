'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '../../auth/_components/AuthCard';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

function AdminRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessKey = searchParams.get('key');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    // Check if already logged in as admin
    const checkExistingSession = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (userData?.role === 'admin') {
          router.push('/admin/dashboard');
          return;
        }
      }
    };

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

    checkExistingSession();
    validateKey();
  }, [accessKey, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidated) {
      setError('Access denied. Invalid access key.');
      return;
    }

    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username,
            role: 'admin',
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        console.log('[Admin Register] User created:', authData.user.id);
        console.log('[Admin Register] Session:', authData.session);
        
        // If email confirmation is disabled, we'll have a session immediately
        if (authData.session) {
          // Verify admin role was set
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', authData.user.id)
            .single();

          console.log('[Admin Register] User data:', userData);
          console.log('[Admin Register] User error:', userError);

          if (userData?.role === 'admin') {
            console.log('[Admin Register] Admin role verified, navigating');
            router.push('/admin/dashboard');
            router.refresh();
          } else {
            console.log('[Admin Register] Admin role not set');
            setError('Failed to set admin role. Please contact support.');
            setIsLoading(false);
          }
        } else {
          // Email confirmation required
          console.log('[Admin Register] Email confirmation required');
          router.push('/auth/success?type=signup&confirm=email&admin=true');
        }
      }
    } catch (err) {
      console.error('[Admin Register] Error:', err);
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
    <AuthCard title="Admin Registration" subtitle="Create admin account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && isValidated && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-text-secondary mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin_john"
              className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@jejakathlete.com"
            pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-2">
              Confirm
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
              required
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-400 text-xs">
            ⚠️ This will create an account with admin privileges. Only authorized personnel should proceed.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating admin account...' : 'Create Admin Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-text-secondary text-sm">
        Already have admin access?{' '}
        <Link 
          href={`/admin/login?key=${accessKey}`}
          className="text-accent hover:text-accent-hover font-medium"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

export default function AdminRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-text-secondary">Loading...</div>
      </div>
    }>
      <AdminRegisterContent />
    </Suspense>
  );
}
