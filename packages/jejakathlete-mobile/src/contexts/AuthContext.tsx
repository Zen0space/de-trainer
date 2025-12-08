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
    console.log('[fetchUserProfile] Fetching profile for user:', userId);
    
    // Fetch base profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('[fetchUserProfile] Error fetching profile:', profileError.message);
      console.error('[fetchUserProfile] Error code:', profileError.code);
      console.error('[fetchUserProfile] Error details:', profileError.details);
      return null;
    }

    if (!profile) {
      console.error('[fetchUserProfile] No profile found for user:', userId);
      return null;
    }

    console.log('[fetchUserProfile] Base profile loaded:', {
      username: profile.username,
      role: profile.role,
      id: profile.id
    });

    // Fetch role-specific data
    let trainer_data: TrainerProfile | undefined;
    let athlete_data: AthleteProfile | undefined;

    if (profile.role === 'trainer') {
      console.log('[fetchUserProfile] Fetching trainer data...');
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (trainerError) {
        console.warn('[fetchUserProfile] Trainer data not found:', trainerError.message);
      } else {
        console.log('[fetchUserProfile] Trainer data loaded');
        trainer_data = trainerData || undefined;
      }
    } else if (profile.role === 'athlete') {
      console.log('[fetchUserProfile] Fetching athlete data...');
      const { data: athleteData, error: athleteError } = await supabase
        .from('athletes')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (athleteError) {
        console.warn('[fetchUserProfile] Athlete data not found:', athleteError.message);
      } else {
        console.log('[fetchUserProfile] Athlete data loaded');
        athlete_data = athleteData || undefined;
      }
    }

    // Get email from auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('[fetchUserProfile] Error getting auth user:', authError.message);
    }

    const userProfile: AuthUser = {
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

    console.log('[fetchUserProfile] Profile fetch complete:', {
      username: userProfile.username,
      role: userProfile.role,
      hasRoleData: !!(trainer_data || athlete_data)
    });

    return userProfile;
  } catch (error) {
    console.error('[fetchUserProfile] Unexpected error:', error);
    if (error instanceof Error) {
      console.error('[fetchUserProfile] Error message:', error.message);
      console.error('[fetchUserProfile] Error stack:', error.stack);
    }
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
    let mounted = true;
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('[Auth] Initializing auth state...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Error getting session:', error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }
        
        if (!mounted) return;
        
        setSession(session);
        
        if (session?.user) {
          console.log('[Auth] Session found, fetching user profile...');
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            if (profile) {
              console.log('[Auth] Profile loaded successfully:', profile.username);
              setUser(profile);
            } else {
              console.error('[Auth] Failed to load user profile');
              // Clear session if profile doesn't exist
              await supabase.auth.signOut();
              setSession(null);
            }
          }
        } else {
          console.log('[Auth] No session found');
        }
        
        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[Auth] Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event);
        
        if (!mounted) return;
        
        setSession(session);
        
        if (session?.user) {
          console.log('[Auth] Fetching profile for user:', session.user.id);
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            if (profile) {
              console.log('[Auth] Profile loaded:', profile.username);
              setUser(profile);
            } else {
              console.error('[Auth] Profile not found, signing out...');
              await supabase.auth.signOut();
              setUser(null);
              setSession(null);
            }
          }
        } else {
          console.log('[Auth] No session, clearing user');
          if (mounted) {
            setUser(null);
          }
        }
        
        if (mounted) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
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
      console.log('[Auth] Starting token extraction from URL');
      console.log('[Auth] URL received (sanitized):', url.split('?')[0]);
      
      // Parse URL safely
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch (parseError) {
        console.error('[Auth] Failed to parse URL:', parseError);
        console.error('[Auth] Malformed URL received');
        throw new Error('malformed_url');
      }
      
      // Extract tokens from URL
      const accessToken = parsedUrl.searchParams.get('access_token');
      const refreshToken = parsedUrl.searchParams.get('refresh_token');
      const errorParam = parsedUrl.searchParams.get('error');
      const errorDescription = parsedUrl.searchParams.get('error_description');
      
      console.log('[Auth] Token extraction results:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken,
        hasError: !!errorParam,
        accessTokenLength: accessToken?.length || 0,
        refreshTokenLength: refreshToken?.length || 0
      });
      
      // Check for error parameters first
      if (errorParam) {
        console.error('[Auth] Error in callback URL:', errorParam);
        console.error('[Auth] Error description:', errorDescription || 'No description provided');
        throw new Error(errorParam);
      }
      
      // Validate both tokens are present
      if (!accessToken || !refreshToken) {
        console.error('[Auth] Token validation failed - missing required tokens');
        console.error('[Auth] Missing tokens:', {
          accessToken: !accessToken,
          refreshToken: !refreshToken
        });
        throw new Error('token_missing');
      }
      
      // Validate token format (basic validation)
      // Access tokens should be JWTs (3 parts separated by dots)
      const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
      const isAccessTokenValid = jwtPattern.test(accessToken);
      // Refresh tokens can be various formats, just check they're not empty and reasonable length
      const isRefreshTokenValid = refreshToken.length > 10;
      
      console.log('[Auth] Token format validation:', {
        accessTokenValid: isAccessTokenValid,
        refreshTokenValid: isRefreshTokenValid,
        accessTokenSample: accessToken.substring(0, 20) + '...',
        refreshTokenLength: refreshToken.length
      });
      
      if (!isAccessTokenValid) {
        console.error('[Auth] Access token format is invalid');
        console.error('[Auth] Access token does not match JWT pattern');
        console.error('[Auth] Token sample:', accessToken.substring(0, 50) + '...');
        throw new Error('invalid_token_format');
      }
      
      if (!isRefreshTokenValid) {
        console.error('[Auth] Refresh token format is invalid');
        console.error('[Auth] Refresh token too short:', refreshToken.length);
        throw new Error('invalid_token_format');
      }
      
      console.log('[Auth] Token validation passed, attempting to set session');
      
      // Set session with validated tokens
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      
      if (error) {
        console.error('[Auth] Supabase setSession error:', error.message);
        console.error('[Auth] Error code:', error.status);
        
        // Categorize error for better handling
        if (error.message.includes('invalid') || error.message.includes('malformed')) {
          throw new Error('invalid_token');
        } else if (error.message.includes('expired')) {
          throw new Error('session_expired');
        } else {
          throw new Error('session_error');
        }
      }
      
      if (!data.session) {
        console.error('[Auth] Session was not created despite no error');
        throw new Error('session_creation_failed');
      }
      
      console.log('[Auth] Session established successfully');
      console.log('[Auth] Session user ID:', data.session.user.id);
      console.log('[Auth] Session expires at:', new Date(data.session.expires_at! * 1000).toISOString());
      
      // Fetch user profile
      if (data.session?.user) {
        console.log('[Auth] Fetching user profile for:', data.session.user.id);
        
        try {
          let profile = await fetchUserProfile(data.session.user.id);
          
          // If profile doesn't exist, create a basic one
          if (!profile) {
            console.warn('[Auth] User profile not found, creating basic profile...');
            
            const authUser = data.session.user;
            const metadata = authUser.user_metadata;
            
            // Create basic user profile
            const { error: createError } = await supabase
              .from('users')
              .insert({
                id: authUser.id,
                full_name: metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                username: metadata?.username || authUser.email?.split('@')[0] || `user_${authUser.id.substring(0, 8)}`,
                role: metadata?.role || 'athlete',
                is_verified: false,
              });
            
            if (createError) {
              console.error('[Auth] Failed to create user profile:', createError);
              await supabase.auth.signOut();
              throw new Error('profile_load_failed');
            }
            
            // Try fetching again
            profile = await fetchUserProfile(authUser.id);
          }
          
          if (profile) {
            console.log('[Auth] User profile loaded successfully');
            console.log('[Auth] User details:', {
              username: profile.username,
              role: profile.role,
              isVerified: profile.is_verified
            });
            setUser(profile);
            console.log('[Auth] Authentication flow completed successfully');
          } else {
            console.error('[Auth] Failed to load user profile after creation');
            await supabase.auth.signOut();
            throw new Error('profile_load_failed');
          }
        } catch (profileError) {
          console.error('[Auth] Error fetching user profile:', profileError);
          await supabase.auth.signOut();
          throw new Error('profile_load_failed');
        }
      }
    } catch (error) {
      console.error('[Auth] Error in setSessionFromUrl:', error);
      
      // Log error details for debugging
      if (error instanceof Error) {
        console.error('[Auth] Error name:', error.name);
        console.error('[Auth] Error message:', error.message);
      }
      
      throw error;
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
