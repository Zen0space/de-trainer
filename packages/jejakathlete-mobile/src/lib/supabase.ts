import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage adapter using expo-secure-store for secure token storage
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStore getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types (generated from schema)
export type UserRole = 'athlete' | 'trainer' | 'admin' | 'rekabytes-admin';

export interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfiling {
  user_id: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  bio: string | null;
  social_links: Record<string, string> | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface TrainerProfile {
  user_id: string;
  trainer_code: string;
  certification_id: string | null;
  specialization: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
}

export interface AthleteProfile {
  user_id: string;
  sport: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
}
