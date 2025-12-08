import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import superjson from 'superjson';
import type { AppRouter } from '../../../jejakathlete-web/src/server/root';
import { supabase } from './supabase';

// API URL - replace with your deployed URL in production
// For local development on physical device/emulator, use your computer's network IP
// Example: http://192.168.1.100:3000/api/trpc (find IP in web server logs)
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/trpc';

console.log('🔵 [tRPC] Initializing client with URL:', API_URL);

// Create React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Create tRPC client for mobile
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_URL,
      transformer: superjson,
      async headers() {
        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('🔵 [tRPC Client] Preparing request:', {
          url: API_URL,
          hasToken: !!session?.access_token,
        });
        
        return {
          'Content-Type': 'application/json',
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        };
      },
      fetch(url, options) {
        console.log('🔵 [tRPC Client] Sending request:', {
          url: url.toString(),
          method: options?.method,
          hasAuth: options?.headers ? 'Authorization' in (options.headers as any) : false,
        });
        
        return fetch(url, options).then(
          (response) => {
            console.log('✅ [tRPC Client] Response received:', {
              status: response.status,
              ok: response.ok,
            });
            return response;
          },
          (error) => {
            console.error('❌ [tRPC Client] Fetch error:', {
              message: error.message,
              url: url.toString(),
            });
            throw error;
          }
        );
      },
    }),
  ],
});

export type { AppRouter };
