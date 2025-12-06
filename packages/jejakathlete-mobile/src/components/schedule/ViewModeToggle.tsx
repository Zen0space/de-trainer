import React from 'react';
import {
  View,
  Pressable,
  Text
} from 'react-native';

export type ViewMode = 'calendar' | 'list';

export interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  fontSize?: number;
  spacing?: number;
  options?: { calendar: string; list: string };
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onViewModeChange,
  fontSize = 16,
  spacing = 16,
  options = { calendar: 'Calendar', list: 'List' }
}) => {
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 4,
      marginBottom: spacing
    }}>
      <Pressable
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 8,
          backgroundColor: viewMode === 'calendar' ? '#3b82f6' : 'transparent',
          alignItems: 'center'
        }}
        onPress={() => onViewModeChange('calendar')}
      >
        <Text style={{
          fontSize: fontSize,
          fontWeight: '600',
          color: viewMode === 'calendar' ? 'white' : '#6b7280'
        }}>
          {options.calendar}
        </Text>
      </Pressable>

      <Pressable
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 8,
          backgroundColor: viewMode === 'list' ? '#3b82f6' : 'transparent',
          alignItems: 'center'
        }}
        onPress={() => onViewModeChange('list')}
      >
        <Text style={{
          fontSize: fontSize,
          fontWeight: '600',
          color: viewMode === 'list' ? 'white' : '#6b7280'
        }}>
          {options.list}
        </Text>
      </Pressable>
    </View>
  );
};