import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { cn } from '../../lib/utils';

interface Tab {
  key: string;
  title: string;
}

interface TabViewProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

export function TabView({ tabs, activeTab, onTabChange }: TabViewProps) {
  return (
    <View className="bg-gray-100 rounded-lg p-1 flex-row">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            className={cn(
              "flex-1 py-3 px-3 rounded-md items-center min-h-11",
              isActive ? "bg-white" : "bg-transparent"
            )}
          >
            <Text className={cn(
              "text-sm",
              isActive ? "font-semibold text-primary" : "font-normal text-secondary"
            )}>
              {tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
