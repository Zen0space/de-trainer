import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface CustomTimePickerProps {
  selectedTime: { hour: number; minute: number };
  onTimeChange: (time: { hour: number; minute: number }) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  selectedTime,
  onTimeChange,
  onConfirm,
  onClose
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb'
      }}>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: '#6b7280', fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>

        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Select Time
        </Text>

        <TouchableOpacity onPress={onConfirm}>
          <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '600' }}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Time picker */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Hours */}
        <View style={{ flex: 1 }}>
          <Text style={{
            textAlign: 'center',
            padding: 12,
            fontWeight: '600',
            color: '#6b7280',
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6'
          }}>
            Hours
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {hours.map(hour => (
              <TouchableOpacity
                key={hour}
                onPress={() => onTimeChange({ ...selectedTime, hour })}
                style={{
                  padding: 16,
                  alignItems: 'center',
                  backgroundColor: selectedTime.hour === hour ? '#3b82f6' : 'transparent'
                }}
              >
                <Text style={{
                  fontSize: 16,
                  color: selectedTime.hour === hour ? 'white' : '#374151'
                }}>
                  {hour.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Minutes */}
        <View style={{ flex: 1 }}>
          <Text style={{
            textAlign: 'center',
            padding: 12,
            fontWeight: '600',
            color: '#6b7280',
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6'
          }}>
            Minutes
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {minutes.map(minute => (
              <TouchableOpacity
                key={minute}
                onPress={() => onTimeChange({ ...selectedTime, minute })}
                style={{
                  padding: 16,
                  alignItems: 'center',
                  backgroundColor: selectedTime.minute === minute ? '#3b82f6' : 'transparent'
                }}
              >
                <Text style={{
                  fontSize: 16,
                  color: selectedTime.minute === minute ? 'white' : '#374151'
                }}>
                  {minute.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};