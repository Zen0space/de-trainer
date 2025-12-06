'use client';

import { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent flex items-center justify-center">
            <span className="text-white text-2xl font-bold">JA</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-text-secondary">{subtitle}</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-bg-secondary rounded-2xl p-8 border border-border">
          {children}
        </div>
      </div>
    </div>
  );
}
