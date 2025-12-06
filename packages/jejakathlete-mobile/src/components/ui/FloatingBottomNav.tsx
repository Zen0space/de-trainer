import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, useWindowDimensions, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Import screen components
import { TrainerReportScreen } from '../../screens/trainer/TrainerReportScreen';
import { TrainingLogScreen } from '../../screens/trainer/TrainingLogScreen';
import { SettingsScreen } from '../../screens/trainer/SettingsScreen';

interface FloatingBottomNavProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  userRole?: 'trainer' | 'athlete';
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface RouteConfig {
  component: React.ComponentType<any>;
  props?: any;
}

// Route configurations for trainer screens
export const trainerRoutes: Record<string, RouteConfig> = {
  home: {
    component: View, // Home screen is handled separately in parent component
    props: {}
  },
  training: {
    component: TrainingLogScreen,
    props: {}
  },
  reports: {
    component: TrainerReportScreen,
    props: { onBack: () => {} } // Will be overridden by parent
  },
  settings: {
    component: SettingsScreen,
    props: {}
  }
};

// Route configurations for athlete screens (placeholder for future implementation)
export const athleteRoutes: Record<string, RouteConfig> = {
  home: {
    component: View,
    props: {}
  },
  workouts: {
    component: View,
    props: {}
  },
  trainer: {
    component: View,
    props: {}
  },
  settings: {
    component: View,
    props: {}
  }
};

const trainerNavItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'training', label: 'Training Log', icon: 'activity' },
  { id: 'reports', label: 'Reports', icon: 'bar-chart-2' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const athleteNavItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'workouts', label: 'Workouts', icon: 'clipboard' },
  { id: 'trainer', label: 'Trainer', icon: 'user-check' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

// Helper function to get routes based on user role
export const getRoutes = (userRole: 'trainer' | 'athlete' = 'trainer') => {
  return userRole === 'trainer' ? trainerRoutes : athleteRoutes;
};

// Helper function to render a screen component based on active tab
export const renderScreenFromRoute = (
  activeTab: string, 
  userRole: 'trainer' | 'athlete' = 'trainer',
  customProps?: any
) => {
  const routes = getRoutes(userRole);
  const route = routes[activeTab];
  
  if (!route) {
    return null;
  }
  
  const Component = route.component;
  const props = { ...route.props, ...customProps };
  
  return <Component {...props} />;
};

export function FloatingBottomNav({ activeTab, onTabPress, userRole = 'trainer' }: FloatingBottomNavProps) {
  const { width } = useWindowDimensions();
  
  // Get navigation items based on user role
  const navItems = userRole === 'athlete' ? athleteNavItems : trainerNavItems;
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 12 : isTablet ? 24 : 16;
  const bottomOffset = 16; // Simple bottom padding - SafeAreaView handles safe area
  const iconSize = isSmallScreen ? 20 : 24;
  const fontSize = isSmallScreen ? 10 : 12;
  const buttonPadding = isSmallScreen ? 8 : 12;
  const containerHeight = isSmallScreen ? 70 : isTablet ? 90 : 80;

  // Animation values for each tab
  const animationValues = useRef(
    navItems.reduce((acc, item) => {
      acc[item.id] = {
        scale: new Animated.Value(0),
        opacity: new Animated.Value(0),
      };
      return acc;
    }, {} as Record<string, { scale: Animated.Value; opacity: Animated.Value }>)
  ).current;

  // Animate active tab
  useEffect(() => {
    navItems.forEach((item) => {
      const isActive = activeTab === item.id;
      const { scale, opacity } = animationValues[item.id];

      Animated.parallel([
        Animated.timing(scale, {
          toValue: isActive ? 1 : 0,
          duration: 200,
          useNativeDriver: false, // backgroundColor animation requires false
        }),
        Animated.timing(opacity, {
          toValue: isActive ? 1 : 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    });
  }, [activeTab, animationValues]);

  return (
    <View
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: containerPadding,
        right: containerPadding,
        height: containerHeight,
        backgroundColor: 'white',
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: containerPadding,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
      }}
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const { scale, opacity } = animationValues[item.id];
        
        // Create interpolated values for smooth transitions
        const animatedScale = scale.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.1],
        });
        
        const animatedBackgroundColor = opacity.interpolate({
          inputRange: [0, 1],
          outputRange: ['rgba(59, 130, 246, 0)', 'rgba(59, 130, 246, 1)'], // transparent to blue
        });

        const animatedPadding = scale.interpolate({
          inputRange: [0, 1],
          outputRange: [4, 8],
        });
        
        return (
          <Pressable
            key={item.id}
            onPress={() => onTabPress(item.id)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: buttonPadding,
              paddingHorizontal: 4,
              borderRadius: 12,
              backgroundColor: 'transparent',
            }}
          >
            <Animated.View
              style={{
                marginBottom: 4,
                padding: animatedPadding,
                borderRadius: 12, // Increased from 8 to 16 for more rounded corners
                backgroundColor: animatedBackgroundColor,
                transform: [{ scale: animatedScale }],
              }}
            >
              <Feather
                name={item.icon as any}
                size={iconSize}
                color={isActive ? 'white' : '#6b7280'}
              />
            </Animated.View>
            
            <Animated.Text
              style={{
                fontSize: fontSize,
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#3b82f6' : '#6b7280',
                textAlign: 'center',
                opacity: opacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
              }}
              numberOfLines={1}
            >
              {item.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}
