import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase, Profile, TrainerProfile, AthleteProfile, UserRole } from '../lib/supabase';
import { Session, AuthError } from '@supabase/supabase-js';

// =============================================
// Types
// =============================================

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  // Role-specific data
  trainer_data?: TrainerProfile;
  athlete_data?: AthleteProfile;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterTrainerData {
  email: string;
  password: string;
  full_name: string;
  username: string;
  role: 'trainer';
  trainer_code: string;
  certification_id?: string;
  specialization?: string;
}

export interface RegisterAthleteData {
  email: string;
  password: string;
  full_name: string;
  username: string;
  role: 'athlete';
  sport: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (userData: RegisterTrainerData | RegisterAthleteData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  isTrainer: () => boolean;
  isAthlete: () => boolean;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
  setSessionFromUrl: (url: string) => Promise<void>;
}

// =============================================
// Context
// =============================================

const AuthContext = createContext<AuthContextType | null>(null);

export function useSession() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }
  return value;
}

// =============================================
// Helper Functions
// =============================================

async function fetchUserProfile(userId: string): Promise<AuthUser | null> {
  try {
    // Fetch base profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    // Fetch role-specific data
    let trainer_data: TrainerProfile | undefined;
    let athlete_data: AthleteProfile | undefined;

    if (profile.role === 'trainer') {
      const { data: trainerData } = await supabase
        .from('trainers')
        .select('*')
        .eq('user_id', userId)
        .single();
      trainer_data = trainerData || undefined;
    } else if (profile.role === 'athlete') {
      const { data: athleteData } = await supabase
        .from('athletes')
        .select('*')
        .eq('user_id', userId)
        .single();
      athlete_data = athleteData || undefined;
    }

    // Get email from auth user
    const { data: { user: authUser } } = await supabase.auth.getUser();

    return {
      id: profile.id,
      email: authUser?.email || '',
      full_name: profile.full_name,
      username: profile.username,
      role: profile.role,
      avatar_url: profile.avatar_url,
      is_verified: profile.is_verified,
      created_at: profile.created_at,
      trainer_data,
      athlete_data,
    };
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    return null;
  }
}

// Generate unique trainer code
function generateTrainerCode(): string {
  const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
  return `TR${randomNum}`;
}

// =============================================
// Provider Component
// =============================================

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id).then(setUser);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        setSession(session);
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setUser(profile);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =============================================
  // Auth Methods
  // =============================================

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { 
          success: false, 
          error: error.message 
        };
      }

      if (data.user) {
        const profile = await fetchUserProfile(data.user.id);
        if (profile) {
          setUser(profile);
          return { success: true, user: profile };
        }
      }

      return { 
        success: false, 
        error: 'Failed to load user profile' 
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during login',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    userData: RegisterTrainerData | RegisterAthleteData
  ): Promise<AuthResponse> => {
    try {
      setIsLoading(true);

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            username: userData.username,
            role: userData.role,
          },
        },
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user account' };
      }

      const userId = authData.user.id;

      // 2. Create user profile in public.users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          full_name: userData.full_name,
          username: userData.username,
          role: userData.role,
          is_verified: false,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Attempt cleanup - delete auth user if profile creation fails
        await supabase.auth.admin?.deleteUser(userId);
        return { 
          success: false, 
          error: 'Failed to create user profile: ' + profileError.message 
        };
      }

      // 3. Create role-specific profile
      if (userData.role === 'trainer') {
        const trainerData = userData as RegisterTrainerData;
        const { error: trainerError } = await supabase
          .from('trainers')
          .insert({
            user_id: userId,
            trainer_code: trainerData.trainer_code || generateTrainerCode(),
            certification_id: trainerData.certification_id || null,
            specialization: trainerData.specialization || null,
            verification_status: 'pending',
          });

        if (trainerError) {
          console.error('Trainer profile error:', trainerError);
          return { 
            success: false, 
            error: 'Failed to create trainer profile: ' + trainerError.message 
          };
        }
      } else if (userData.role === 'athlete') {
        const athleteData = userData as RegisterAthleteData;
        const { error: athleteError } = await supabase
          .from('athletes')
          .insert({
            user_id: userId,
            sport: athleteData.sport,
            level: athleteData.level || 'beginner',
          });

        if (athleteError) {
          console.error('Athlete profile error:', athleteError);
          return { 
            success: false, 
            error: 'Failed to create athlete profile: ' + athleteError.message 
          };
        }
      }

      // 4. Fetch complete user profile
      const profile = await fetchUserProfile(userId);
      if (profile) {
        setUser(profile);
        return { success: true, user: profile };
      }

      return { 
        success: true, 
        error: 'Account created successfully. Please check your email to verify your account.' 
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during registration',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id);
      if (profile) {
        setUser(profile);
      }
    }
  };

  // Handle session from web auth callback URL
  const setSessionFromUrl = async (url: string): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Setting session from URL:', url);
      
      const parsedUrl = new URL(url);
      const accessToken = parsedUrl.searchParams.get('access_token');
      const refreshToken = parsedUrl.searchParams.get('refresh_token');
      
      console.log('Tokens found:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken 
      });
      
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          console.error('Error setting session:', error.message);
          return;
        }
        
        console.log('Session set successfully:', !!data.session);
        
        if (data.session?.user) {
          const profile = await fetchUserProfile(data.session.user.id);
          if (profile) {
            console.log('User profile loaded:', profile.username);
            setUser(profile);
          }
        }
      } else {
        console.warn('No tokens found in URL');
      }
    } catch (error) {
      console.error('Error parsing auth URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for deep link auth callbacks
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      if (url.includes('auth/callback') || url.includes('access_token')) {
        setSessionFromUrl(url);
      }
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('auth/callback') || url.includes('access_token'))) {
        setSessionFromUrl(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // =============================================
  // Utility Methods
  // =============================================

  const isTrainer = (): boolean => user?.role === 'trainer';
  const isAthlete = (): boolean => user?.role === 'athlete';
  const isAdmin = (): boolean => user?.role === 'admin' || user?.role === 'rekabytes-admin';

  // =============================================
  // Provider Value
  // =============================================

  const contextValue: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    login,
    register,
    logout,
    isTrainer,
    isAthlete,
    isAdmin,
    refreshUser,
    setSessionFromUrl,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
