export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Note: Auth is handled by individual pages (login/register have key validation, dashboard has requireAdmin)
  return <>{children}</>;
}
