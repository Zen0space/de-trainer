import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, Text, useWindowDimensions, Pressable, ScrollView } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { RegisterTrainerData, RegisterAthleteData } from '../../types/auth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dropdown } from '../ui/Dropdown';
import { TabView } from '../ui/TabView';
import { cn } from '../../lib/utils';

type AuthMode = 'login' | 'register';
type UserRole = 'trainer' | 'athlete';

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm extends LoginForm {
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
    email: '',
    password: '',
  });
  
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    email: '',
    password: '',
    full_name: '',
    role: 'athlete',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (authMode === 'login') {
      if (!loginForm.email) newErrors.email = 'Email is required';
      if (!loginForm.password) newErrors.password = 'Password is required';
    } else {
      if (!registerForm.email) newErrors.email = 'Email is required';
      if (!registerForm.password) newErrors.password = 'Password is required';
      if (!registerForm.full_name) newErrors.full_name = 'Full name is required';
      
      if (registerForm.role === 'trainer') {
        if (!registerForm.trainer_code) newErrors.trainer_code = 'Trainer code is required';
      } else {
        if (!registerForm.sport) newErrors.sport = 'Sport is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    try {
      const result = await login({ email: loginForm.email, password: loginForm.password });
      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Please check your credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    try {
      const result = await register(registerForm as RegisterTrainerData | RegisterAthleteData);
      if (!result.success) {
        Alert.alert('Registration Failed', result.error || 'Please check your information');
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: containerPadding }}
        showsVerticalScrollIndicator={false}
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
                : 'Create your DE-Trainer account'}
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
              placeholder="Enter Username"
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
                        placeholder="Enter your certification code"
                        value={registerForm.trainer_code || ''}
                        onChangeText={(text) => setRegisterForm({ ...registerForm, trainer_code: text })}
                        error={errors.trainer_code}
                      />
                      <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                        Required for trainer verification
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