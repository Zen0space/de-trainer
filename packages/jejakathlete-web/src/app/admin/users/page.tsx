'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface User {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string;
  is_verified: boolean;
  created_at: string;
  avatar_url: string | null;
}

type AuthState = 'loading' | 'authenticated' | 'access_denied';
type RoleFilter = 'all' | 'athlete' | 'trainer' | 'admin';

export default function AdminUsersPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const supabase = createSupabaseBrowserClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push('/admin/login');
        return;
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();

      const isAdmin = userData?.role === 'admin' || userData?.role === 'rekabytes-admin';
      
      if (error || !isAdmin) {
        setAuthState('access_denied');
        return;
      }

      setAuthState('authenticated');
      
      // Fetch all users
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, full_name, username, role, is_verified, created_at, avatar_url')
        .order('created_at', { ascending: false });

      if (allUsers) {
        setUsers(allUsers);
        setFilteredUsers(allUsers);
      }
      setLoading(false);
    };

    checkAuthAndFetch();
  }, [router]);

  // Filter users based on search and role
  useEffect(() => {
    let filtered = users;

    // Apply role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'admin') {
        filtered = filtered.filter(u => u.role === 'admin' || u.role === 'rekabytes-admin');
      } else {
        filtered = filtered.filter(u => u.role === roleFilter);
      }
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.full_name?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query) ||
        u.id.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter]);

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
          <p className="text-text-secondary mb-4">You don't have permission to view this page.</p>
          <Link href="/admin/login" className="text-accent hover:underline">Go to Login</Link>
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
              <div className="flex items-center gap-3">
                <Link href="/admin/dashboard" className="text-text-secondary hover:text-text-primary">
                  ← Dashboard
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-text-primary mt-2">Users Management</h1>
              <p className="text-sm text-text-secondary mt-1">
                {filteredUsers.length} of {users.length} users
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, username, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'athlete', 'trainer', 'admin'] as RoleFilter[]).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                  roleFilter === role
                    ? 'bg-accent text-white'
                    : 'bg-bg-secondary border border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-elevated">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-bg-elevated transition-colors">
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
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="px-3 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium rounded-lg transition-colors"
                        >
                          View Profile
                        </Link>
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
