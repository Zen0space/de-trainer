import { createSupabaseServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuthCallbackPage({ searchParams }: PageProps) {
  console.log('[Callback] Auth callback handler invoked');
  
  const params = await searchParams;
  const code = params.code as string | undefined;
  const redirectTo = params.redirect_to as string | undefined;
  const error = params.error as string | undefined;
  const errorDescription = params.error_description as string | undefined;

  console.log('[Callback] Request parameters:', {
    hasCode: !!code,
    hasRedirectTo: !!redirectTo,
    hasError: !!error,
    codeLength: code?.length || 0,
    redirectToValue: redirectTo ? redirectTo.split('?')[0] : 'none', // Log without query params
  });

  // Handle error from OAuth provider
  if (error) {
    console.error('[Callback] OAuth provider error received');
    console.error('[Callback] Error code:', error);
    console.error('[Callback] Error description:', errorDescription || 'No description provided');
    
    if (redirectTo) {
      console.log('[Callback] Redirecting to mobile with error');
      console.log('[Callback] Mobile redirect target:', redirectTo.split('?')[0]);
      
      // Redirect to mobile with error
      const mobileUrl = `${redirectTo}?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`;
      console.log('[Callback] Mobile error URL constructed (sanitized)');
      redirect(mobileUrl);
    }
    
    console.log('[Callback] Redirecting to web error page');
    // Redirect to web error page
    redirect(`/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`);
  }

  // Exchange code for session
  if (code) {
    console.log('[Callback] Authorization code received, initiating exchange');
    console.log('[Callback] Code length:', code.length);
    console.log('[Callback] Code prefix:', code.substring(0, 8) + '...');
    
    const supabase = await createSupabaseServerClient();
    
    console.log('[Callback] Calling Supabase exchangeCodeForSession...');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[Callback] Code exchange failed');
      console.error('[Callback] Exchange error message:', exchangeError.message);
      console.error('[Callback] Exchange error status:', exchangeError.status);
      console.error('[Callback] Exchange error name:', exchangeError.name);
      
      if (redirectTo) {
        console.log('[Callback] Redirecting to mobile with exchange error');
        console.log('[Callback] Mobile redirect target:', redirectTo.split('?')[0]);
        
        const mobileUrl = `${redirectTo}?error=${encodeURIComponent(exchangeError.message)}`;
        redirect(mobileUrl);
      }
      
      console.log('[Callback] Redirecting to web error page with exchange error');
      redirect(`/auth/error?error=${encodeURIComponent(exchangeError.message)}`);
    }

    console.log('[Callback] Code exchange successful');
    console.log('[Callback] Session created:', {
      hasSession: !!data.session,
      hasAccessToken: !!data.session?.access_token,
      hasRefreshToken: !!data.session?.refresh_token,
      expiresIn: data.session?.expires_in,
      userId: data.session?.user?.id,
    });

    // If mobile redirect requested, redirect with tokens
    if (redirectTo && data.session) {
      console.log('[Callback] Mobile redirect requested, preparing token redirect');
      console.log('[Callback] Mobile redirect target:', redirectTo.split('?')[0]);
      console.log('[Callback] Token details:', {
        accessTokenLength: data.session.access_token.length,
        refreshTokenLength: data.session.refresh_token.length,
        expiresIn: data.session.expires_in,
      });
      
      const mobileUrl = `${redirectTo}?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}&expires_in=${data.session.expires_in}`;
      console.log('[Callback] Mobile URL constructed with tokens (sanitized)');
      console.log('[Callback] Redirecting to mobile app...');
      redirect(mobileUrl);
    }

    console.log('[Callback] No mobile redirect, using web flow');
    console.log('[Callback] Redirecting to web success page');
    // Otherwise redirect to success page (web flow)
    redirect('/auth/success');
  }

  console.warn('[Callback] No code or error provided in callback');
  console.log('[Callback] Redirecting to home page');
  // No code provided, redirect to home
  redirect('/');
}
