import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { trpc } from '../../lib/trpc';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';

interface Athlete {
  athlete_id: string;
  athlete_name: string;
  athlete_email: string;
  sport: string;
  level: string;
}

interface WorkoutAssignmentModalProps {
  visible: boolean;
  workoutTemplateId: number;
  workoutTemplateName: string;
  trainerId: string;
  onClose: () => void;
  onAssignSuccess: () => void;
}

export function WorkoutAssignmentModal({
  visible,
  workoutTemplateId,
  workoutTemplateName,
  trainerId,
  onClose,
  onAssignSuccess
}: WorkoutAssignmentModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : 16;
  
  // State
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Load enrolled athletes on mount
  useEffect(() => {
    if (visible) {
      loadEnrolledAthletes();
    } else {
      // Reset state when modal closes
      setSelectedAthleteIds([]);
      setScheduledDate(new Date());
    }
  }, [visible, trainerId]);
  
  const loadEnrolledAthletes = async () => {
    setIsLoading(true);
    try {
      // Get only approved enrollments via tRPC
      const enrollments = await trpc.enrollments.listMyAthletes.query();
      
      const athletesList = enrollments.map((enrollment: any) => ({
        athlete_id: enrollment.athlete.id,
        athlete_name: enrollment.athlete.full_name || 'Unknown',
        athlete_email: enrollment.athlete.email || '',
        sport: enrollment.athlete.athlete_data?.sport || '',
        level: enrollment.athlete.athlete_data?.level || ''
      }));
      
      setAthletes(athletesList);
    } catch (error: any) {
      console.error('Error loading enrolled athletes:', error);
      showError(error.message || 'Failed to load athletes');
      Alert.alert('Error', 'Failed to load athletes');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleToggleAthlete = (athleteId: string) => {
    setSelectedAthleteIds((prev) => {
      if (prev.includes(athleteId)) {
        return prev.filter((id) => id !== athleteId);
      } else {
        return [...prev, athleteId];
      }
    });
  };
  
  const handleSelectAll = () => {
    if (selectedAthleteIds.length === athletes.length) {
      // Deselect all
      setSelectedAthleteIds([]);
    } else {
      // Select all
      setSelectedAthleteIds(athletes.map((a) => a.athlete_id));
    }
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setScheduledDate(selectedDate);
    }
  };
  
  const validateAndAssign = async () => {
    // Validate at least one athlete selected
    if (selectedAthleteIds.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one athlete');
      return;
    }
    
    // Validate scheduled date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(scheduledDate);
    selected.setHours(0, 0, 0, 0);
    
    if (selected < today) {
      Alert.alert('Validation Error', 'Scheduled date cannot be in the past');
      return;
    }
    
    setIsAssigning(true);
    try {
      // Assign workout to each selected athlete
      const assignmentPromises = selectedAthleteIds.map((athleteId) =>
        trpc.workouts.assignWorkout.mutate({
          template_id: workoutTemplateId,
          athlete_id: athleteId,
          scheduled_date: scheduledDate.toISOString().split('T')[0]
        })
      );
      
      await Promise.all(assignmentPromises);
      
      const successMessage = `Workout assigned to ${selectedAthleteIds.length} athlete${selectedAthleteIds.length !== 1 ? 's' : ''} successfully`;
      showSuccess(successMessage);
      Alert.alert(
        'Success',
        successMessage,
        [
          {
            text: 'OK',
            onPress: () => {
              onAssignSuccess();
              onClose();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error assigning workout:', error);
      const errorMessage = error.message || 'Failed to assign workout';
      showError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };
  
  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
        {/* Header */}
        <View style={{
          backgroundColor: 'white',
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: spacing
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <Text style={{
              fontSize: isSmallScreen ? 20 : 24,
              fontWeight: 'bold',
              color: '#1f2937',
              flex: 1
            }}>
              Assign Workout
            </Text>
            
            <Pressable
              onPress={onClose}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: '#f3f3f3'
              }}
            >
              <Feather name="x" size={20} color="#1f2937" />
            </Pressable>
          </View>
          
          {/* Workout Name */}
          <View style={{
            backgroundColor: '#f9fafb',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#e5e7eb'
          }}>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280',
              marginBottom: 4
            }}>
              Workout
            </Text>
            <Text style={{
              fontSize: fontSize,
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {workoutTemplateName}
            </Text>
          </View>
        </View>
        
        {isLoading ? (
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={{
              marginTop: 12,
              fontSize: fontSize,
              color: '#6b7280'
            }}>
              Loading athletes...
            </Text>
          </View>
        ) : athletes.length === 0 ? (
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing
          }}>
            <Feather name="users" size={48} color="#9ca3af" />
            <Text style={{
              marginTop: 16,
              fontSize: fontSize + 2,
              fontWeight: '600',
              color: '#1f2937',
              textAlign: 'center'
            }}>
              No enrolled athletes
            </Text>
            <Text style={{
              marginTop: 8,
              fontSize: fontSize,
              color: '#6b7280',
              textAlign: 'center'
            }}>
              You need athletes enrolled with approved status to assign workouts
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: spacing,
              paddingBottom: 120
            }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{
              maxWidth: isTablet ? 800 : 600,
              alignSelf: 'center',
              width: '100%'
            }}>
              {/* Date Picker Section */}
              <View style={{
                backgroundColor: 'white',
                padding: 16,
                borderRadius: 16,
                marginBottom: spacing
              }}>
                <Text style={{
                  fontSize: fontSize,
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: 12
                }}>
                  Scheduled Date
                </Text>
                
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f9fafb',
                    padding: 14,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#e5e7eb'
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="calendar" size={18} color="#3b82f6" />
                    <Text style={{
                      marginLeft: 10,
                      fontSize: fontSize,
                      color: '#1f2937',
                      fontWeight: '500'
                    }}>
                      {formatDate(scheduledDate)}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#6b7280" />
                </Pressable>
                
                {(showDatePicker || Platform.OS === 'ios') && (
                  <View style={{ marginTop: 12 }}>
                    <DateTimePicker
                      value={scheduledDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  </View>
                )}
              </View>
              
              {/* Athletes Selection Section */}
              <View style={{
                backgroundColor: 'white',
                padding: 16,
                borderRadius: 16
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16
                }}>
                  <Text style={{
                    fontSize: fontSize,
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Select Athletes ({selectedAthleteIds.length}/{athletes.length})
                  </Text>
                  
                  <Pressable
                    onPress={handleSelectAll}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: '#f9fafb',
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#e5e7eb'
                    }}
                  >
                    <Text style={{
                      fontSize: fontSize - 2,
                      color: '#3b82f6',
                      fontWeight: '600'
                    }}>
                      {selectedAthleteIds.length === athletes.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </Pressable>
                </View>
                
                {/* Athletes List */}
                <View>
                  {athletes.map((athlete, index) => {
                    const isSelected = selectedAthleteIds.includes(athlete.athlete_id);
                    
                    return (
                      <Pressable
                        key={athlete.athlete_id}
                        onPress={() => handleToggleAthlete(athlete.athlete_id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 12,
                          backgroundColor: isSelected ? '#eff6ff' : '#f9fafb',
                          borderRadius: 8,
                          marginBottom: index < athletes.length - 1 ? 12 : 0,
                          borderWidth: 1,
                          borderColor: isSelected ? '#3b82f6' : '#e5e7eb'
                        }}
                      >
                        {/* Checkbox */}
                        <View style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: isSelected ? '#3b82f6' : '#d1d5db',
                          backgroundColor: isSelected ? '#3b82f6' : 'white',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          {isSelected && (
                            <Feather name="check" size={14} color="white" />
                          )}
                        </View>
                        
                        {/* Athlete Info */}
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: fontSize,
                            fontWeight: '600',
                            color: '#1f2937',
                            marginBottom: 4
                          }}>
                            {athlete.athlete_name}
                          </Text>
                          
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 8
                          }}>
                            {athlete.sport && (
                              <View style={{
                                backgroundColor: isSelected ? '#dbeafe' : '#e5e7eb',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 4
                              }}>
                                <Text style={{
                                  fontSize: fontSize - 3,
                                  color: isSelected ? '#3b82f6' : '#6b7280',
                                  fontWeight: '600'
                                }}>
                                  {athlete.sport}
                                </Text>
                              </View>
                            )}
                            
                            {athlete.level && (
                              <View style={{
                                backgroundColor: isSelected ? '#dbeafe' : '#e5e7eb',
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 4
                              }}>
                                <Text style={{
                                  fontSize: fontSize - 3,
                                  color: isSelected ? '#3b82f6' : '#6b7280',
                                  fontWeight: '600'
                                }}>
                                  {athlete.level}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>
        )}
        
        {/* Bottom Action Bar */}
        {!isLoading && athletes.length > 0 && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            padding: spacing,
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingBottom: Math.max(insets.bottom, spacing)
          }}>
            <View style={{
              maxWidth: isTablet ? 800 : 600,
              alignSelf: 'center',
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12
            }}>
              <Pressable
                onPress={validateAndAssign}
                disabled={isAssigning || selectedAthleteIds.length === 0}
                style={{
                  flex: 1,
                  backgroundColor: (isAssigning || selectedAthleteIds.length === 0) ? '#9ca3af' : '#3b82f6',
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
                  {isAssigning ? 'Assigning...' : `Assign to ${selectedAthleteIds.length} Athlete${selectedAthleteIds.length !== 1 ? 's' : ''}`}
                </Text>
              </Pressable>
              
              <Pressable
                onPress={onClose}
                disabled={isAssigning}
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
        )}
      </View>
    </Modal>
  );
}
