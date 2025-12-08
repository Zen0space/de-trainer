import { requireAdmin } from '@/lib/auth-admin';
import { AdminSignOutButton } from './_components/AdminSignOutButton';

export default async function AdminDashboard() {
  const { user } = await requireAdmin();

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
              <p className="text-sm text-text-secondary mt-1">
                Welcome back, {user?.full_name || user?.username}
              </p>
            </div>
            <AdminSignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="bg-bg-secondary border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-text-primary">-</p>
            <p className="text-xs text-text-muted mt-2">Coming soon</p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Active Trainers</h3>
            <p className="text-3xl font-bold text-text-primary">-</p>
            <p className="text-xs text-text-muted mt-2">Coming soon</p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-xl p-6">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Active Athletes</h3>
            <p className="text-3xl font-bold text-text-primary">-</p>
            <p className="text-xs text-text-muted mt-2">Coming soon</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 bg-bg-secondary hover:bg-bg-elevated border border-border rounded-xl text-left transition-colors">
              <h3 className="font-medium text-text-primary mb-1">Manage Users</h3>
              <p className="text-sm text-text-secondary">View and manage all user accounts</p>
            </button>

            <button className="p-4 bg-bg-secondary hover:bg-bg-elevated border border-border rounded-xl text-left transition-colors">
              <h3 className="font-medium text-text-primary mb-1">Trainer Verification</h3>
              <p className="text-sm text-text-secondary">Review pending trainer applications</p>
            </button>

            <button className="p-4 bg-bg-secondary hover:bg-bg-elevated border border-border rounded-xl text-left transition-colors">
              <h3 className="font-medium text-text-primary mb-1">System Settings</h3>
              <p className="text-sm text-text-secondary">Configure application settings</p>
            </button>

            <button className="p-4 bg-bg-secondary hover:bg-bg-elevated border border-border rounded-xl text-left transition-colors">
              <h3 className="font-medium text-text-primary mb-1">Reports</h3>
              <p className="text-sm text-text-secondary">View analytics and reports</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
