import { join } from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages for server components
  serverExternalPackages: ['@supabase/supabase-js'],
  // Monorepo root for build tracing
  outputFileTracingRoot: join(import.meta.dirname, '../../'),
};

export default nextConfig;

