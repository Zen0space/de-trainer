import React, { useState } from 'react';
import { TextInput, View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { cn } from '../../lib/utils';

interface InputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
  showPasswordToggle?: boolean;
}

export function Input({ 
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  showPasswordToggle = false
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const shouldShowPasswordToggle = showPasswordToggle && secureTextEntry;
  const actualSecureTextEntry = secureTextEntry && !isPasswordVisible;

  return (
    <View>
      <View style={{ position: 'relative' }}>
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={actualSecureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          style={{
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: error ? '#ef4444' : '#e5e7eb',
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 14,
            fontSize: 16,
            color: '#1f2937',
            minHeight: 44,
            paddingRight: shouldShowPasswordToggle ? 50 : 14,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          placeholderTextColor="#9ca3af"
        />
        {shouldShowPasswordToggle && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              padding: 4,
            }}
          >
            <Feather 
              name={isPasswordVisible ? "eye-off" : "eye"} 
              size={20} 
              color="#6b7280" 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
