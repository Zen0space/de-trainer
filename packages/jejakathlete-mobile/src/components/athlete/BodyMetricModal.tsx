import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { calculateBMI, getBMICategory } from '../../lib/body-metrics-api';

interface BodyMetric {
  id: number;
  athlete_id: string;
  measurement_date: string;
  weight: number | null;
  height: number | null;
  muscle_mass: number | null;
  body_fat_percentage: number | null;
  bmi: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface BodyMetricModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    measurement_date: string;
    weight?: number;
    height?: number;
    muscle_mass?: number;
    body_fat_percentage?: number;
    notes?: string;
  }) => Promise<void>;
  existingMetric?: BodyMetric;
  athleteName: string;
}

export function BodyMetricModal({
  visible,
  onClose,
  onSave,
  existingMetric,
  athleteName
}: BodyMetricModalProps) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const fontSize = isSmallScreen ? 14 : 16;

  const [measurementDate, setMeasurementDate] = useState(new Date());
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [calculatedBMI, setCalculatedBMI] = useState<number | null>(null);

  useEffect(() => {
    if (existingMetric) {
      setMeasurementDate(new Date(existingMetric.measurement_date));
      setWeight(existingMetric.weight?.toString() || '');
      setHeight(existingMetric.height?.toString() || '');
      setMuscleMass(existingMetric.muscle_mass?.toString() || '');
      setBodyFat(existingMetric.body_fat_percentage?.toString() || '');
      setNotes(existingMetric.notes || '');
    } else {
      // Reset for new entry
      setMeasurementDate(new Date());
      setWeight('');
      setHeight('');
      setMuscleMass('');
      setBodyFat('');
      setNotes('');
    }
  }, [existingMetric, visible]);

  // Calculate BMI when weight or height changes
  useEffect(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (w && h) {
      setCalculatedBMI(calculateBMI(w, h));
    } else {
      setCalculatedBMI(null);
    }
  }, [weight, height]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        measurement_date: measurementDate.toISOString().split('T')[0],
        weight: weight ? parseFloat(weight) : undefined,
        height: height ? parseFloat(height) : undefined,
        muscle_mass: muscleMass ? parseFloat(muscleMass) : undefined,
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : undefined,
        notes: notes || undefined
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setMeasurementDate(selectedDate);
    }
  };

  const bmiInfo = calculatedBMI ? getBMICategory(calculatedBMI) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 16,
          width: '100%',
          maxWidth: 500,
          maxHeight: '85%'
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6'
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: fontSize + 2,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 2
              }}>
                {existingMetric ? 'Edit' : 'Add'} Body Metrics
              </Text>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#6b7280'
              }}>
                {athleteName}
              </Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 8 }}>
              <Feather name="x" size={24} color="#6b7280" />
            </Pressable>
          </View>

          {/* Content */}
          <KeyboardAwareScrollView
            style={{ maxHeight: 450 }}
            contentContainerStyle={{ padding: 16 }}
            bottomOffset={80}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
              {/* Measurement Date */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{
                  fontSize: fontSize - 1,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Measurement Date *
                </Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#d1d5db'
                  }}
                >
                  <Feather name="calendar" size={20} color="#6b7280" />
                  <Text style={{
                    fontSize: fontSize,
                    color: '#1f2937',
                    marginLeft: 8,
                    flex: 1
                  }}>
                    {measurementDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </Pressable>

                {showDatePicker && (
                  <DateTimePicker
                    value={measurementDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>

              {/* Weight */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{
                  fontSize: fontSize - 1,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Weight (kg)
                </Text>
                <Input
                  placeholder="e.g., 70.5"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
              </View>

              {/* Height */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{
                  fontSize: fontSize - 1,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Height (cm)
                </Text>
                <Input
                  placeholder="e.g., 175"
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
              </View>

              {/* BMI Display */}
              {calculatedBMI && bmiInfo && (
                <View style={{
                  backgroundColor: bmiInfo.bgColor,
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: bmiInfo.color + '40'
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{
                      fontSize: fontSize - 1,
                      color: '#6b7280'
                    }}>
                      Calculated BMI
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{
                        fontSize: fontSize + 2,
                        fontWeight: 'bold',
                        color: bmiInfo.color,
                        marginRight: 8
                      }}>
                        {calculatedBMI.toFixed(1)}
                      </Text>
                      <View style={{
                        backgroundColor: bmiInfo.color + '20',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12
                      }}>
                        <Text style={{
                          fontSize: fontSize - 3,
                          fontWeight: '600',
                          color: bmiInfo.color
                        }}>
                          {bmiInfo.category.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Muscle Mass */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{
                  fontSize: fontSize - 1,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Muscle Mass (kg)
                </Text>
                <Input
                  placeholder="e.g., 35.2"
                  value={muscleMass}
                  onChangeText={setMuscleMass}
                  keyboardType="numeric"
                />
              </View>

              {/* Body Fat % */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{
                  fontSize: fontSize - 1,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Body Fat (%)
                </Text>
                <Input
                  placeholder="e.g., 15.5"
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  keyboardType="numeric"
                />
              </View>

              {/* Notes */}
              <View>
                <Text style={{
                  fontSize: fontSize - 1,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Notes (Optional)
                </Text>
                <Input
                  placeholder="Add any notes about this measurement..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
          </KeyboardAwareScrollView>

          {/* Footer */}
          <View style={{
            flexDirection: 'row',
            gap: 12,
            padding: 16,
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6'
          }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                onPress={onClose}
                variant="outline"
                disabled={isSaving}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={isSaving ? 'Saving...' : 'Save'}
                onPress={handleSave}
                variant="primary"
                disabled={isSaving || !measurementDate}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
