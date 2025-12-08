import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  size = 'medium',
  style,
}) => {
  if (count === 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  const sizeStyles = {
    small: { width: 16, height: 16, fontSize: 10 },
    medium: { width: 20, height: 20, fontSize: 12 },
    large: { width: 24, height: 24, fontSize: 14 },
  };

  const { width, height, fontSize } = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        { width, height, borderRadius: width / 2 },
        style,
      ]}>
      <Text style={[styles.badgeText, { fontSize }]}>{displayCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -4,
    right: -4,
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
