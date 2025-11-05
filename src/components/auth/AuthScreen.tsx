import React, { useState, useEffect, useRef } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, Text, useWindowDimensions, Pressable, ScrollView } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { RegisterTrainerData, RegisterAthleteData } from '../../types/auth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { TabView } from '../ui/TabView';
import { cn } from '../../lib/utils';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useKeyboardAware } from '../../hooks/useKeyboardAware';
import { tursoDbHelpers } from '../../lib/turso-database';

type AuthMode = 'login' | 'register';
type UserRole = 'trainer' | 'athlete';

interface LoginForm {
  identifier: string; // Can be username or email
  password: string;
}

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  trainer_code?: string;
  certification_id?: string;
  specialization?: string;
  sport?: string;
  level?: string;
}

export function AuthScreen() {
  const { login, register, isLoading } = useSession();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('athlete');
  
  // Keyboard detection
  const keyboard = useKeyboard();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Responsive design calculations
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  
  // Responsive values - optimized for mobile apps
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 20;
  const titleFontSize = isSmallScreen ? 24 : isTablet ? 32 : 28;
  const subtitleFontSize = isSmallScreen ? 14 : isTablet ? 16 : 15;
  const inputPadding = isSmallScreen ? 12 : 14;
  const inputFontSize = 16; // Standard 16sp for all screen sizes
  const buttonPadding = isSmallScreen ? 12 : 14;
  const buttonFontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 10 : isTablet ? 16 : 12; // Reduced spacing
  const headerSpacing = isSmallScreen ? 24 : isTablet ? 40 : 32; // Reduced header spacing
  const containerWidth = isTablet ? '60%' : '100%';
  const maxContainerWidth = isTablet ? 500 : 400;
  
  // Keyboard-aware scrolling
  const { keyboardAvoidingViewProps, scrollViewProps } = useKeyboardAware({ containerPadding });
  
  // Monitor keyboard state changes for responsive behavior
  useEffect(() => {
    // Keyboard state is handled by the useKeyboardAware hook
  }, [keyboard.isVisible, keyboard.height, keyboard.duration, keyboard.easing, height]);
  
  // Experience level options
  const experienceLevels = [
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Advanced', value: 'advanced' },
    { label: 'Professional', value: 'professional' }
  ];
  
  // Tab configuration
  const roleTabs = [
    { key: 'athlete', title: 'Athlete' },
    { key: 'trainer', title: 'Trainer' }
  ];
  
  const [loginForm, setLoginForm] = useState<LoginForm>({
    identifier: '',
    password: '',
  });
  
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'athlete',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper function to detect if input is email or username
  const isEmail = (input: string): boolean => {
    return input.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  // Validation helper functions
  const validateIdentifier = (identifier: string): string | null => {
    if (!identifier) return 'Username or email is required';
    if (identifier.includes(' ')) return 'Username or email cannot contain spaces';
    
    // If it looks like an email, validate as email
    if (identifier.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) return 'Please enter a valid email address';
    } else {
      // Validate as username
      if (identifier.length < 3) return 'Username must be at least 3 characters';
      if (!/^[a-zA-Z0-9_.-]+$/.test(identifier)) return 'Username can only contain letters, numbers, dots, hyphens, and underscores';
    }
    return null;
  };

  const validateUsername = (username: string): string | null => {
    if (!username) return 'Username is required';
    if (username.includes(' ')) return 'Username cannot contain spaces';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return 'Username can only contain letters, numbers, dots, hyphens, and underscores';
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return null;
  };

  const validateTrainerCode = (trainerCode: string): string | null => {
    if (!trainerCode) return 'Trainer code is required';
    
    // Check format: TR followed by exactly 3 digits
    const trainerCodePattern = /^TR\d{3}$/;
    if (!trainerCodePattern.test(trainerCode)) {
      return 'Trainer code must be in format TR### (e.g., TR001, TR002)';
    }
    
    return null;
  };

  const checkTrainerCodeExists = async (trainerCode: string): Promise<boolean> => {
    try {
      const existingTrainer = await tursoDbHelpers.get(
        'SELECT trainer_code FROM trainers WHERE trainer_code = ?',
        [trainerCode]
      );
      return !!existingTrainer;
    } catch (error) {
      console.error('Error checking trainer code:', error);
      return false; // If error, allow the registration to proceed
    }
  };

  const validateForm = async () => {
    const newErrors: Record<string, string> = {};
    
    if (authMode === 'login') {
      // Login validation - flexible identifier (username or email)
      const identifierError = validateIdentifier(loginForm.identifier);
      if (identifierError) newErrors.identifier = identifierError;
      if (!loginForm.password) newErrors.password = 'Password is required';
    } else {
      // Registration validation
      const usernameError = validateUsername(registerForm.username);
      if (usernameError) newErrors.username = usernameError;
      
      const emailError = validateEmail(registerForm.email);
      if (emailError) newErrors.email = emailError;
      
      if (!registerForm.password) newErrors.password = 'Password is required';
      if (registerForm.password && registerForm.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      
      if (!registerForm.full_name) newErrors.full_name = 'Full name is required';
      
      if (registerForm.role === 'trainer') {
        // Trainer-specific validation
        const trainerCodeError = validateTrainerCode(registerForm.trainer_code || '');
        if (trainerCodeError) {
          newErrors.trainer_code = trainerCodeError;
        } else {
          // Check if trainer code already exists
          const trainerCodeExists = await checkTrainerCodeExists(registerForm.trainer_code || '');
          if (trainerCodeExists) {
            newErrors.trainer_code = `Trainer code ${registerForm.trainer_code} is already taken. Please choose a different number.`;
          }
        }
      } else {
        // Athlete-specific validation
        if (!registerForm.sport) newErrors.sport = 'Sport is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!(await validateForm())) return;
    
    try {
      // Determine if identifier is email or username
      const loginData = isEmail(loginForm.identifier) 
        ? { email: loginForm.identifier, password: loginForm.password }
        : { username: loginForm.identifier, password: loginForm.password };
      
      const result = await login(loginData);
      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Please check your credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleRegister = async () => {
    if (!(await validateForm())) return;
    
    try {
      const result = await register(registerForm as RegisterTrainerData | RegisterAthleteData);
      if (!result.success) {
        Alert.alert('Registration Failed', result.error || 'Please check your information');
      } else {
        // Registration successful - show success message and navigate to login
        Alert.alert(
          'Registration Successful!', 
          'Your account has been created successfully. Please log in with your credentials.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Switch to login mode
                setAuthMode('login');
                // Pre-fill login identifier with username
                setLoginForm({
                  identifier: registerForm.username,
                  password: ''
                });
                // Clear errors and registration form
                setErrors({});
                setRegisterForm({
                  username: '',
                  email: '',
                  password: '',
                  full_name: '',
                  role: 'athlete',
                });
                setSelectedRole('athlete');
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    setErrors({});
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setRegisterForm({ ...registerForm, role });
  };

  return (
    <KeyboardAvoidingView 
      {...keyboardAvoidingViewProps}
      className="flex-1 bg-background"
    >
      <ScrollView 
        ref={scrollViewRef}
        {...scrollViewProps}
        contentContainerStyle={{
          ...scrollViewProps.contentContainerStyle,
          flexGrow: 1,
          justifyContent: 'center'
        }}
      >
        <View style={{ maxWidth: maxContainerWidth, width: containerWidth }} className="self-center">
          {/* Header */}
          <View style={{ marginBottom: headerSpacing }} className="items-center">
            <Text 
              style={{ fontSize: titleFontSize, marginBottom: spacing }}
              className="font-bold text-gray-800 text-center"
            >
              {authMode === 'login' ? 'Hello Again!' : 'Welcome!'}
            </Text>
            <Text 
              style={{ 
                fontSize: subtitleFontSize, 
                lineHeight: subtitleFontSize * 1.5,
                paddingHorizontal: isSmallScreen ? 8 : 0
              }}
              className="text-secondary text-center"
            >
              {authMode === 'login' 
                ? "Welcome back, You've been missed!" 
                : 'Create your Jejak Atlet account'}
            </Text>
          </View>

          {/* Role Selection for Register */}
          {authMode === 'register' && (
            <View style={{ marginBottom: spacing * 1.5 }}>
              <Text 
                style={{ fontSize: inputFontSize, marginBottom: spacing }}
                className="font-semibold text-gray-700 text-center"
              >
                I am a
              </Text>
              <TabView
                tabs={roleTabs}
                activeTab={selectedRole}
                onTabChange={(tabKey) => handleRoleSelect(tabKey as UserRole)}
              />
            </View>
          )}

          {/* Form Fields */}
          <View style={{ gap: spacing, marginBottom: spacing * 2 }}>
            {authMode === 'register' && (
              <Input
                placeholder="Full Name"
                value={registerForm.full_name}
                onChangeText={(text) => setRegisterForm({ ...registerForm, full_name: text })}
                error={errors.full_name}
                autoCapitalize="words"
              />
            )}

            <Input
              placeholder={authMode === 'login' ? "Enter Username or Email" : "Enter Username"}
              value={authMode === 'login' ? loginForm.identifier : registerForm.username}
              onChangeText={(text) => {
                if (authMode === 'login') {
                  setLoginForm({ ...loginForm, identifier: text });
                } else {
                  setRegisterForm({ ...registerForm, username: text });
                }
              }}
              error={authMode === 'login' ? errors.identifier : errors.username}
              keyboardType={authMode === 'login' ? "default" : "default"}
              autoCapitalize="none"
            />

            {authMode === 'register' && (
              <Input
                placeholder="Enter Email Address"
                value={registerForm.email}
                onChangeText={(text) => {
                  setRegisterForm({ ...registerForm, email: text });
                }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}

            <Input
              placeholder="Password"
              value={authMode === 'login' ? loginForm.password : registerForm.password}
              onChangeText={(text) => {
                if (authMode === 'login') {
                  setLoginForm({ ...loginForm, password: text });
                } else {
                  setRegisterForm({ ...registerForm, password: text });
                }
              }}
              error={errors.password}
              secureTextEntry
              showPasswordToggle
            />

            {/* Role-specific fields for registration */}
            {authMode === 'register' && (
              <>
                {selectedRole === 'trainer' ? (
                  <>
                    <View>
                      <Input
                        placeholder="Enter your trainer code (e.g., TR001)"
                        value={registerForm.trainer_code || ''}
                        onChangeText={(text) => {
                          // Auto-format: ensure TR prefix and uppercase, limit to 5 characters
                          let formattedCode = text.toUpperCase().substring(0, 5);
                          if (!formattedCode.startsWith('TR') && formattedCode.length > 0) {
                            formattedCode = 'TR' + formattedCode.replace(/^TR/i, '');
                          }
                          setRegisterForm({ ...registerForm, trainer_code: formattedCode });
                        }}
                        error={errors.trainer_code}
                        autoCapitalize="characters"
                      />
                      <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                        Format: TR### (e.g., TR001, TR002) - Required for trainer verification
                      </Text>
                    </View>
                    
                    <Input
                      placeholder="Certification ID (Optional)"
                      value={registerForm.certification_id || ''}
                      onChangeText={(text) => setRegisterForm({ ...registerForm, certification_id: text })}
                    />
                    
                    <Input
                      placeholder="Specialization (e.g., Strength Training)"
                      value={registerForm.specialization || ''}
                      onChangeText={(text) => setRegisterForm({ ...registerForm, specialization: text })}
                    />
                  </>
                ) : (
                  <>
                    <Input
                      placeholder="What sport do you practice?"
                      value={registerForm.sport || ''}
                      onChangeText={(text) => setRegisterForm({ ...registerForm, sport: text })}
                      error={errors.sport}
                    />
                    
                    <Dropdown
                      placeholder="Experience Level"
                      value={registerForm.level || ''}
                      onSelect={(value) => setRegisterForm({ ...registerForm, level: value })}
                      options={experienceLevels}
                      error={errors.level}
                    />
                  </>
                )}
              </>
            )}
          </View>

          {/* Forgot Password */}
          {authMode === 'login' && (
            <View style={{ marginBottom: spacing }} className="items-end">
              <Pressable onPress={() => {/* TODO: Implement forgot password */}}>
                <Text className="text-primary text-sm font-medium">
                  Forgot Password?
                </Text>
              </Pressable>
            </View>
          )}

          {/* Sign In Button */}
          <View style={{ marginBottom: spacing * 2 }}>
            <Button
              title={isLoading ? 'Loading...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
              onPress={authMode === 'login' ? handleLogin : handleRegister}
              disabled={isLoading}
              variant="primary"
              size="medium"
            />
          </View>

          {/* Switch Auth Mode */}
          <View className="items-center">
            <Text style={{ fontSize: isSmallScreen ? 12 : 14 }} className="text-secondary">
              {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Pressable onPress={switchAuthMode}>
                <Text 
                  style={{ fontSize: isSmallScreen ? 12 : 14 }}
                  className="text-primary font-semibold"
                >
                  {authMode === 'login' ? 'Register Now' : 'Sign In'}
                </Text>
              </Pressable>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}