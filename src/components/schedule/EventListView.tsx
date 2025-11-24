import React from 'react';
import {
  View,
  Text,
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Event, EventCard } from './EventCard';

export interface EventListViewProps {
  events: Event[];
  isLoading: boolean;
  currentMonth: Date;
  titleFontSize?: number;
  fontSize?: number;
  spacing?: number;
  cardPadding?: number;
  onEventPress?: (event: Event) => void;
}

export const EventListView: React.FC<EventListViewProps> = ({
  events,
  isLoading,
  currentMonth,
  titleFontSize = 24,
  fontSize = 16,
  spacing = 16,
  cardPadding = 20,
  onEventPress
}) => {
  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 16,
      padding: cardPadding,
      marginBottom: spacing
    }}>
      <Text style={{
        fontSize: titleFontSize,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: spacing
      }}>
        {format(currentMonth, 'MMMM yyyy')} Events
      </Text>

      {isLoading ? (
        // Loading state
        Array.from({ length: 3 }).map((_, index) => (
          <View
            key={`loading-${index}`}
            style={{
              backgroundColor: '#f3f4f6',
              borderRadius: 12,
              padding: cardPadding,
              marginBottom: spacing,
              height: 100
            }}
          />
        ))
      ) : events.length > 0 ? (
        events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            cardPadding={cardPadding}
            fontSize={fontSize}
            spacing={spacing}
            onPress={onEventPress}
          />
        ))
      ) : (
        // Empty state
        <View style={{
          alignItems: 'center',
          paddingVertical: 40
        }}>
          <Feather name="calendar" size={48} color="#d1d5db" />
          <Text style={{
            fontSize: fontSize,
            color: '#6b7280',
            marginTop: 12,
            textAlign: 'center'
          }}>
            No events scheduled for {format(currentMonth, 'MMMM')}
          </Text>
          <Text style={{
            fontSize: fontSize - 1,
            color: '#9ca3af',
            textAlign: 'center',
            marginTop: 4
          }}>
            Tap the + button to create your first event
          </Text>
        </View>
      )}
    </View>
  );
};