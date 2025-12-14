'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface UserData {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string | null;
  avatar_url: string | null;
}

interface UserProfiling {
  user_id: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  bio: string | null;
  social_links: Record<string, string> | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
}

interface TrainerData {
  user_id: string;
  trainer_code: string;
  certification_id: string | null;
  specialization: string | null;
  verification_status: string;
}

interface AthleteData {
  user_id: string;
  sport: string;
  level: string;
}

interface EnrollmentData {
  id: number;
  athlete_id: string;
  trainer_id: string;
  status: string;
  requested_at: string;
  notes: string | null;
}

type AuthState = 'loading' | 'authenticated' | 'access_denied';

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profiling, setProfiling] = useState<UserProfiling | null>(null);
  const [trainerData, setTrainerData] = useState<TrainerData | null>(null);
  const [athleteData, setAthleteData] = useState<AthleteData | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const supabase = createSupabaseBrowserClient();
      
      // Check admin auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push('/admin/login');
        return;
      }

      const { data: adminData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();

      const isAdmin = adminData?.role === 'admin' || adminData?.role === 'rekabytes-admin';
      
      if (!isAdmin) {
        setAuthState('access_denied');
        return;
      }

      setAuthState('authenticated');
      
      // Fetch user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        setError('User not found');
        setLoading(false);
        return;
      }

      setUserData(user);

      // Fetch user profiling
      const { data: profile } = await supabase
        .from('user_profiling')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profile) {
        setProfiling(profile);
      }

      // Fetch role-specific data
      if (user.role === 'trainer') {
        const { data: trainer } = await supabase
          .from('trainers')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (trainer) setTrainerData(trainer);
      }

      if (user.role === 'athlete') {
        const { data: athlete } = await supabase
          .from('athletes')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (athlete) setAthleteData(athlete);
      }

      // Fetch enrollments
      const { data: userEnrollments } = await supabase
        .from('enrollments')
        .select('*')
        .or(`athlete_id.eq.${userId},trainer_id.eq.${userId}`)
        .order('requested_at', { ascending: false })
        .limit(10);

      if (userEnrollments) {
        setEnrollments(userEnrollments);
      }

      setLoading(false);
    };

    if (userId) {
      checkAuthAndFetch();
    }
  }, [router, userId]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'rekabytes-admin':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'trainer':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'athlete':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-400';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'rejected':
        return 'bg-red-500/10 text-red-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authState === 'access_denied') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-bg-secondary border border-border rounded-2xl p-8 text-center">
          <span className="text-4xl mb-4 block">🚫</span>
          <h1 className="text-xl font-bold text-text-primary mb-2">Access Denied</h1>
          <Link href="/admin/login" className="text-accent hover:underline">Go to Login</Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-bg-secondary border border-border rounded-2xl p-8 text-center">
          <span className="text-4xl mb-4 block">❌</span>
          <h1 className="text-xl font-bold text-text-primary mb-2">{error}</h1>
          <Link href="/admin/users" className="text-accent hover:underline">Back to Users</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading user profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin/users" className="text-text-secondary hover:text-text-primary text-sm">
            ← Back to Users
          </Link>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold">
              {userData?.full_name?.[0] || userData?.username?.[0] || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {userData?.full_name || 'No name'}
              </h1>
              <p className="text-text-secondary">@{userData?.username || 'no-username'}</p>
            </div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getRoleBadgeColor(userData?.role || '')}`}>
              {userData?.role}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Basic Info */}
          <div className="bg-bg-secondary border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span>👤</span> Basic Information
            </h2>
            <div className="space-y-3">
              <InfoRow label="User ID" value={userData?.id} mono />
              <InfoRow label="Full Name" value={userData?.full_name} />
              <InfoRow label="Username" value={userData?.username ? `@${userData.username}` : null} />
              <InfoRow label="Role" value={userData?.role} />
              <InfoRow label="Verified" value={userData?.is_verified ? '✓ Yes' : '✗ No'} />
              <InfoRow label="Created" value={userData?.created_at ? new Date(userData.created_at).toLocaleString() : null} />
              <InfoRow label="Updated" value={userData?.updated_at ? new Date(userData.updated_at).toLocaleString() : null} />
            </div>
          </div>

          {/* User Profiling */}
          <div className="bg-bg-secondary border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span>📋</span> User Profiling
            </h2>
            {profiling ? (
              <div className="space-y-3">
                <InfoRow label="Phone" value={profiling.phone} />
                <InfoRow label="Gender" value={profiling.gender} />
                <InfoRow label="Date of Birth" value={profiling.date_of_birth} />
                <InfoRow label="Address" value={profiling.address} />
                <InfoRow label="City" value={profiling.city} />
                <InfoRow label="Country" value={profiling.country} />
                <InfoRow label="Bio" value={profiling.bio} />
                {profiling.social_links && Object.keys(profiling.social_links).length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-text-secondary mb-2">Social Links:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profiling.social_links).map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-accent/10 text-accent text-xs rounded hover:bg-accent/20"
                        >
                          {platform}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-text-muted text-sm">No profiling data available</p>
            )}
          </div>

          {/* Trainer Data */}
          {trainerData && (
            <div className="bg-bg-secondary border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <span>🎯</span> Trainer Information
              </h2>
              <div className="space-y-3">
                <InfoRow label="Trainer Code" value={trainerData.trainer_code} mono />
                <InfoRow label="Certification ID" value={trainerData.certification_id} />
                <InfoRow label="Specialization" value={trainerData.specialization} />
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-text-secondary text-sm">Verification</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadgeColor(trainerData.verification_status)}`}>
                    {trainerData.verification_status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Athlete Data */}
          {athleteData && (
            <div className="bg-bg-secondary border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <span>🏃</span> Athlete Information
              </h2>
              <div className="space-y-3">
                <InfoRow label="Sport" value={athleteData.sport} />
                <InfoRow label="Level" value={athleteData.level} />
              </div>
            </div>
          )}

          {/* Enrollments */}
          <div className="bg-bg-secondary border border-border rounded-xl p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span>🔗</span> Enrollments ({enrollments.length})
            </h2>
            {enrollments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-text-secondary uppercase">
                      <th className="pb-3">ID</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Other Party</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enrollments.map((e) => (
                      <tr key={e.id}>
                        <td className="py-3 text-text-primary font-mono text-sm">#{e.id}</td>
                        <td className="py-3 text-text-secondary">
                          {e.athlete_id === userId ? 'Athlete' : 'Trainer'}
                        </td>
                        <td className="py-3 text-text-secondary font-mono text-xs">
                          {e.athlete_id === userId ? e.trainer_id.slice(0, 8) : e.athlete_id.slice(0, 8)}...
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadgeColor(e.status)}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="py-3 text-text-secondary text-sm">
                          {new Date(e.requested_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-text-muted text-sm">No enrollments found</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper component for info rows
function InfoRow({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex justify-between py-2 border-b border-border">
      <span className="text-text-secondary text-sm">{label}</span>
      <span className={`text-text-primary text-sm ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-text-muted">Not set</span>}
      </span>
    </div>
  );
}
