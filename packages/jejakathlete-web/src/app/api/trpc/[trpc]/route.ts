import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/root';
import { createContext } from '@/server/trpc';

const handler = async (req: Request) => {
  console.log('🔵 [tRPC] Incoming request:', {
    method: req.method,
    url: req.url,
    headers: {
      authorization: req.headers.get('authorization') ? '✅ Present' : '❌ Missing',
      contentType: req.headers.get('content-type'),
    },
  });

  try {
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () => createContext({ req }),
      onError: ({ error, path, type }) => {
        console.error('❌ [tRPC] Error:', {
          path,
          type,
          code: error.code,
          message: error.message,
        });
      },
    });

    console.log('✅ [tRPC] Request completed successfully');
    return response;
  } catch (error) {
    console.error('❌ [tRPC] Handler error:', error);
    throw error;
  }
};

export { handler as GET, handler as POST };
