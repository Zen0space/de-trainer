import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  TextInput
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';

interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
}

interface ExerciseConfig {
  sets: number;
  reps: number;
  rest_time: number;
}

interface ExerciseConfigModalProps {
  visible: boolean;
  exercise: Exercise;
  initialConfig?: ExerciseConfig;
  onSave: (config: ExerciseConfig) => void;
  onClose: () => void;
}

export function ExerciseConfigModal({
  visible,
  exercise,
  initialConfig,
  onSave,
  onClose
}: ExerciseConfigModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : 16;
  
  // State with defaults
  const [sets, setSets] = useState(initialConfig?.sets || 3);
  const [reps, setReps] = useState(initialConfig?.reps || 10);
  const [restTime, setRestTime] = useState(initialConfig?.rest_time || 60);
  
  // Validation errors
  const [setsError, setSetsError] = useState('');
  const [repsError, setRepsError] = useState('');
  const [restTimeError, setRestTimeError] = useState('');
  
  // Reset state when modal opens with new exercise
  useEffect(() => {
    if (visible) {
      setSets(initialConfig?.sets || 3);
      setReps(initialConfig?.reps || 10);
      setRestTime(initialConfig?.rest_time || 60);
      setSetsError('');
      setRepsError('');
      setRestTimeError('');
    }
  }, [visible, initialConfig]);
  
  const validateAndSave = () => {
    let isValid = true;
    
    // Validate sets (1-10)
    if (sets < 1 || sets > 10) {
      setSetsError('Sets must be between 1 and 10');
      isValid = false;
    } else {
      setSetsError('');
    }
    
    // Validate reps (1-100)
    if (reps < 1 || reps > 100) {
      setRepsError('Reps must be between 1 and 100');
      isValid = false;
    } else {
      setRepsError('');
    }
    
    // Validate rest time (0-300 seconds)
    if (restTime < 0 || restTime > 300) {
      setRestTimeError('Rest time must be between 0 and 300 seconds');
      isValid = false;
    } else {
      setRestTimeError('');
    }
    
    if (isValid) {
      onSave({ sets, reps, rest_time: restTime });
    }
  };
  
  const incrementValue = (
    value: number,
    setter: (val: number) => void,
    max: number,
    step: number = 1
  ) => {
    if (value < max) {
      setter(Math.min(value + step, max));
    }
  };
  
  const decrementValue = (
    value: number,
    setter: (val: number) => void,
    min: number,
    step: number = 1
  ) => {
    if (value > min) {
      setter(Math.max(value - step, min));
    }
  };
  
  const NumberPicker = ({
    label,
    value,
    onIncrement,
    onDecrement,
    onChange,
    min,
    max,
    unit,
    error
  }: {
    label: string;
    value: number;
    onIncrement: () => void;
    onDecrement: () => void;
    onChange: (val: number) => void;
    min: number;
    max: number;
    unit?: string;
    error?: string;
  }) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={{
        fontSize: fontSize,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8
      }}>
        {label}
      </Text>
      
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: error ? '#ef4444' : '#e5e7eb'
      }}>
        <Pressable
          onPress={onDecrement}
          disabled={value <= min}
          style={{
            width: 48,
            height: 48,
            backgroundColor: value <= min ? '#f3f4f6' : '#3b82f6',
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Feather
            name="minus"
            size={20}
            color={value <= min ? '#9ca3af' : 'white'}
          />
        </Pressable>
        
        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <TextInput
            value={value.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 0;
              onChange(num);
            }}
            keyboardType="numeric"
            style={{
              fontSize: isSmallScreen ? 24 : 28,
              fontWeight: 'bold',
              color: '#1f2937',
              textAlign: 'center',
              minWidth: 60
            }}
          />
          {unit && (
            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280',
              marginTop: 2
            }}>
              {unit}
            </Text>
          )}
        </View>
        
        <Pressable
          onPress={onIncrement}
          disabled={value >= max}
          style={{
            width: 48,
            height: 48,
            backgroundColor: value >= max ? '#f3f4f6' : '#3b82f6',
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Feather
            name="plus"
            size={20}
            color={value >= max ? '#9ca3af' : 'white'}
          />
        </Pressable>
      </View>
      
      {error && (
        <Text style={{
          fontSize: fontSize - 2,
          color: '#ef4444',
          marginTop: 4,
          marginLeft: 4
        }}>
          {error}
        </Text>
      )}
      
      <Text style={{
        fontSize: fontSize - 2,
        color: '#9ca3af',
        marginTop: 4,
        textAlign: 'center'
      }}>
        Range: {min} - {max}
      </Text>
    </View>
  );
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        {/* Header */}
        <View style={{
          backgroundColor: 'white',
          paddingTop: insets.top + 12,
          paddingBottom: 16,
          paddingHorizontal: spacing,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb'
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: isSmallScreen ? 20 : 24,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 4
              }}>
                Configure Exercise
              </Text>
              <Text style={{
                fontSize: fontSize,
                color: '#6b7280'
              }}>
                {exercise.name}
              </Text>
            </View>
            
            <Pressable
              onPress={onClose}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: '#f3f4f6'
              }}
            >
              <Feather name="x" size={20} color="#1f2937" />
            </Pressable>
          </View>
        </View>
        
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: spacing,
            paddingBottom: 120
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{
            maxWidth: isTablet ? 600 : 500,
            alignSelf: 'center',
            width: '100%'
          }}>
            {/* Exercise Info Card */}
            <View style={{
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#e5e7eb'
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: fontSize + 2,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: 6
                  }}>
                    {exercise.name}
                  </Text>
                  
                  <View style={{
                    backgroundColor: '#dbeafe',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 12,
                    alignSelf: 'flex-start'
                  }}>
                    <Text style={{
                      fontSize: fontSize - 3,
                      color: '#3b82f6',
                      fontWeight: '600'
                    }}>
                      {exercise.muscle_group.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Configuration Card */}
            <View style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e5e7eb'
            }}>
              <Text style={{
                fontSize: fontSize + 2,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 20
              }}>
                Exercise Parameters
              </Text>
              
              {/* Sets Picker */}
              <NumberPicker
                label="Sets"
                value={sets}
                onIncrement={() => incrementValue(sets, setSets, 10)}
                onDecrement={() => decrementValue(sets, setSets, 1)}
                onChange={setSets}
                min={1}
                max={10}
                unit="sets"
                error={setsError}
              />
              
              {/* Reps Picker */}
              <NumberPicker
                label="Reps"
                value={reps}
                onIncrement={() => incrementValue(reps, setReps, 100)}
                onDecrement={() => decrementValue(reps, setReps, 1)}
                onChange={setReps}
                min={1}
                max={100}
                unit="reps"
                error={repsError}
              />
              
              {/* Rest Time Picker */}
              <NumberPicker
                label="Rest Time"
                value={restTime}
                onIncrement={() => incrementValue(restTime, setRestTime, 300, 15)}
                onDecrement={() => decrementValue(restTime, setRestTime, 0, 15)}
                onChange={setRestTime}
                min={0}
                max={300}
                unit="seconds"
                error={restTimeError}
              />
            </View>
          </View>
        </ScrollView>
        
        {/* Bottom Action Buttons */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          padding: spacing,
          paddingBottom: Math.max(insets.bottom, spacing),
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 5
        }}>
          <View style={{
            maxWidth: isTablet ? 600 : 500,
            alignSelf: 'center',
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12
          }}>
            <Pressable
              onPress={validateAndSave}
              style={{
                flex: 1,
                backgroundColor: '#3b82f6',
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: fontSize,
                fontWeight: '600'
              }}>
                Save Exercise
              </Text>
            </Pressable>
            
            <Pressable
              onPress={onClose}
              style={{
                width: 48,
                height: 48,
                backgroundColor: '#fef2f2',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#fecaca'
              }}
            >
              <Feather name="x" size={20} color="#ef4444" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
