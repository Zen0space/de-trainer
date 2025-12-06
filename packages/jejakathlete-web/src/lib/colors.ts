// Dark Theme Color Palette for JejakAthlete Web
// Single source of truth for all color values

export const colors = {
  // Backgrounds
  bg: {
    primary: '#0f0f0f',
    secondary: '#1a1a1a',
    elevated: '#262626',
  },

  // Accent
  accent: {
    DEFAULT: '#3b82f6',
    hover: '#2563eb',
    muted: '#1d4ed8',
  },

  // Text
  text: {
    primary: '#ffffff',
    secondary: '#a1a1aa',
    muted: '#71717a',
  },

  // Borders
  border: {
    DEFAULT: '#27272a',
    light: '#3f3f46',
  },

  // Status
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
} as const;

// CSS variable names for use with var()
export const cssVars = {
  bgPrimary: 'var(--bg-primary)',
  bgSecondary: 'var(--bg-secondary)',
  bgElevated: 'var(--bg-elevated)',
  accent: 'var(--accent)',
  accentHover: 'var(--accent-hover)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  border: 'var(--border)',
  success: 'var(--success)',
  error: 'var(--error)',
} as const;
