interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuthErrorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const error = params.error as string | undefined;
  const description = params.description as string | undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Authentication Error
        </h1>
        
        <p className="text-gray-600 mb-4">
          {error || 'An error occurred during authentication'}
        </p>
        
        {description && (
          <p className="text-sm text-gray-500 mb-6">
            {description}
          </p>
        )}
        
        <a
          href="/auth/login"
          className="inline-block w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition"
        >
          Try Again
        </a>
      </div>
    </div>
  );
}
