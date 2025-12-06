import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { cn } from '../../lib/utils';

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  placeholder: string;
  value: string;
  onSelect: (value: string) => void;
  options: DropdownOption[];
  error?: string;
}

export function Dropdown({ 
  placeholder, 
  value, 
  onSelect, 
  options, 
  error 
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Responsive design calculations
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  
  const selectedOption = options.find(option => option.value === value);
  
  const handleSelect = (optionValue: string) => {
    onSelect(optionValue);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <View className={cn("relative", isOpen && "z-50")}>
      <Pressable
        onPress={toggleDropdown}
        className={cn(
          "bg-white border-gray-200 border rounded-lg px-3.5 py-3.5 min-h-11 flex-row justify-between items-center",
          error ? "border-red-500" : "border-gray-200"
        )}
      >
        <Text className={cn(
          "text-base",
          selectedOption ? "text-gray-800" : "text-gray-400"
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
          <Feather 
            name="chevron-down" 
            size={20} 
            color="#6b7280"
          />
        </View>
      </Pressable>
      
      {isOpen && (
        <View 
          className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 z-50"
          style={{
            maxHeight: 200,
            elevation: 5, // Android shadow
            shadowColor: '#000', // iOS shadow
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <ScrollView 
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            alwaysBounceVertical={false}
            decelerationRate="normal"
            style={{ maxHeight: 200 }}
            contentContainerStyle={{ paddingVertical: 4 }}
          >
            {options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option.value)}
                className={cn(
                  "px-3.5 py-3 border-b border-gray-100",
                  value === option.value ? "bg-green-50" : "bg-transparent"
                )}
              >
                <Text className={cn(
                  "text-base",
                  value === option.value ? "text-primary font-semibold" : "text-gray-800"
                )}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      
      {error && (
        <Text className="text-red-500 text-xs mt-1 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
}
