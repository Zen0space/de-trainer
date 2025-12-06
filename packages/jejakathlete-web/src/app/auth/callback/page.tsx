import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuthCallbackPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const code = params.code as string | undefined;
  const redirectTo = params.redirect_to as string | undefined;
  const error = params.error as string | undefined;
  const errorDescription = params.error_description as string | undefined;

  // Handle error from OAuth provider
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    
    if (redirectTo) {
      // Redirect to mobile with error
      const mobileUrl = `${redirectTo}?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`;
      redirect(mobileUrl);
    }
    
    // Redirect to web error page
    redirect(`/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`);
  }

  // Exchange code for session
  if (code) {
    const supabase = await createSupabaseServerClient();
    
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);
      
      if (redirectTo) {
        const mobileUrl = `${redirectTo}?error=${encodeURIComponent(exchangeError.message)}`;
        redirect(mobileUrl);
      }
      
      redirect(`/auth/error?error=${encodeURIComponent(exchangeError.message)}`);
    }

    // If mobile redirect requested, redirect with tokens
    if (redirectTo && data.session) {
      const mobileUrl = `${redirectTo}?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&expires_in=${data.session.expires_in}`;
      redirect(mobileUrl);
    }

    // Otherwise redirect to dashboard (web flow)
    redirect('/dashboard');
  }

  // No code provided, redirect to home
  redirect('/');
}
