import React from 'react';
import {
  Pressable,
  Text,
  View,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';

export interface Event {
  id: number;
  title: string;
  description: string;
  event_type_name: string;
  event_type_color: string;
  event_type_icon: string;
  start_date: string;
  end_date: string;
  location: string;
  status: string;
  total_participants: number;
  confirmed_participants: number;
  created_by_name: string;
}

export interface EventCardProps {
  event: Event;
  cardPadding?: number;
  fontSize?: number;
  spacing?: number;
  onPress?: (event: Event) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  cardPadding = 20,
  fontSize = 16,
  spacing = 16,
  onPress
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(event);
    } else {
      // Default behavior - show alert
      Alert.alert('Event Details', event.title);
    }
  };

  return (
    <Pressable
      style={{
        backgroundColor: 'white',
        padding: cardPadding,
        borderRadius: 12,
        marginBottom: spacing,
        borderLeftWidth: 4,
        borderLeftColor: event.event_type_color
      }}
      onPress={handlePress}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: fontSize,
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: 4
          }}>
            {event.title}
          </Text>

          <Text style={{
            fontSize: fontSize - 2,
            color: '#6b7280',
            marginBottom: 4
          }}>
            {format(new Date(event.start_date), 'MMM d, yyyy • h:mm a')}
          </Text>

          {event.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Feather name="map-pin" size={12} color="#9ca3af" style={{ marginRight: 4 }} />
              <Text style={{
                fontSize: fontSize - 2,
                color: '#9ca3af'
              }}>
                {event.location}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              backgroundColor: event.event_type_color + '20',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              marginRight: 8
            }}>
              <Text style={{
                fontSize: fontSize - 3,
                color: event.event_type_color,
                fontWeight: '600'
              }}>
                {event.event_type_name}
              </Text>
            </View>

            <Text style={{
              fontSize: fontSize - 3,
              color: '#9ca3af'
            }}>
              {event.confirmed_participants}/{event.total_participants} athletes
            </Text>
          </View>
        </View>

        <View style={{
          width: 24,
          height: 24,
          backgroundColor: event.status === 'upcoming' ? '#10b981' :
                        event.status === 'ongoing' ? '#f59e0b' : '#6b7280',
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Feather name="calendar" size={12} color="white" />
        </View>
      </View>
    </Pressable>
  );
};