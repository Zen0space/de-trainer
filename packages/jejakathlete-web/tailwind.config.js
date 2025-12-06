/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-elevated': 'var(--bg-elevated)',

        // Accent
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        },

        // Text
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',

        // Borders
        border: {
          DEFAULT: 'var(--border)',
          light: 'var(--border-light)',
        },

        // Status
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
