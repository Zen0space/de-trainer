import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Pressable, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
}

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onDismiss
}: ToastProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  // Responsive design
  const isSmallScreen = width < 380;
  const fontSize = isSmallScreen ? 14 : 16;
  const padding = isSmallScreen ? 12 : 16;
  
  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Auto dismiss after duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      
      return () => clearTimeout(timer);
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);
  
  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };
  
  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#10b981',
          iconName: 'check-circle' as const,
          iconColor: 'white',
        };
      case 'error':
        return {
          backgroundColor: '#ef4444',
          iconName: 'alert-circle' as const,
          iconColor: 'white',
        };
      case 'warning':
        return {
          backgroundColor: '#f59e0b',
          iconName: 'alert-triangle' as const,
          iconColor: 'white',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#3b82f6',
          iconName: 'info' as const,
          iconColor: 'white',
        };
    }
  };
  
  const styles = getToastStyles();
  
  if (!visible && opacity._value === 0) {
    return null;
  }
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <Pressable
        onPress={handleDismiss}
        style={{
          backgroundColor: styles.backgroundColor,
          borderRadius: 12,
          padding: padding,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Feather
          name={styles.iconName}
          size={20}
          color={styles.iconColor}
          style={{ marginRight: 12 }}
        />
        
        <Text
          style={{
            flex: 1,
            fontSize: fontSize,
            color: 'white',
            fontWeight: '500',
          }}
          numberOfLines={3}
        >
          {message}
        </Text>
        
        <Pressable
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginLeft: 8 }}
        >
          <Feather name="x" size={18} color="white" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
