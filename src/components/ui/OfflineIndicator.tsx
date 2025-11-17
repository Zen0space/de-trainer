import React, { useEffect, useState } from 'react';
import { View, Text, Animated, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

export function OfflineIndicator() {
  const { width } = useWindowDimensions();
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-50));
  
  // Responsive design
  const isSmallScreen = width < 380;
  const fontSize = isSmallScreen ? 12 : 14;
  
  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
      
      // Animate in/out
      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    
    return () => unsubscribe();
  }, []);
  
  if (!isOffline) {
    return null;
  }
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f59e0b',
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        transform: [{ translateY: slideAnim }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Feather name="wifi-off" size={16} color="white" style={{ marginRight: 8 }} />
      <Text
        style={{
          fontSize: fontSize,
          color: 'white',
          fontWeight: '600',
        }}
      >
        You're offline. Changes will sync when connected.
      </Text>
    </Animated.View>
  );
}
