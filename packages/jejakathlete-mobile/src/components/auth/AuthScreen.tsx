import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useSession } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

// Use environment variable for web URL, fallback to production URL
const WEB_AUTH_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://jejak-athlete.vercel.app';

// Map error codes to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  'invalid_grant': 'Invalid credentials. Please try again.',
  'invalid_request': 'Authentication request failed. Please try again.',
  'access_denied': 'Access was denied. Please try again.',
  'network_error': 'Network error. Please check your connection.',
  'session_expired': 'Session expired. Please login again.',
  'invalid_token': 'Authentication failed. Please try again.',
  'token_missing': 'Authentication incomplete. Please try again.',
  'malformed_url': 'Invalid authentication response. Please try again.',
  'invalid_token_format': 'Invalid authentication tokens. Please try again.',
  'session_error': 'Failed to establish session. Please try again.',
  'session_creation_failed': 'Could not create session. Please try again.',
  'profile_load_failed': 'Failed to load profile. Please try again.',
  'default': 'Authentication failed. Please try again.',
};

export function AuthScreen() {
  const { setSessionFromUrl } = useSession();
  const { showError, showInfo } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[AuthScreen] Login flow initiated');
      
      // Create a redirect URI that points back to our app
      const redirectUri = makeRedirectUri({
        scheme: 'jejakathlete',
        path: 'auth/callback',
      });

      console.log('[AuthScreen] Generated redirect URI:', redirectUri);
      console.log('[AuthScreen] Redirect URI scheme:', redirectUri.split('://')[0]);
      console.log('[AuthScreen] Redirect URI path:', redirectUri.split('://')[1]);

      // Build the web login URL with redirect parameter
      const loginUrl = `${WEB_AUTH_URL}/auth/login?redirect_to=${encodeURIComponent(redirectUri)}`;
      console.log('[AuthScreen] Opening web login URL:', WEB_AUTH_URL + '/auth/login');
      console.log('[AuthScreen] Encoded redirect_to parameter length:', encodeURIComponent(redirectUri).length);

      // Open the browser for authentication
      console.log('[AuthScreen] Opening browser session...');
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);

      console.log('[AuthScreen] Browser session result type:', result.type);
      if (result.type === 'success') {
        console.log('[AuthScreen] Browser returned success with URL');
      }

      // Handle browser cancellation gracefully (no error shown)
      if (result.type === 'cancel') {
        console.log('[AuthScreen] User cancelled authentication - no error shown');
        return;
      }

      if (result.type === 'success' && result.url) {
        console.log('[AuthScreen] Processing callback URL');
        
        // Check for error in callback URL
        const url = new URL(result.url);
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          console.error('[AuthScreen] Error received in callback URL');
          console.error('[AuthScreen] Error code:', error);
          console.error('[AuthScreen] Error description:', errorDescription || 'None provided');
          const message = ERROR_MESSAGES[error] || ERROR_MESSAGES['default'];
          showError(message);
          return;
        }

        console.log('[AuthScreen] No errors in callback URL, proceeding with token extraction');
        
        // Show "Completing sign in..." message during token exchange
        showInfo('Completing sign in...', 10000); // Long duration since we'll dismiss it manually

        // Parse tokens from the callback URL and set session
        try {
          console.log('[AuthScreen] Calling setSessionFromUrl...');
          await setSessionFromUrl(result.url);
          console.log('[AuthScreen] Session established successfully');
          // Session established successfully - toast will be auto-dismissed by navigation
        } catch (sessionError) {
          console.error('[AuthScreen] Session establishment failed');
          console.error('[AuthScreen] Session error details:', sessionError);
          // Extract error message from Error object
          const errorCode = sessionError instanceof Error ? sessionError.message : 'default';
          console.error('[AuthScreen] Error code for user message:', errorCode);
          const message = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['default'];
          showError(message);
        }
      } else if (result.type === 'dismiss' || result.type === 'locked') {
        // Browser was dismissed or locked - handle gracefully
        console.log('[AuthScreen] Browser dismissed or locked - no error shown');
        console.log('[AuthScreen] Result type:', result.type);
      }
    } catch (error) {
      console.error('[AuthScreen] Unexpected error during login flow');
      console.error('[AuthScreen] Error details:', error);
      console.error('[AuthScreen] Error type:', error instanceof Error ? error.constructor.name : typeof error);
      
      // Check if it's a network error
      const errorMessage = error instanceof Error && error.message.toLowerCase().includes('network')
        ? ERROR_MESSAGES['network_error']
        : ERROR_MESSAGES['default'];
      showError(errorMessage);
    } finally {
      console.log('[AuthScreen] Login flow completed, resetting loading state');
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      console.log('[AuthScreen] Sign up flow initiated');
      
      const redirectUri = makeRedirectUri({
        scheme: 'jejakathlete',
        path: 'auth/callback',
      });

      console.log('[AuthScreen] Generated redirect URI:', redirectUri);
      console.log('[AuthScreen] Redirect URI scheme:', redirectUri.split('://')[0]);
      console.log('[AuthScreen] Redirect URI path:', redirectUri.split('://')[1]);

      const signUpUrl = `${WEB_AUTH_URL}/auth/register?redirect_to=${encodeURIComponent(redirectUri)}`;
      console.log('[AuthScreen] Opening web registration URL:', WEB_AUTH_URL + '/auth/register');
      console.log('[AuthScreen] Encoded redirect_to parameter length:', encodeURIComponent(redirectUri).length);

      console.log('[AuthScreen] Opening browser session...');
      const result = await WebBrowser.openAuthSessionAsync(signUpUrl, redirectUri);

      console.log('[AuthScreen] Browser session result type:', result.type);
      if (result.type === 'success') {
        console.log('[AuthScreen] Browser returned success with URL');
      }

      // Handle browser cancellation gracefully (no error shown)
      if (result.type === 'cancel') {
        console.log('[AuthScreen] User cancelled registration - no error shown');
        return;
      }

      if (result.type === 'success' && result.url) {
        console.log('[AuthScreen] Processing callback URL');
        
        // Check for error in callback URL
        const url = new URL(result.url);
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          console.error('[AuthScreen] Error received in callback URL');
          console.error('[AuthScreen] Error code:', error);
          console.error('[AuthScreen] Error description:', errorDescription || 'None provided');
          const message = ERROR_MESSAGES[error] || ERROR_MESSAGES['default'];
          showError(message);
          return;
        }

        console.log('[AuthScreen] No errors in callback URL, proceeding with token extraction');
        
        // Show "Completing sign in..." message during token exchange
        showInfo('Completing sign in...', 10000); // Long duration since we'll dismiss it manually

        // Parse tokens from the callback URL and set session
        try {
          console.log('[AuthScreen] Calling setSessionFromUrl...');
          await setSessionFromUrl(result.url);
          console.log('[AuthScreen] Session established successfully');
          // Session established successfully - toast will be auto-dismissed by navigation
        } catch (sessionError) {
          console.error('[AuthScreen] Session establishment failed');
          console.error('[AuthScreen] Session error details:', sessionError);
          // Extract error message from Error object
          const errorCode = sessionError instanceof Error ? sessionError.message : 'default';
          console.error('[AuthScreen] Error code for user message:', errorCode);
          const message = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['default'];
          showError(message);
        }
      } else if (result.type === 'dismiss' || result.type === 'locked') {
        // Browser was dismissed or locked - handle gracefully
        console.log('[AuthScreen] Browser dismissed or locked - no error shown');
        console.log('[AuthScreen] Result type:', result.type);
      }
    } catch (error) {
      console.error('[AuthScreen] Unexpected error during sign up flow');
      console.error('[AuthScreen] Error details:', error);
      console.error('[AuthScreen] Error type:', error instanceof Error ? error.constructor.name : typeof error);
      
      // Check if it's a network error
      const errorMessage = error instanceof Error && error.message.toLowerCase().includes('network')
        ? ERROR_MESSAGES['network_error']
        : ERROR_MESSAGES['default'];
      showError(errorMessage);
    } finally {
      console.log('[AuthScreen] Sign up flow completed, resetting loading state');
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0f0f0f]">
      {/* Background */}
      <View className="absolute inset-0 bg-[#0f0f0f]" />

      <View className="flex-1 justify-center items-center px-6">
        {/* Logo */}
        <View className="w-24 h-24 mb-8 rounded-3xl bg-[#3b82f6] items-center justify-center">
          <Text className="text-white text-3xl font-bold">JA</Text>
        </View>

        {/* Title */}
        <Text className="text-3xl font-bold text-white mb-2 text-center">
          JejakAthlete
        </Text>
        <Text className="text-base text-[#a1a1aa] mb-12 text-center px-4">
          Track your fitness journey, connect with trainers, and achieve your athletic goals.
        </Text>

        {/* Buttons */}
        <View className="w-full max-w-sm gap-4">
          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            className="w-full py-4 bg-[#3b82f6] rounded-2xl items-center justify-center active:opacity-80"
            style={{ opacity: isLoading ? 0.6 : 1 }}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-base font-semibold">
                Sign In
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleSignUp}
            disabled={isLoading}
            className="w-full py-4 bg-[#1a1a1a] border border-[#27272a] rounded-2xl items-center justify-center active:opacity-80"
            style={{ opacity: isLoading ? 0.6 : 1 }}
          >
            <Text className="text-white text-base font-semibold">
              Create Account
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text className="text-[#71717a] text-sm mt-8 text-center">
          You will be redirected to a secure browser to sign in
        </Text>
      </View>
    </View>
  );
}