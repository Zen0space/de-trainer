import React from 'react';
import {
  View,
  Text,
  Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface ScheduleHeaderProps {
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  cardPadding?: number;
  titleFontSize?: number;
  fontSize?: number;
  spacing?: number;
  showIcon?: boolean;
  iconColor?: string;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  onBack,
  title = 'Schedule Management',
  subtitle,
  cardPadding = 20,
  titleFontSize = 24,
  fontSize = 16,
  spacing = 16,
  showIcon = true,
  iconColor = '#10b981'
}) => {
  return (
    <View style={{
      backgroundColor: 'white',
      padding: cardPadding,
      borderRadius: 16,
      marginBottom: spacing,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack && (
          <Pressable
            onPress={onBack}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: '#f3f4f6',
              marginRight: 12
            }}
          >
            <Feather name="arrow-left" size={20} color="#6b7280" />
          </Pressable>
        )}

        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: titleFontSize,
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: 4
          }}>
            {title}
          </Text>
          {subtitle && (
            <Text style={{ color: '#6b7280', fontSize: fontSize - 2 }}>
              {subtitle}
            </Text>
          )}
        </View>

        {showIcon && (
          <View style={{
            width: 40,
            height: 40,
            backgroundColor: iconColor,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Feather name="calendar" size={20} color="white" />
          </View>
        )}
      </View>
    </View>
  );
};