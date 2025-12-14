'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface AdminUser {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string;
}

interface User {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string;
  is_verified: boolean;
  created_at: string;
  avatar_url: string | null;
}

interface Stats {
  totalUsers: number;
  totalTrainers: number;
  totalAthletes: number;
  totalAdmins: number;
  totalEnrollments: number;
  pendingEnrollments: number;
  totalEvents: number;
  totalTestResults: number;
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'access_denied';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseBrowserClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setAuthState('unauthenticated');
        router.push('/admin/login');
        return;
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('id, full_name, username, role')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        setAuthState('access_denied');
        return;
      }

      const isAdmin = userData?.role === 'admin' || userData?.role === 'rekabytes-admin';
      
      if (!isAdmin) {
        setAuthState('access_denied');
        setUser(userData);
        return;
      }

      setUser(userData);
      setAuthState('authenticated');
      
      // Fetch dashboard data
      fetchDashboardData(supabase);
    };

    checkAuth();
  }, [router]);

  const fetchDashboardData = async (supabase: ReturnType<typeof createSupabaseBrowserClient>) => {
    try {
      // Fetch all users (exclude admins)
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, username, role, is_verified, created_at, avatar_url')
        .not('role', 'in', '(admin,rekabytes-admin)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!usersError && allUsers) {
        setUsers(allUsers);
      }

      // Fetch stats
      const [
        { count: totalUsers },
        { count: totalTrainers },
        { count: totalAthletes },
        { count: totalAdmins },
        { count: totalEnrollments },
        { count: pendingEnrollments },
        { count: totalEvents },
        { count: totalTestResults },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('trainers').select('*', { count: 'exact', head: true }),
        supabase.from('athletes').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).in('role', ['admin', 'rekabytes-admin']),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('test_results').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalTrainers: totalTrainers || 0,
        totalAthletes: totalAthletes || 0,
        totalAdmins: totalAdmins || 0,
        totalEnrollments: totalEnrollments || 0,
        pendingEnrollments: pendingEnrollments || 0,
        totalEvents: totalEvents || 0,
        totalTestResults: totalTestResults || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

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

  // Loading state
  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (authState === 'access_denied') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-bg-secondary border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
          <p className="text-text-secondary mb-6">
            You don't have permission to access the admin dashboard.
            {user && (
              <span className="block mt-2 text-sm">
                Your role: <span className="text-accent font-medium">{user.role}</span>
              </span>
            )}
          </p>
          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
              <p className="text-sm text-text-secondary mt-1">
                Welcome, {user?.full_name || user?.username || 'Admin'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {loadingData ? '...' : stats?.totalUsers}
                </p>
                <p className="text-xs text-text-secondary">Total Users</p>
              </div>
            </div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="text-xl">🏃</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {loadingData ? '...' : stats?.totalAthletes}
                </p>
                <p className="text-xs text-text-secondary">Athletes</p>
              </div>
            </div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <span className="text-xl">🎯</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {loadingData ? '...' : stats?.totalTrainers}
                </p>
                <p className="text-xs text-text-secondary">Trainers</p>
              </div>
            </div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {loadingData ? '...' : stats?.totalTestResults}
                </p>
                <p className="text-xs text-text-secondary">Test Results</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <p className="text-sm text-text-secondary mb-1">Enrollments</p>
            <p className="text-xl font-bold text-text-primary">
              {loadingData ? '...' : stats?.totalEnrollments}
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <p className="text-sm text-text-secondary mb-1">Pending</p>
            <p className="text-xl font-bold text-yellow-400">
              {loadingData ? '...' : stats?.pendingEnrollments}
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <p className="text-sm text-text-secondary mb-1">Events</p>
            <p className="text-xl font-bold text-text-primary">
              {loadingData ? '...' : stats?.totalEvents}
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <p className="text-sm text-text-secondary mb-1">Admins</p>
            <p className="text-xl font-bold text-purple-400">
              {loadingData ? '...' : stats?.totalAdmins}
            </p>
          </div>
        </div>

        {/* Recent Users Table */}
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Recent Users</h2>
              <p className="text-sm text-text-secondary">Latest registered users in the system</p>
            </div>
            <a
              href="/admin/users"
              className="px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium rounded-lg transition-colors"
            >
              View All →
            </a>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loadingData ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr 
                      key={u.id} 
                      className="hover:bg-bg-elevated transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/users/${u.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold">
                            {u.full_name?.[0] || u.username?.[0] || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">
                              {u.full_name || 'No name'}
                            </p>
                            <p className="text-sm text-text-muted">@{u.username || 'no-username'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.is_verified ? (
                          <span className="flex items-center gap-1 text-green-400 text-sm">
                            <span>✓</span> Verified
                          </span>
                        ) : (
                          <span className="text-text-muted text-sm">Unverified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {new Date(u.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
