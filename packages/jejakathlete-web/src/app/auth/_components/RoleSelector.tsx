'use client';

import { UserRole } from '@jejakathlete/shared';

interface RoleSelectorProps {
  value: 'athlete' | 'trainer';
  onChange: (role: 'athlete' | 'trainer') => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="flex rounded-xl bg-bg-elevated p-1 border border-border">
      <button
        type="button"
        onClick={() => onChange('athlete')}
        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
          value === 'athlete'
            ? 'bg-accent text-white'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        Athlete
      </button>
      <button
        type="button"
        onClick={() => onChange('trainer')}
        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
          value === 'trainer'
            ? 'bg-accent text-white'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        Trainer
      </button>
    </div>
  );
}
