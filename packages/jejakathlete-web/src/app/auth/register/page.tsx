'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '../_components/AuthCard';
import { OAuthButtons } from '../_components/OAuthButtons';
import { RoleSelector } from '../_components/RoleSelector';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { registerSchema } from '@jejakathlete/shared';

type Role = 'athlete' | 'trainer';
type AthleteLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('athlete');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  // Athlete fields
  const [sport, setSport] = useState('');
  const [level, setLevel] = useState<AthleteLevel>('beginner');

  // Trainer fields
  const [trainerCode, setTrainerCode] = useState('');
  const [specialization, setSpecialization] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    // Build registration data based on role
    const baseData = {
      email,
      password,
      full_name: fullName,
      username,
      role,
    };

    const registrationData = role === 'athlete'
      ? { ...baseData, sport, level }
      : { ...baseData, trainer_code: trainerCode, specialization };

    // Validate with shared schema
    const result = registerSchema.safeParse(registrationData);
    if (!result.success) {
      setError(result.error.errors[0]?.message || 'Invalid input');
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();

      // Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username,
            role,
            ...(role === 'athlete' ? { sport, level } : { trainer_code: trainerCode, specialization }),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        router.push('/auth/success?type=signup');
      }
    } catch {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <AuthCard title="Create account" subtitle="Join JejakAthlete today">
      {/* OAuth */}
      <OAuthButtons />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-bg-secondary text-text-muted">or</span>
        </div>
      </div>

      {/* Role Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          I am a
        </label>
        <RoleSelector value={role} onChange={setRole} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
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
              placeholder="johndoe"
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
            placeholder="you@example.com"
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

        {/* Role-specific fields */}
        {role === 'athlete' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sport" className="block text-sm font-medium text-text-secondary mb-2">
                Sport
              </label>
              <input
                id="sport"
                type="text"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                placeholder="e.g., Running"
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label htmlFor="level" className="block text-sm font-medium text-text-secondary mb-2">
                Level
              </label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value as AthleteLevel)}
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary focus:border-accent focus:outline-none transition-colors"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="elite">Elite</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="trainerCode" className="block text-sm font-medium text-text-secondary mb-2">
                Trainer Code
              </label>
              <input
                id="trainerCode"
                type="text"
                value={trainerCode}
                onChange={(e) => setTrainerCode(e.target.value)}
                placeholder="e.g., TR001"
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                required
              />
            </div>
            <div>
              <label htmlFor="specialization" className="block text-sm font-medium text-text-secondary mb-2">
                Specialization
              </label>
              <input
                id="specialization"
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g., Strength"
                className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-text-secondary text-sm">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-accent hover:text-accent-hover font-medium">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
