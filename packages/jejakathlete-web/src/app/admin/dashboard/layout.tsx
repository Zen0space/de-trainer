import { requireAdmin } from '@/lib/auth-admin';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check for dashboard and its children
  await requireAdmin();

  return <>{children}</>;
}
