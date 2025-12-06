import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../../jejakathlete-web/src/server/root';

// API URL - replace with your deployed URL in production
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/trpc';

// Create tRPC client for mobile
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_URL,
      transformer: superjson,
      headers() {
        return {
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
});

export type { AppRouter };
