import React from 'react';
import { Pressable, Text, useWindowDimensions } from 'react-native';
import { cn } from '../../lib/utils';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

function Button({ 
  title, 
  onPress, 
  disabled = false, 
  variant = 'primary',
  size = 'medium' 
}: ButtonProps) {
  // Responsive design calculations
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  
  // Base classes for all buttons
  const baseClasses = "items-center justify-center rounded-lg min-h-11";
  
  // Size-specific classes
  const sizeClasses = {
    small: cn(
      "px-3 py-2",
      isSmallScreen ? "text-sm" : "text-sm"
    ),
    medium: cn(
      "px-4 py-3",
      isSmallScreen ? "text-sm" : "text-base"
    ),
    large: cn(
      "px-6 py-4",
      isSmallScreen ? "text-base" : "text-lg"
    )
  };
  
  // Variant-specific classes
  const variantClasses = {
    primary: disabled 
      ? "bg-gray-300 opacity-60" 
      : "bg-blue-600 active:bg-blue-700",
    secondary: disabled 
      ? "bg-gray-100 border border-gray-300 opacity-60" 
      : "bg-white border border-gray-300 active:bg-gray-50",
    outline: disabled 
      ? "border-2 border-gray-300 opacity-60" 
      : "border-2 border-blue-600 bg-transparent active:bg-blue-50"
  };
  
  // Text color classes
  const textClasses = {
    primary: "text-white font-semibold",
    secondary: disabled ? "text-gray-400" : "text-gray-700 font-semibold",
    outline: disabled ? "text-gray-400" : "text-blue-600 font-semibold"
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant]
      )}
    >
      <Text className={cn(textClasses[variant])}>
        {title}
      </Text>
    </Pressable>
  );
}

export { Button };