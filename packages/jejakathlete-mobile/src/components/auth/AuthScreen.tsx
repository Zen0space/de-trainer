import React, { useState, useRef } from 'react';
import { View, KeyboardAvoidingView, Alert, Text, useWindowDimensions, Pressable, ScrollView } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { TabView } from '../ui/TabView';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useKeyboardAware } from '../../hooks/useKeyboardAware';

type AuthMode = 'login' | 'register';
type UserRole = 'trainer' | 'athlete';

interface LoginForm {
  email: string;
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
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  
  // Responsive values
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 20;
  const titleFontSize = isSmallScreen ? 24 : isTablet ? 32 : 28;
  const subtitleFontSize = isSmallScreen ? 14 : isTablet ? 16 : 15;
  const inputFontSize = 16;
  const spacing = isSmallScreen ? 10 : isTablet ? 16 : 12;
  const headerSpacing = isSmallScreen ? 24 : isTablet ? 40 : 32;
  const containerWidth = isTablet ? '60%' : '100%';
  const maxContainerWidth = isTablet ? 500 : 400;
  
  // Keyboard-aware scrolling
  const { keyboardAvoidingViewProps, scrollViewProps } = useKeyboardAware({ containerPadding });
  
  // Experience level options
  const experienceLevels = [
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Advanced', value: 'advanced' },
    { label: 'Elite', value: 'elite' }
  ];
  
  // Tab configuration
  const roleTabs = [
    { key: 'athlete', title: 'Athlete' },
    { key: 'trainer', title: 'Trainer' }
  ];
  
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
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

  // Validation helper functions
  const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return null;
  };

  const validateUsername = (username: string): string | null => {
    if (!username) return 'Username is required';
    if (username.includes(' ')) return 'Username cannot contain spaces';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return 'Username can only contain letters, numbers, dots, hyphens, and underscores';
    return null;
  };

  const validateTrainerCode = (trainerCode: string): string | null => {
    if (!trainerCode) return 'Trainer code is required';
    const trainerCodePattern = /^TR\d{3}$/;
    if (!trainerCodePattern.test(trainerCode)) {
      return 'Trainer code must be in format TR### (e.g., TR001, TR002)';
    }
    return null;
  };

  const validateForm = async () => {
    const newErrors: Record<string, string> = {};
    
    if (authMode === 'login') {
      const emailError = validateEmail(loginForm.email);
      if (emailError) newErrors.email = emailError;
      if (!loginForm.password) newErrors.password = 'Password is required';
    } else {
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
        const trainerCodeError = validateTrainerCode(registerForm.trainer_code || '');
        if (trainerCodeError) {
          newErrors.trainer_code = trainerCodeError;
        }
      } else {
        if (!registerForm.sport) newErrors.sport = 'Sport is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!(await validateForm())) return;
    
    try {
      const result = await login({
        email: loginForm.email,
        password: loginForm.password,
      });
      
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
      const userData = registerForm.role === 'trainer'
        ? {
            email: registerForm.email,
            password: registerForm.password,
            full_name: registerForm.full_name,
            username: registerForm.username,
            role: 'trainer' as const,
            trainer_code: registerForm.trainer_code!,
            certification_id: registerForm.certification_id,
            specialization: registerForm.specialization,
          }
        : {
            email: registerForm.email,
            password: registerForm.password,
            full_name: registerForm.full_name,
            username: registerForm.username,
            role: 'athlete' as const,
            sport: registerForm.sport!,
            level: (registerForm.level || 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'elite',
          };
      
      const result = await register(userData);
      
      if (!result.success) {
        Alert.alert('Registration Failed', result.error || 'Please check your information');
      } else {
        Alert.alert(
          'Registration Successful!', 
          'Your account has been created. Please check your email to verify your account, then you can log in.',
          [
            {
              text: 'OK',
              onPress: () => {
                setAuthMode('login');
                setLoginForm({
                  email: registerForm.email,
                  password: ''
                });
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
      className="flex-1"
    >
      {/* Modern gradient background */}
      <View className="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-purple-50" />

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
          {/* Modern Header with enhanced styling */}
          <View style={{ marginBottom: headerSpacing }} className="items-center">
            {/* Logo/Icon placeholder */}
            <View className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center shadow-lg">
              <Text className="text-white text-2xl font-bold">JA</Text>
            </View>

            <Text
              style={{ fontSize: titleFontSize, marginBottom: spacing }}
              className="font-bold text-gray-900 text-center"
            >
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text
              style={{
                fontSize: subtitleFontSize,
                lineHeight: subtitleFontSize * 1.5,
                paddingHorizontal: isSmallScreen ? 8 : 0
              }}
              className="text-gray-600 text-center font-medium"
            >
              {authMode === 'login'
                ? "Sign in to continue your fitness journey"
                : 'Join Jejak Atlet and start tracking progress'}
            </Text>
          </View>

          {/* Modern Card Container for form */}
          <View className="bg-white rounded-3xl shadow-xl p-6 mb-6">
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

            {authMode === 'register' && (
              <Input
                placeholder="Username"
                value={registerForm.username}
                onChangeText={(text) => setRegisterForm({ ...registerForm, username: text })}
                error={errors.username}
                autoCapitalize="none"
              />
            )}

            <Input
              placeholder="Email Address"
              value={authMode === 'login' ? loginForm.email : registerForm.email}
              onChangeText={(text) => {
                if (authMode === 'login') {
                  setLoginForm({ ...loginForm, email: text });
                } else {
                  setRegisterForm({ ...registerForm, email: text });
                }
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />

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
                <Pressable onPress={() => {/* TODO: Implement forgot password with supabase.auth.resetPasswordForEmail */}}>
                  <Text className="text-blue-600 text-sm font-medium">
                    Forgot Password?
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Modern Sign In Button with gradient effect */}
            <View style={{ marginBottom: spacing * 2 }}>
              <Button
                title={isLoading ? 'Loading...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                onPress={authMode === 'login' ? handleLogin : handleRegister}
                disabled={isLoading}
                variant="primary"
                size="medium"
              />
            </View>
          </View>

          {/* Modern Switch Auth Mode */}
          <View className="items-center mt-4">
            <Text style={{ fontSize: isSmallScreen ? 12 : 14 }} className="text-gray-600">
              {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Pressable onPress={switchAuthMode}>
                <Text
                  style={{ fontSize: isSmallScreen ? 12 : 14 }}
                  className="text-blue-600 font-semibold"
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