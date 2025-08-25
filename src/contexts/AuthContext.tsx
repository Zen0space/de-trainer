import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStorageState } from './useStorageState';
import { loginUser, registerUser, refreshUserData } from '../lib/api';
import { 
  AuthUser, 
  AuthContextType, 
  LoginCredentials, 
  RegisterTrainerData, 
  RegisterAthleteData, 
  AuthResponse 
} from '../types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

export function useSession() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }
  return value;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [[isLoading, session], setSession] = useStorageState('session');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize user from stored session
  useEffect(() => {
    const initializeAuth = async () => {
      if (session) {
        try {
          console.log('🔄 Session found, attempting to restore:', session);
          
          // Extract user ID from session token (format: session_userId_timestamp)
          const sessionParts = session.split('_');
          if (sessionParts.length >= 2 && sessionParts[0] === 'session') {
            const userId = parseInt(sessionParts[1]);
            
            if (!isNaN(userId)) {
              console.log('🔄 Restoring session for user ID:', userId);
              const response = await refreshUserData(userId);
              
              if (response.success && response.user) {
                console.log('✅ Session restored successfully:', response.user);
                setUser(response.user);
              } else {
                console.log('❌ Session validation failed:', response.error);
                setSession(null);
              }
            } else {
              console.log('❌ Invalid session format, clearing session');
              setSession(null);
            }
          } else {
            console.log('❌ Invalid session token format, clearing session');
            setSession(null);
          }
        } catch (error) {
          console.error('❌ Error restoring session:', error);
          setSession(null);
        }
      }
      setIsInitializing(false);
    };

    if (!isLoading) {
      initializeAuth();
    }
  }, [isLoading, session, setSession]);

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await loginUser(credentials);
      console.log('🔐 AuthContext - Login response:', response);
      
      if (response.success && response.user) {
        console.log('🔐 AuthContext - Setting user:', response.user);
        setUser(response.user);
        
        // For now, create a simple session token since we don't have JWT implementation
        const simpleToken = `session_${response.user.id}_${Date.now()}`;
        setSession(simpleToken);
        return response;
      } else {
        console.log('🔐 AuthContext - Login failed:', response.error);
        return response;
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  };

  const register = async (userData: RegisterTrainerData | RegisterAthleteData): Promise<AuthResponse> => {
    try {
      const response = await registerUser(userData);
      
      if (response.success && response.user && response.token) {
        setUser(response.user);
        setSession(response.token);
        return response;
      } else {
        return response;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (session && user) {
      try {
        const response = await refreshUserData(Number(user.id));
        if (response.success && response.user) {
          setUser(response.user);
        }
      } catch (error) {
        console.error('Error refreshing user:', error);
      }
    }
  };

  const isTrainer = (): boolean => {
    return user?.role === 'trainer';
  };

  const isAthlete = (): boolean => {
    return user?.role === 'athlete';
  };

  const contextValue: AuthContextType = {
    user,
    isLoading: isLoading || isInitializing,
    isAuthenticated: !!user && !!session,
    login,
    register,
    logout,
    isTrainer,
    isAthlete,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Utility function to parse JWT token payload
function parseTokenPayload(token: string): AuthUser | null {
  try {
    // Simple JWT parsing (in production, use a proper JWT library)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    
    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    
    return payload.user || null;
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
}


