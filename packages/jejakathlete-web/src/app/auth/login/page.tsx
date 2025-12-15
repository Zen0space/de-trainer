'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '../_components/AuthCard';
import { OAuthButtons } from '../_components/OAuthButtons';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { loginSchema } from '@jejakathlete/shared';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect_to');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [manualRedirectUrl, setManualRedirectUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDebugInfo('');
    setIsLoading(true);

    // Validate input
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0]?.message || 'Invalid input');
      setIsLoading(false);
      return;
    }

    try {
      // Check if environment variables are loaded
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError('Supabase configuration missing. Please check environment variables.');
        setDebugInfo(`URL: ${supabaseUrl ? 'OK' : 'MISSING'}, Key: ${supabaseKey ? 'OK' : 'MISSING'}`);
        setIsLoading(false);
        return;
      }

      setDebugInfo('Step 1: Creating Supabase client...');
      const supabase = createSupabaseBrowserClient();
      
      setDebugInfo('Step 2: Signing in...');
      console.log('[Login] Attempting sign in with password');
      console.log('[Login] Has redirect_to:', !!redirectTo);
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('[Login] Sign in error:', signInError.message);
        setError(signInError.message);
        setDebugInfo('Sign in failed: ' + signInError.message);
        setIsLoading(false);
        return;
      }

      setDebugInfo('Step 3: Sign in successful, preparing redirect...');
      console.log('[Login] Sign in successful');
      console.log('[Login] Has session:', !!data.session);
      console.log('[Login] Has tokens:', !!data.session?.access_token);

      // If mobile redirect requested, redirect with tokens
      if (redirectTo && data.session) {
        setDebugInfo('Step 4: Redirecting to mobile app...');
        console.log('[Login] Redirecting to mobile app');
        const mobileUrl = `${redirectTo}?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&expires_in=${data.session.expires_in}`;
        console.log('[Login] Mobile URL constructed (sanitized)');
        console.log('[Login] Redirect URL scheme:', redirectTo.split('://')[0]);
        
        // Try multiple redirect methods for better compatibility
        try {
          // Store URL for manual redirect button
          setManualRedirectUrl(mobileUrl);
          
          // Method 1: Direct window.location (most reliable for deep links)
          window.location.href = mobileUrl;
          
          // Method 2: Fallback with timeout
          setTimeout(() => {
            window.location.replace(mobileUrl);
          }, 100);
          
          // Method 3: Show manual redirect button after 2 seconds
          setTimeout(() => {
            setDebugInfo('If not redirected automatically, tap the button below');
            setIsLoading(false);
          }, 2000);
        } catch (redirectError) {
          console.error('[Login] Redirect error:', redirectError);
          setDebugInfo('Redirect failed. Please use the button below to continue.');
          setIsLoading(false);
        }
        return;
      }

      setDebugInfo('Step 4: Redirecting to web success page...');
      console.log('[Login] Redirecting to web success page');
      router.push('/auth/success');
    } catch (err) {
      console.error('[Login] Unexpected error:', err);
      setError('An unexpected error occurred: ' + String(err));
      setDebugInfo('Unexpected error: ' + String(err));
      setIsLoading(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your account">
      {/* OAuth */}
      <OAuthButtons redirectTo={redirectTo || undefined} />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-bg-secondary text-text-muted">or</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
            {error}
          </div>
        )}
        
        {debugInfo && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
            {debugInfo}
          </div>
        )}
        
        {manualRedirectUrl && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-green-400 text-sm mb-3">Login successful! Tap the button below to return to the app:</p>
            <a
              href={manualRedirectUrl}
              className="block w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl text-center transition-colors"
            >
              Return to JejakAthlete App
            </a>
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
            placeholder="you@example.com"
            className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
              Password
            </label>
            <Link
              href="/auth/reset-password"
              className="text-sm text-accent hover:text-accent-hover"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-12 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-text-secondary text-sm">
        Don&apos;t have an account?{' '}
        <Link 
          href={redirectTo ? `/auth/register?redirect_to=${encodeURIComponent(redirectTo)}` : '/auth/register'} 
          className="text-accent hover:text-accent-hover font-medium"
        >
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-text-secondary">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
