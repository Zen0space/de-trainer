import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import { 
  getWorkoutTemplateById, 
  updateWorkoutAssignmentStatus
} from '../../lib/offline-api';
import { localDbHelpers } from '../../lib/local-database';
import { useToast } from '../../contexts/ToastContext';

interface WorkoutExercise {
  id: number;
  workout_template_id: number;
  exercise_id: number;
  order_index: number;
  sets: number;
  reps: number;
  rest_time: number;
  exercise_name: string;
  muscle_group: string;
}

interface WorkoutTemplate {
  id: number;
  trainer_id: number;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
}

interface WorkoutAssignment {
  id: number;
  workout_template_id: number;
  athlete_id: number;
  trainer_id: number;
  scheduled_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  started_at?: string;
  completed_at?: string;
}

interface WorkoutDetailScreenProps {
  workoutAssignmentId: number;
  onBack: () => void;
  onStartWorkout: (assignmentId: number) => void;
}

export function WorkoutDetailScreen({ 
  workoutAssignmentId, 
  onBack, 
  onStartWorkout 
}: WorkoutDetailScreenProps) {
  const { user } = useSession();
  const { showSuccess, showError } = useToast();
  const { width } = useWindowDimensions();
  
  // State
  const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);
  const [workout, setWorkout] = useState<WorkoutTemplate | null>(null);
  const [trainerName, setTrainerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSkipping, setIsSkipping] = useState(false);
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const cardPadding = isSmallScreen ? 16 : isTablet ? 24 : 20;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;
  
  // Bottom navigation height for content padding
  const bottomNavHeight = (isSmallScreen ? 70 : isTablet ? 90 : 80) + 32;

  // Fetch workout details
  const fetchWorkoutDetails = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);

    try {
      // Get assignment details
      const assignmentData = await localDbHelpers.get(`
        SELECT 
          wa.*,
          u.full_name as trainer_name
        FROM workout_assignments wa
        JOIN users u ON wa.trainer_id = u.id
        WHERE wa.id = ? AND wa.athlete_id = ?
      `, [workoutAssignmentId, user.id]);

      if (!assignmentData) {
        Alert.alert('Error', 'Workout not found');
        onBack();
        return;
      }

      setAssignment(assignmentData);
      setTrainerName(assignmentData.trainer_name);

      // Get workout template with exercises
      const workoutData = await getWorkoutTemplateById(assignmentData.workout_template_id);

      if (!workoutData) {
        Alert.alert('Error', 'Workout template not found');
        onBack();
        return;
      }

      setWorkout(workoutData);
    } catch (error) {
      console.error('❌ Error fetching workout details:', error);
      Alert.alert('Error', 'Failed to load workout details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutDetails();
  }, [workoutAssignmentId, user?.id]);

  // Handle skip workout
  const handleSkipWorkout = () => {
    Alert.alert(
      'Skip Workout',
      'Are you sure you want to skip this workout? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            setIsSkipping(true);
            try {
              const result = await updateWorkoutAssignmentStatus(
                workoutAssignmentId,
                'skipped',
                user?.id
              );

              if (result.success) {
                showSuccess('Workout marked as skipped');
                Alert.alert('Success', 'Workout marked as skipped', [
                  { text: 'OK', onPress: onBack }
                ]);
              } else {
                showError(result.message);
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              console.error('❌ Error skipping workout:', error);
              showError('Failed to skip workout');
              Alert.alert('Error', 'Failed to skip workout');
            } finally {
              setIsSkipping(false);
            }
          }
        }
      ]
    );
  };

  // Handle start workout
  const handleStartWorkout = () => {
    if (assignment) {
      onStartWorkout(assignment.id);
    }
  };

  // Format rest time
  const formatRestTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Render exercise card
  const renderExerciseCard = (exercise: WorkoutExercise, index: number) => {
    return (
      <View
        key={exercise.id}
        style={{
          backgroundColor: 'white',
          padding: cardPadding,
          borderRadius: 12,
          marginBottom: spacing,
          borderWidth: 1,
          borderColor: '#f3f4f6'
        }}
      >
        {/* Exercise Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          marginBottom: 12
        }}>
          <View style={{
            width: 32,
            height: 32,
            backgroundColor: '#3b82f6',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <Text style={{
              fontSize: fontSize,
              fontWeight: 'bold',
              color: 'white'
            }}>
              {index + 1}
            </Text>
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 2
            }}>
              {exercise.exercise_name}
            </Text>
            <View style={{
              backgroundColor: '#f0fdf4',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
              alignSelf: 'flex-start'
            }}>
              <Text style={{
                fontSize: fontSize - 2,
                fontWeight: '600',
                color: '#10b981',
                textTransform: 'capitalize'
              }}>
                {exercise.muscle_group}
              </Text>
            </View>
          </View>
        </View>

        {/* Exercise Details */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <View style={{
            flex: 1,
            minWidth: 80,
            backgroundColor: '#f3f4f6',
            padding: 12,
            borderRadius: 8
          }}>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280',
              marginBottom: 4
            }}>
              Sets
            </Text>
            <Text style={{
              fontSize: fontSize + 4,
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              {exercise.sets}
            </Text>
          </View>
          
          <View style={{
            flex: 1,
            minWidth: 80,
            backgroundColor: '#f3f4f6',
            padding: 12,
            borderRadius: 8
          }}>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280',
              marginBottom: 4
            }}>
              Reps
            </Text>
            <Text style={{
              fontSize: fontSize + 4,
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              {exercise.reps}
            </Text>
          </View>
          
          <View style={{
            flex: 1,
            minWidth: 80,
            backgroundColor: '#f3f4f6',
            padding: 12,
            borderRadius: 8
          }}>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280',
              marginBottom: 4
            }}>
              Rest
            </Text>
            <Text style={{
              fontSize: fontSize + 4,
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              {formatRestTime(exercise.rest_time)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: '#f3f3f3',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Feather name="loader" size={32} color="#6b7280" />
        <Text style={{
          fontSize: fontSize,
          color: '#6b7280',
          marginTop: 12
        }}>
          Loading workout...
        </Text>
      </View>
    );
  }

  if (!assignment || !workout) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: '#f3f3f3',
        alignItems: 'center',
        justifyContent: 'center',
        padding: containerPadding
      }}>
        <Feather name="alert-circle" size={48} color="#ef4444" />
        <Text style={{
          fontSize: fontSize + 4,
          fontWeight: 'bold',
          color: '#1f2937',
          marginTop: 16,
          marginBottom: 8
        }}>
          Workout Not Found
        </Text>
        <Text style={{
          fontSize: fontSize,
          color: '#6b7280',
          textAlign: 'center',
          marginBottom: 24
        }}>
          This workout could not be loaded
        </Text>
        <Pressable
          onPress={onBack}
          style={{
            backgroundColor: '#3b82f6',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8
          }}
        >
          <Text style={{
            fontSize: fontSize,
            fontWeight: '600',
            color: 'white'
          }}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const canStartWorkout = assignment.status === 'pending' || assignment.status === 'in_progress';
  const isCompleted = assignment.status === 'completed';
  const isSkipped = assignment.status === 'skipped';

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: containerPadding,
          paddingBottom: containerPadding + bottomNavHeight
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: isTablet ? 800 : 600, alignSelf: 'center', width: '100%' }}>
          
          {/* Header with Back Button */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing
          }}>
            <Pressable
              onPress={onBack}
              style={{
                width: 40,
                height: 40,
                backgroundColor: 'white',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}
            >
              <Feather name="arrow-left" size={20} color="#1f2937" />
            </Pressable>
            
            <Text style={{
              fontSize: titleFontSize,
              fontWeight: 'bold',
              color: '#1f2937',
              flex: 1
            }}>
              Workout Details
            </Text>
          </View>

          {/* Workout Info Card */}
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 16,
            marginBottom: spacing
          }}>
            <Text style={{
              fontSize: titleFontSize - 4,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 8
            }}>
              {workout.name}
            </Text>
            
            {workout.description && (
              <Text style={{
                fontSize: fontSize,
                color: '#6b7280',
                lineHeight: 24,
                marginBottom: 16
              }}>
                {workout.description}
              </Text>
            )}

            <View style={{
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#f3f4f6'
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8
              }}>
                <Feather name="user" size={16} color="#6b7280" />
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#6b7280',
                  marginLeft: 8
                }}>
                  Trainer: <Text style={{ fontWeight: '600', color: '#1f2937' }}>{trainerName}</Text>
                </Text>
              </View>
              
              <View style={{
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Feather name="calendar" size={16} color="#6b7280" />
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#6b7280',
                  marginLeft: 8
                }}>
                  Scheduled: <Text style={{ fontWeight: '600', color: '#1f2937' }}>{formatDate(assignment.scheduled_date)}</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Status Banner */}
          {(isCompleted || isSkipped) && (
            <View style={{
              backgroundColor: isCompleted ? '#d1fae5' : '#fee2e2',
              padding: 16,
              borderRadius: 12,
              marginBottom: spacing,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Feather 
                name={isCompleted ? 'check-circle' : 'x-circle'} 
                size={24} 
                color={isCompleted ? '#10b981' : '#ef4444'} 
              />
              <Text style={{
                fontSize: fontSize,
                fontWeight: '600',
                color: isCompleted ? '#10b981' : '#ef4444',
                marginLeft: 12
              }}>
                {isCompleted ? 'Workout Completed!' : 'Workout Skipped'}
              </Text>
            </View>
          )}

          {/* Exercises Section */}
          <View style={{ marginBottom: spacing }}>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: spacing
            }}>
              Exercises ({workout.exercises.length})
            </Text>
            
            {workout.exercises.map((exercise, index) => 
              renderExerciseCard(exercise, index)
            )}
          </View>

          {/* Action Buttons */}
          {canStartWorkout && (
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={handleStartWorkout}
                style={{
                  backgroundColor: '#3b82f6',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center'
                }}
              >
                <Feather name="play-circle" size={20} color="white" />
                <Text style={{
                  fontSize: fontSize + 2,
                  fontWeight: 'bold',
                  color: 'white',
                  marginLeft: 8
                }}>
                  {assignment.status === 'in_progress' ? 'Continue Workout' : 'Start Workout'}
                </Text>
              </Pressable>
              
              {assignment.status === 'pending' && (
                <Pressable
                  onPress={handleSkipWorkout}
                  disabled={isSkipping}
                  style={{
                    backgroundColor: 'white',
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#ef4444',
                    opacity: isSkipping ? 0.6 : 1
                  }}
                >
                  <Text style={{
                    fontSize: fontSize,
                    fontWeight: '600',
                    color: '#ef4444'
                  }}>
                    {isSkipping ? 'Skipping...' : 'Skip Workout'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
