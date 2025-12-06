'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const [countdown, setCountdown] = useState(5);

  const isSignup = type === 'signup';
  const title = isSignup ? 'Account created!' : 'Welcome back!';
  const subtitle = isSignup
    ? 'Your account has been successfully created.'
    : 'You have successfully signed in.';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-text-primary mb-2">{title}</h1>
        <p className="text-text-secondary mb-8">{subtitle}</p>

        {/* Countdown */}
        <p className="text-text-muted text-sm mb-6">
          Redirecting to dashboard in {countdown} seconds...
        </p>

        {/* Manual Button */}
        <Link
          href="/dashboard"
          className="inline-block px-8 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
