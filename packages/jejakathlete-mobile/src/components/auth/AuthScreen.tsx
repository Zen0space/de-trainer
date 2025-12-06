import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useSession } from '../../contexts/AuthContext';

const WEB_AUTH_URL = 'https://jejak-athlete.vercel.app';

export function AuthScreen() {
  const { setSessionFromUrl } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      // Create a redirect URI that points back to our app
      const redirectUri = makeRedirectUri({
        scheme: 'jejakathlete',
        path: 'auth/callback',
      });

      console.log('Redirect URI:', redirectUri);

      // Build the web login URL with redirect parameter
      const loginUrl = `${WEB_AUTH_URL}/auth/login?redirect_to=${encodeURIComponent(redirectUri)}`;

      // Open the browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUri);

      console.log('Auth result:', result);

      if (result.type === 'success' && result.url) {
        // Parse tokens from the callback URL and set session
        await setSessionFromUrl(result.url);
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const redirectUri = makeRedirectUri({
        scheme: 'jejakathlete',
        path: 'auth/callback',
      });

      const signUpUrl = `${WEB_AUTH_URL}/auth/register?redirect_to=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(signUpUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        await setSessionFromUrl(result.url);
      }
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
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