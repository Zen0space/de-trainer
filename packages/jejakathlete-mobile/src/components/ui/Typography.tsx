import React from 'react';
import { Text, TextProps } from 'react-native';

interface TypographyProps extends TextProps {
  children: React.ReactNode;
}

export function Typography({ children, style, ...props }: TypographyProps) {
  return (
    <Text style={[{ fontSize: 16, color: '#000' }, style]} {...props}>
      {children}
    </Text>
  );
}

export function Title({ children, style, ...props }: TypographyProps) {
  return (
    <Text 
      style={[
        { 
          fontSize: 24, 
          fontWeight: 'bold', 
          color: '#000',
          marginBottom: 8 
        }, 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
}

export function Subtitle({ children, style, ...props }: TypographyProps) {
  return (
    <Text 
      style={[
        { 
          fontSize: 18, 
          fontWeight: '600', 
          color: '#666',
          marginBottom: 4 
        }, 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
}

export function Caption({ children, style, ...props }: TypographyProps) {
  return (
    <Text 
      style={[
        { 
          fontSize: 14, 
          color: '#888',
          marginBottom: 2 
        }, 
        style
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
}
