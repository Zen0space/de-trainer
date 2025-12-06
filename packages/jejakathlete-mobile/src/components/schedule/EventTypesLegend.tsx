import React from 'react';
import {
  View,
  Text
} from 'react-native';

export interface EventType {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface EventTypesLegendProps {
  eventTypes: EventType[];
  fontSize?: number;
  spacing?: number;
  cardPadding?: number;
  maxItems?: number;
}

export const EventTypesLegend: React.FC<EventTypesLegendProps> = ({
  eventTypes,
  fontSize = 16,
  spacing = 16,
  cardPadding = 20,
  maxItems = 6
}) => {
  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 16,
      padding: cardPadding
    }}>
      <Text style={{
        fontSize: fontSize,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: spacing
      }}>
        Event Types
      </Text>

      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing
      }}>
        {eventTypes.slice(0, maxItems).map(type => (
          <View
            key={type.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              paddingHorizontal: 8,
              paddingVertical: 6,
              borderRadius: 8
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                backgroundColor: type.color,
                borderRadius: 6,
                marginRight: 6
              }}
            />
            <Text style={{
              fontSize: fontSize - 2,
              color: '#374151'
            }}>
              {type.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};