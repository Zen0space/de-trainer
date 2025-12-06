import React, { useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface RestTimerProps {
  timeRemaining: number;
  onTimeUpdate: (time: number) => void;
  onComplete: () => void;
  onSkip: () => void;
}

export function RestTimer({ 
  timeRemaining, 
  onTimeUpdate, 
  onComplete, 
  onSkip 
}: RestTimerProps) {
  const { width } = useWindowDimensions();
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const fontSize = isSmallScreen ? 14 : 16;

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining <= 0) {
      onComplete();
      return;
    }
    
    const timer = setInterval(() => {
      onTimeUpdate(timeRemaining - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <View style={{
      backgroundColor: '#fef3c7',
      padding: containerPadding + 8,
      borderRadius: 16,
      alignItems: 'center'
    }}>
      <Feather name="clock" size={48} color="#f59e0b" style={{ marginBottom: 16 }} />
      
      <Text style={{
        fontSize: fontSize,
        color: '#92400e',
        marginBottom: 8
      }}>
        Rest Time
      </Text>
      
      <Text style={{
        fontSize: 56,
        fontWeight: 'bold',
        color: '#f59e0b',
        marginBottom: 16
      }}>
        {formatTime(timeRemaining)}
      </Text>
      
      <Pressable
        onPress={onSkip}
        style={{
          backgroundColor: 'white',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: '#f59e0b'
        }}
      >
        <Text style={{
          fontSize: fontSize,
          fontWeight: '600',
          color: '#f59e0b'
        }}>
          Skip Rest
        </Text>
      </Pressable>
    </View>
  );
}
