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

// Constants for dropdown options
const ATHLETE_LEVELS = ['beginner', 'intermediate', 'advanced', 'elite'] as const;
const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'] as const;

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

  // Edit mode states
  const [isEditingAthlete, setIsEditingAthlete] = useState(false);
  const [isEditingTrainer, setIsEditingTrainer] = useState(false);
  const [isEditingProfiling, setIsEditingProfiling] = useState(false);
  const [savingAthlete, setSavingAthlete] = useState(false);
  const [savingTrainer, setSavingTrainer] = useState(false);
  const [savingProfiling, setSavingProfiling] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form data states
  const [athleteForm, setAthleteForm] = useState<{ sport: string; level: string }>({ sport: '', level: '' });
  const [trainerForm, setTrainerForm] = useState<{
    trainer_code: string;
    certification_id: string;
    specialization: string;
    verification_status: string;
  }>({ trainer_code: '', certification_id: '', specialization: '', verification_status: '' });
  const [profilingForm, setProfilingForm] = useState<{
    phone: string;
    address: string;
    city: string;
    country: string;
    date_of_birth: string;
    gender: string;
    bio: string;
  }>({ phone: '', address: '', city: '', country: '', date_of_birth: '', gender: '', bio: '' });

  // Initialize form data when data loads
  useEffect(() => {
    if (athleteData) {
      setAthleteForm({ sport: athleteData.sport, level: athleteData.level });
    }
  }, [athleteData]);

  useEffect(() => {
    if (trainerData) {
      setTrainerForm({
        trainer_code: trainerData.trainer_code,
        certification_id: trainerData.certification_id || '',
        specialization: trainerData.specialization || '',
        verification_status: trainerData.verification_status,
      });
    }
  }, [trainerData]);

  useEffect(() => {
    if (profiling) {
      setProfilingForm({
        phone: profiling.phone || '',
        address: profiling.address || '',
        city: profiling.city || '',
        country: profiling.country || '',
        date_of_birth: profiling.date_of_birth || '',
        gender: profiling.gender || '',
        bio: profiling.bio || '',
      });
    }
  }, [profiling]);

  // Save athlete profile
  const handleSaveAthlete = async () => {
    if (!athleteForm.sport.trim()) {
      setSaveMessage({ type: 'error', text: 'Sport is required' });
      return;
    }

    setSavingAthlete(true);
    setSaveMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from('athletes')
        .update({
          sport: athleteForm.sport.trim(),
          level: athleteForm.level,
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Update local state
      setAthleteData(prev => prev ? { ...prev, sport: athleteForm.sport.trim(), level: athleteForm.level } : null);
      setIsEditingAthlete(false);
      setSaveMessage({ type: 'success', text: 'Athlete profile updated successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error updating athlete:', err);
      setSaveMessage({ type: 'error', text: 'Failed to update athlete profile' });
    } finally {
      setSavingAthlete(false);
    }
  };

  // Save trainer profile
  const handleSaveTrainer = async () => {
    if (!trainerForm.trainer_code.trim()) {
      setSaveMessage({ type: 'error', text: 'Trainer code is required' });
      return;
    }

    setSavingTrainer(true);
    setSaveMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from('trainers')
        .update({
          trainer_code: trainerForm.trainer_code.trim(),
          certification_id: trainerForm.certification_id.trim() || null,
          specialization: trainerForm.specialization.trim() || null,
          verification_status: trainerForm.verification_status,
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Update local state
      setTrainerData(prev => prev ? {
        ...prev,
        trainer_code: trainerForm.trainer_code.trim(),
        certification_id: trainerForm.certification_id.trim() || null,
        specialization: trainerForm.specialization.trim() || null,
        verification_status: trainerForm.verification_status,
      } : null);
      setIsEditingTrainer(false);
      setSaveMessage({ type: 'success', text: 'Trainer profile updated successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error updating trainer:', err);
      setSaveMessage({ type: 'error', text: 'Failed to update trainer profile' });
    } finally {
      setSavingTrainer(false);
    }
  };

  // Cancel editing
  const handleCancelAthleteEdit = () => {
    if (athleteData) {
      setAthleteForm({ sport: athleteData.sport, level: athleteData.level });
    }
    setIsEditingAthlete(false);
  };

  const handleCancelTrainerEdit = () => {
    if (trainerData) {
      setTrainerForm({
        trainer_code: trainerData.trainer_code,
        certification_id: trainerData.certification_id || '',
        specialization: trainerData.specialization || '',
        verification_status: trainerData.verification_status,
      });
    }
    setIsEditingTrainer(false);
  };

  // Save user profiling
  const handleSaveProfiling = async () => {
    setSavingProfiling(true);
    setSaveMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      
      const profilingData = {
        user_id: userId,
        phone: profilingForm.phone.trim() || null,
        address: profilingForm.address.trim() || null,
        city: profilingForm.city.trim() || null,
        country: profilingForm.country.trim() || null,
        date_of_birth: profilingForm.date_of_birth || null,
        gender: profilingForm.gender.trim() || null,
        bio: profilingForm.bio.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Use upsert to handle both insert and update cases
      const { error: updateError } = await supabase
        .from('user_profiling')
        .upsert(profilingData, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      // Update local state
      setProfiling(prev => ({
        user_id: userId,
        phone: profilingForm.phone.trim() || null,
        address: profilingForm.address.trim() || null,
        city: profilingForm.city.trim() || null,
        country: profilingForm.country.trim() || null,
        date_of_birth: profilingForm.date_of_birth || null,
        gender: profilingForm.gender.trim() || null,
        bio: profilingForm.bio.trim() || null,
        avatar_url: prev?.avatar_url || null,
        cover_image_url: prev?.cover_image_url || null,
        social_links: prev?.social_links || null,
        preferences: prev?.preferences || null,
        created_at: prev?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setIsEditingProfiling(false);
      setSaveMessage({ type: 'success', text: 'User profiling updated successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error updating profiling:', err);
      setSaveMessage({ type: 'error', text: 'Failed to update user profiling' });
    } finally {
      setSavingProfiling(false);
    }
  };

  const handleCancelProfilingEdit = () => {
    if (profiling) {
      setProfilingForm({
        phone: profiling.phone || '',
        address: profiling.address || '',
        city: profiling.city || '',
        country: profiling.country || '',
        date_of_birth: profiling.date_of_birth || '',
        gender: profiling.gender || '',
        bio: profiling.bio || '',
      });
    } else {
      setProfilingForm({ phone: '', address: '', city: '', country: '', date_of_birth: '', gender: '', bio: '' });
    }
    setIsEditingProfiling(false);
  };

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
        .maybeSingle();

      if (profile) {
        setProfiling(profile);
      }

      // Fetch role-specific data
      if (user.role === 'trainer') {
        const { data: trainer } = await supabase
          .from('trainers')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (trainer) setTrainerData(trainer);
      }

      if (user.role === 'athlete') {
        const { data: athlete } = await supabase
          .from('athletes')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
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
        {/* Save Message Banner */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg border ${
            saveMessage.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <p className="text-sm font-medium">{saveMessage.text}</p>
          </div>
        )}

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <span>📋</span> User Profiling
              </h2>
              {!isEditingProfiling && (
                <button
                  onClick={() => setIsEditingProfiling(true)}
                  className="px-3 py-1.5 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                >
                  ✏️ {profiling ? 'Edit' : 'Add'}
                </button>
              )}
            </div>

            {isEditingProfiling ? (
              <div className="space-y-4">
                {/* Phone */}
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Phone</label>
                  <input
                    type="tel"
                    value={profilingForm.phone}
                    onChange={(e) => setProfilingForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Gender</label>
                  <select
                    value={profilingForm.gender}
                    onChange={(e) => setProfilingForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={profilingForm.date_of_birth}
                    onChange={(e) => setProfilingForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Address</label>
                  <input
                    type="text"
                    value={profilingForm.address}
                    onChange={(e) => setProfilingForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder="Enter address"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm text-text-secondary mb-1">City</label>
                  <input
                    type="text"
                    value={profilingForm.city}
                    onChange={(e) => setProfilingForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder="Enter city"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Country</label>
                  <input
                    type="text"
                    value={profilingForm.country}
                    onChange={(e) => setProfilingForm(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder="Enter country"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Bio</label>
                  <textarea
                    value={profilingForm.bio}
                    onChange={(e) => setProfilingForm(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[80px] resize-y"
                    placeholder="Enter bio"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveProfiling}
                    disabled={savingProfiling}
                    className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {savingProfiling ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Saving...
                      </span>
                    ) : (
                      '💾 Save Changes'
                    )}
                  </button>
                  <button
                    onClick={handleCancelProfilingEdit}
                    disabled={savingProfiling}
                    className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-tertiary/80 transition-colors disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : profiling ? (
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
              <p className="text-text-muted text-sm">No profiling data available. Click &quot;Add&quot; to create.</p>
            )}
          </div>

          {/* Trainer Data */}
          {trainerData && (
            <div className="bg-bg-secondary border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <span>🎯</span> Trainer Information
                </h2>
                {!isEditingTrainer && (
                  <button
                    onClick={() => setIsEditingTrainer(true)}
                    className="px-3 py-1.5 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {isEditingTrainer ? (
                <div className="space-y-4">
                  {/* Trainer Code */}
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Trainer Code *</label>
                    <input
                      type="text"
                      value={trainerForm.trainer_code}
                      onChange={(e) => setTrainerForm(prev => ({ ...prev, trainer_code: e.target.value }))}
                      className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                      placeholder="Enter trainer code"
                    />
                  </div>

                  {/* Certification ID */}
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Certification ID</label>
                    <input
                      type="text"
                      value={trainerForm.certification_id}
                      onChange={(e) => setTrainerForm(prev => ({ ...prev, certification_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                      placeholder="Enter certification ID"
                    />
                  </div>

                  {/* Specialization */}
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Specialization</label>
                    <input
                      type="text"
                      value={trainerForm.specialization}
                      onChange={(e) => setTrainerForm(prev => ({ ...prev, specialization: e.target.value }))}
                      className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                      placeholder="e.g., Strength Training, Swimming"
                    />
                  </div>

                  {/* Verification Status */}
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Verification Status</label>
                    <select
                      value={trainerForm.verification_status}
                      onChange={(e) => setTrainerForm(prev => ({ ...prev, verification_status: e.target.value }))}
                      className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      {VERIFICATION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSaveTrainer}
                      disabled={savingTrainer}
                      className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {savingTrainer ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Saving...
                        </span>
                      ) : (
                        '💾 Save Changes'
                      )}
                    </button>
                    <button
                      onClick={handleCancelTrainerEdit}
                      disabled={savingTrainer}
                      className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-tertiary/80 transition-colors disabled:opacity-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          )}

          {/* Athlete Data */}
          {athleteData && (
            <div className="bg-bg-secondary border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <span>🏃</span> Athlete Information
                </h2>
                {!isEditingAthlete && (
                  <button
                    onClick={() => setIsEditingAthlete(true)}
                    className="px-3 py-1.5 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {isEditingAthlete ? (
                <div className="space-y-4">
                  {/* Sport */}
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Sport *</label>
                    <input
                      type="text"
                      value={athleteForm.sport}
                      onChange={(e) => setAthleteForm(prev => ({ ...prev, sport: e.target.value }))}
                      className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                      placeholder="e.g., Running, Swimming, Basketball"
                    />
                  </div>

                  {/* Level */}
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Level</label>
                    <select
                      value={athleteForm.level}
                      onChange={(e) => setAthleteForm(prev => ({ ...prev, level: e.target.value }))}
                      className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      {ATHLETE_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSaveAthlete}
                      disabled={savingAthlete}
                      className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {savingAthlete ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Saving...
                        </span>
                      ) : (
                        '💾 Save Changes'
                      )}
                    </button>
                    <button
                      onClick={handleCancelAthleteEdit}
                      disabled={savingAthlete}
                      className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-tertiary/80 transition-colors disabled:opacity-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <InfoRow label="Sport" value={athleteData.sport} />
                  <InfoRow label="Level" value={athleteData.level} />
                </div>
              )}
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
