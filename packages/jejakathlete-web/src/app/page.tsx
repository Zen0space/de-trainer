import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        {/* Logo */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-accent flex items-center justify-center shadow-2xl shadow-accent/20">
          <span className="text-white text-3xl font-bold">JA</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
          JejakAthlete
        </h1>

        <p className="text-lg text-text-secondary mb-8">
          Track your fitness journey, connect with trainers, and achieve your athletic goals.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-bg-secondary hover:bg-bg-elevated text-text-primary font-semibold rounded-xl transition-colors border border-border"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
