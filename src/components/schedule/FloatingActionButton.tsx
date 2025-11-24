import React from 'react';
import {
  TouchableOpacity,
  StyleProp,
  ViewStyle
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface FloatingActionButtonProps {
  onPress: () => void;
  bottomNavHeight?: number;
  containerPadding?: number;
  size?: number;
  backgroundColor?: string;
  iconColor?: string;
  iconName?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  bottomNavHeight = 112,
  containerPadding = 24,
  size = 56,
  backgroundColor = '#10b981',
  iconColor = 'white',
  iconName = 'plus',
  iconSize = 24,
  style
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          position: 'absolute',
          bottom: bottomNavHeight + 16,
          right: containerPadding,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        },
        style
      ]}
    >
      <Feather name={iconName} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
};