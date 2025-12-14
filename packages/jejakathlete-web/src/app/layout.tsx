import type { Metadata } from 'next';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc-provider';

export const metadata: Metadata = {
  title: 'JejakAthlete',
  description: 'Track your fitness journey',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-bg-primary text-text-primary">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
