import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable, useWindowDimensions, ScrollView } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider, useSession } from './src/contexts/AuthContext';
import { AuthScreen } from './src/components/auth/AuthScreen';
import { TrainerHomeScreen } from './src/screens/trainer/TrainerHomeScreen';
import { AthleteHomeScreen } from './src/screens/athlete/AthleteHomeScreen';
import { initializeTursoConnection } from './src/lib/turso-database';

function MainContent() {
  const { user, logout, isLoading } = useSession();
  
  // Debug logging
  console.log('🏠 MainContent - user:', user);
  console.log('🏠 MainContent - isLoading:', isLoading);
  
  // Responsive design calculations
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  
  // Responsive values
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const cardPadding = isSmallScreen ? 16 : isTablet ? 24 : 20;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View className="flex-1 bg-background items-center justify-center">
          <View className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4 animate-spin" />
          <Text className="text-secondary text-base">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <AuthScreen />
      </SafeAreaView>
    );
  }

  // User is authenticated - show role-specific screen
  if ((user.role as string) === 'trainer') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <TrainerHomeScreen />
      </SafeAreaView>
    );
  }

  // Athlete dashboard
  if ((user.role as string) === 'athlete') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <AthleteHomeScreen />
      </SafeAreaView>
    );
  }

  // Default dashboard for other roles (fallback)
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View className="flex-1 bg-background">
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: containerPadding }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: isTablet ? 500 : 400, gap: spacing }} className="w-full self-center">
          {/* Header */}
          <View className="bg-white p-6 rounded-2xl items-center border border-border">
            <View className="w-16 h-16 bg-primary rounded-2xl mb-4 items-center justify-center">
              <Text className="text-2xl">
                {(user.role as string) === 'trainer' ? '💪' : '🏃‍♂️'}
              </Text>
            </View>
            <Text 
              style={{ fontSize: titleFontSize }}
              className="font-bold mb-2 text-center text-gray-800"
            >
              Welcome back, {user.full_name}!
            </Text>
            <View style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 9999,
              backgroundColor: (user.role as string) === 'trainer' ? '#f3e8ff' : '#f0fdf4'
            }}>
              <Text style={{
                fontWeight: '600',
                fontSize: 14,
                textTransform: 'capitalize',
                color: (user.role as string) === 'trainer' ? '#9333ea' : '#10b981'
              }}>
                {user.role}
              </Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={{ gap: spacing }}>
            <View className="bg-white p-5 rounded-2xl border border-border">
              <Text 
                style={{ fontSize: fontSize + 2 }}
                className="font-semibold text-gray-800 mb-1"
              >
                Total Sessions
              </Text>
              <Text 
                style={{ fontSize: titleFontSize + 8 }}
                className="font-bold text-primary mb-1"
              >
                12
              </Text>
              <Text 
                style={{ fontSize: fontSize - 2 }}
                className="text-secondary"
              >
                This month
              </Text>
              <Text 
                style={{ fontSize: fontSize - 4 }}
                className="text-primary mt-1"
              >
                +2 from last month
              </Text>
            </View>
            
            <View className="bg-white p-5 rounded-2xl border border-border">
              <Text 
                style={{ fontSize: fontSize + 2 }}
                className="font-semibold text-gray-800 mb-1"
              >
                Progress Score
              </Text>
              <Text 
                style={{ fontSize: titleFontSize + 8 }}
                className="font-bold text-primary mb-1"
              >
                85%
              </Text>
              <Text 
                style={{ fontSize: fontSize - 2 }}
                className="text-secondary"
              >
                Overall fitness
              </Text>
              <Text 
                style={{ fontSize: fontSize - 4 }}
                className="text-primary mt-1"
              >
                +5% this week
              </Text>
            </View>
          </View>

          {/* Dashboard Card */}
          <View className="bg-white p-6 rounded-2xl border border-border">
            <Text 
              style={{ fontSize: titleFontSize - 4 }}
              className="font-bold mb-4 text-center text-gray-800"
            >
              {(user.role as string) === 'trainer' ? '🎯 Trainer Hub' : '🚀 Athlete Zone'}
            </Text>
            
            <Text 
              style={{ fontSize: fontSize, lineHeight: 24 }}
              className="text-secondary mb-6 text-center"
            >
              {(user.role as string) === 'trainer' 
                ? 'Manage your athletes, track their progress, and create personalized workout plans.'
                : 'View your training sessions, track improvements, and achieve your fitness goals.'}
            </Text>
            
            <View style={{ gap: spacing }}>
              <Pressable className="bg-primary py-4 rounded-xl items-center">
                <Text 
                  style={{ fontSize: fontSize }}
                  className="text-white font-semibold"
                >
                  {(user.role as string) === 'trainer' ? '👥 Manage Athletes' : '💪 View Workouts'}
                </Text>
              </Pressable>
              
              <Pressable className="bg-white border border-primary py-4 rounded-xl items-center">
                <Text 
                  style={{ fontSize: fontSize }}
                  className="text-primary font-semibold"
                >
                  {(user.role as string) === 'trainer' ? '📊 Analytics' : '📈 Progress'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Sign Out */}
          <View className="bg-white p-6 rounded-2xl border border-border">
            <Pressable
              onPress={logout}
              className="bg-gray-100 py-4 rounded-xl items-center"
            >
              <Text 
                style={{ fontSize: fontSize }}
                className="text-secondary font-semibold"
              >
                👋 Sign Out
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await initializeTursoConnection();
        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Turso connection:', error);
        setDbError(error instanceof Error ? error.message : 'Database connection failed');
      }
    };

    initializeDatabase();
  }, []);

  // Show loading screen while initializing database
  if (!dbInitialized && !dbError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
          <View style={{ 
            width: 32, 
            height: 32, 
            borderWidth: 2, 
            borderColor: '#007AFF', 
            borderTopColor: 'transparent', 
            borderRadius: 16, 
            marginBottom: 16 
          }} />
          <Text style={{ fontSize: 16, color: '#666' }}>Connecting to database...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error screen if database connection failed
  if (dbError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 }}>
          <Text style={{ fontSize: 24, marginBottom: 16, color: '#FF3B30' }}>❌</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>Database Connection Failed</Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>{dbError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <MainContent />
          <StatusBar style="auto" />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}