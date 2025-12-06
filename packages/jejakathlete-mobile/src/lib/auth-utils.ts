import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { trpc } from './trpc';

// Configure web browser for OAuth
WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface AuthCallbackParams {
  access_token?: string;
  refresh_token?: string;
  expires_in?: string;
  error?: string;
  error_description?: string;
}

/**
 * Parse deep link URL for auth callback parameters
 */
export function parseAuthCallback(url: string): AuthCallbackParams {
  const params: AuthCallbackParams = {};
  
  try {
    const urlObj = new URL(url);
    params.access_token = urlObj.searchParams.get('access_token') || undefined;
    params.refresh_token = urlObj.searchParams.get('refresh_token') || undefined;
    params.expires_in = urlObj.searchParams.get('expires_in') || undefined;
    params.error = urlObj.searchParams.get('error') || undefined;
    params.error_description = urlObj.searchParams.get('error_description') || undefined;
  } catch {
    // Try parsing as Expo Linking URL
    const parsed = Linking.parse(url);
    if (parsed.queryParams) {
      params.access_token = parsed.queryParams.access_token as string;
      params.refresh_token = parsed.queryParams.refresh_token as string;
      params.expires_in = parsed.queryParams.expires_in as string;
      params.error = parsed.queryParams.error as string;
      params.error_description = parsed.queryParams.error_description as string;
    }
  }
  
  return params;
}

/**
 * Set Supabase session from OAuth callback tokens
 */
export async function setSessionFromCallback(params: AuthCallbackParams): Promise<boolean> {
  if (!params.access_token || !params.refresh_token) {
    console.error('Missing tokens in callback');
    return false;
  }

  try {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });

    if (error) {
      console.error('Error setting session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in setSessionFromCallback:', error);
    return false;
  }
}

/**
 * Start OAuth flow by opening web browser
 */
export async function startOAuthFlow(provider: 'google' | 'apple'): Promise<{ success: boolean; error?: string }> {
  try {
    // Get OAuth URL from tRPC
    const result = await trpc.auth.getOAuthUrl.mutate({
      provider,
      redirectToMobile: true,
    });

    if (!result.url) {
      return { success: false, error: 'Failed to get OAuth URL' };
    }

    // Open browser for OAuth
    const authResult = await WebBrowser.openAuthSessionAsync(
      result.url,
      'jejakathlete://auth'
    );

    if (authResult.type === 'success' && authResult.url) {
      // Parse callback params
      const params = parseAuthCallback(authResult.url);
      
      if (params.error) {
        return { success: false, error: params.error_description || params.error };
      }

      // Set session in Supabase client
      const sessionSet = await setSessionFromCallback(params);
      
      if (!sessionSet) {
        return { success: false, error: 'Failed to set session' };
      }

      return { success: true };
    }

    if (authResult.type === 'cancel') {
      return { success: false, error: 'Authentication cancelled' };
    }

    return { success: false, error: 'Authentication failed' };
  } catch (error) {
    console.error('OAuth flow error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Open forgot password flow in web browser
 */
export async function openForgotPasswordFlow(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Trigger forgot password email via tRPC
    await trpc.auth.forgotPassword.mutate({ email });

    return { 
      success: true,
    };
  } catch (error) {
    console.error('Forgot password error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
