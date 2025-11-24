import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import { 
  getWorkoutTemplateById,
  getSessionProgress,
  createSessionProgress,
  completeWorkoutSession,
  updateWorkoutAssignmentStatus
} from '../../lib/api';
import { tursoDbHelpers } from '../../lib/turso-database';
import { RestTimer } from '../../components/workout/RestTimer';
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

interface SessionProgress {
  workout_exercise_id: number;
  set_number: number;
  completed: boolean;
}

interface WorkoutExecutionScreenProps {
  workoutAssignmentId: number;
  onBack: () => void;
  onComplete: () => void;
}

export function WorkoutExecutionScreen({ 
  workoutAssignmentId, 
  onBack, 
  onComplete 
}: WorkoutExecutionScreenProps) {
  const { user } = useSession();
  const { showSuccess, showError } = useToast();
  const { width } = useWindowDimensions();
  
  // State
  const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);
  const [workout, setWorkout] = useState<WorkoutTemplate | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [progress, setProgress] = useState<Map<string, boolean>>(new Map());
  const [isResting, setIsResting] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSetCompleteAnimation, setShowSetCompleteAnimation] = useState(false);
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const fontSize = isSmallScreen ? 14 : 16;
  
  // Get current exercise
  const currentExercise = exercises[currentExerciseIndex];
  
  // Calculate progress percentage
  const calculateProgress = () => {
    if (exercises.length === 0) return 0;
    
    let totalSets = 0;
    let completedSets = 0;
    
    exercises.forEach(exercise => {
      totalSets += exercise.sets;
      for (let i = 1; i <= exercise.sets; i++) {
        const key = `${exercise.id}-${i}`;
        if (progress.get(key)) {
          completedSets++;
        }
      }
    });
    
    return totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  };
  
  // Check if all sets are complete
  const isWorkoutComplete = () => {
    if (exercises.length === 0) return false;
    
    for (const exercise of exercises) {
      for (let i = 1; i <= exercise.sets; i++) {
        const key = `${exercise.id}-${i}`;
        if (!progress.get(key)) {
          return false;
        }
      }
    }
    
    return true;
  };
  
  // Fetch workout data and progress
  const fetchWorkoutData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);

    try {
      // Get assignment
      const assignmentData = await tursoDbHelpers.get(`
        SELECT * FROM workout_assignments
        WHERE id = ? AND athlete_id = ?
      `, [workoutAssignmentId, user.id]);

      if (!assignmentData) {
        Alert.alert('Error', 'Workout not found');
        onBack();
        return;
      }

      setAssignment(assignmentData);

      // Get workout template with exercises
      const workoutData = await getWorkoutTemplateById(assignmentData.workout_template_id);

      if (!workoutData || !workoutData.exercises) {
        Alert.alert('Error', 'Workout template not found');
        onBack();
        return;
      }

      setWorkout(workoutData);
      setExercises(workoutData.exercises);

      // Get existing progress
      const progressData = await getSessionProgress(workoutAssignmentId, user.id);
      
      const progressMap = new Map<string, boolean>();
      progressData.forEach((p: any) => {
        const key = `${p.workout_exercise_id}-${p.set_number}`;
        progressMap.set(key, p.completed);
      });
      
      setProgress(progressMap);
      
      // Find current exercise and set based on progress
      let foundIncomplete = false;
      for (let i = 0; i < workoutData.exercises.length; i++) {
        const exercise = workoutData.exercises[i];
        for (let setNum = 1; setNum <= exercise.sets; setNum++) {
          const key = `${exercise.id}-${setNum}`;
          if (!progressMap.get(key)) {
            setCurrentExerciseIndex(i);
            setCurrentSet(setNum);
            foundIncomplete = true;
            break;
          }
        }
        if (foundIncomplete) break;
      }
      
    } catch (error) {
      console.error('❌ Error fetching workout data:', error);
      Alert.alert('Error', 'Failed to load workout');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutData();
  }, [workoutAssignmentId, user?.id]);

  // Handle complete set
  const handleCompleteSet = async () => {
    if (!currentExercise || !user?.id) return;
    
    try {
      // Save progress
      const result = await createSessionProgress({
        workout_assignment_id: workoutAssignmentId,
        workout_exercise_id: currentExercise.id,
        set_number: currentSet,
        completed: true,
        athlete_id: user.id
      });

      if (!result.success) {
        Alert.alert('Error', result.message);
        return;
      }

      // Update local progress state
      const key = `${currentExercise.id}-${currentSet}`;
      const newProgress = new Map(progress);
      newProgress.set(key, true);
      setProgress(newProgress);

      // Show visual feedback
      setShowSetCompleteAnimation(true);
      showSuccess(`Set ${currentSet} completed! 💪`);
      setTimeout(() => setShowSetCompleteAnimation(false), 1000);

      // Check if this was the last set of the exercise
      if (currentSet >= currentExercise.sets) {
        // Move to next exercise
        if (currentExerciseIndex < exercises.length - 1) {
          showSuccess(`${currentExercise.exercise_name} completed! Moving to next exercise.`);
          setTimeout(() => {
            setCurrentExerciseIndex(currentExerciseIndex + 1);
            setCurrentSet(1);
          }, 1000);
        } else {
          // Workout complete
          setCurrentSet(currentSet + 1); // Move past last set
        }
      } else {
        // Start rest timer for next set
        setTimeout(() => {
          setIsResting(true);
          setRestTimeRemaining(currentExercise.rest_time);
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Error completing set:', error);
      Alert.alert('Error', 'Failed to save progress');
    }
  };

  // Handle skip rest
  const handleSkipRest = () => {
    setIsResting(false);
    setRestTimeRemaining(0);
    setCurrentSet(currentSet + 1);
  };

  // Handle skip exercise
  const handleSkipExercise = () => {
    Alert.alert(
      'Skip Exercise',
      `Are you sure you want to skip ${currentExercise?.exercise_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            if (currentExerciseIndex < exercises.length - 1) {
              setCurrentExerciseIndex(currentExerciseIndex + 1);
              setCurrentSet(1);
              setIsResting(false);
            }
          }
        }
      ]
    );
  };

  // Handle finish workout
  const handleFinishWorkout = async () => {
    if (!user?.id) return;
    
    Alert.alert(
      'Finish Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            setIsCompleting(true);
            try {
              const result = await completeWorkoutSession(workoutAssignmentId, user.id);

              if (result.success) {
                showSuccess('🎉 Workout completed! Great job!');
                Alert.alert('Success', 'Workout completed!', [
                  { text: 'OK', onPress: onComplete }
                ]);
              } else {
                showError(result.message);
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              console.error('❌ Error finishing workout:', error);
              showError('Failed to complete workout');
              Alert.alert('Error', 'Failed to complete workout');
            } finally {
              setIsCompleting(false);
            }
          }
        }
      ]
    );
  };

  // Handle exit
  const handleExit = () => {
    Alert.alert(
      'Exit Workout',
      'Your progress has been saved. You can continue this workout later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: onBack }
      ]
    );
  };

  // Handle rest timer complete
  const handleRestComplete = () => {
    setIsResting(false);
    setCurrentSet(currentSet + 1);
  };

  // Handle rest timer update
  const handleRestTimeUpdate = (time: number) => {
    setRestTimeRemaining(time);
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

  if (!currentExercise || !workout) {
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

  const progressPercentage = calculateProgress();
  const workoutComplete = isWorkoutComplete();

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
      {/* Header with Progress Bar */}
      <View style={{
        backgroundColor: 'white',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: containerPadding,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6'
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12
        }}>
          <Pressable
            onPress={handleExit}
            style={{
              width: 40,
              height: 40,
              backgroundColor: '#f3f4f6',
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}
          >
            <Feather name="x" size={20} color="#1f2937" />
          </Pressable>
          
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280',
              marginBottom: 4
            }}>
              {workout.name}
            </Text>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              {Math.round(progressPercentage)}% Complete
            </Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={{
          height: 8,
          backgroundColor: '#f3f4f6',
          borderRadius: 4,
          overflow: 'hidden'
        }}>
          <View style={{
            height: '100%',
            width: `${progressPercentage}%`,
            backgroundColor: '#10b981',
            borderRadius: 4
          }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: containerPadding,
          flexGrow: 1
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ 
          maxWidth: isTablet ? 600 : 500, 
          alignSelf: 'center', 
          width: '100%',
          flex: 1
        }}>
          
          {/* Exercise Card */}
          <View style={{
            backgroundColor: 'white',
            padding: containerPadding + 8,
            borderRadius: 16,
            marginBottom: 24,
            alignItems: 'center'
          }}>
            {/* Exercise Number */}
            <View style={{
              backgroundColor: '#eff6ff',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              marginBottom: 16
            }}>
              <Text style={{
                fontSize: fontSize,
                fontWeight: '600',
                color: '#3b82f6'
              }}>
                Exercise {currentExerciseIndex + 1} of {exercises.length}
              </Text>
            </View>
            
            {/* Exercise Name */}
            <Text style={{
              fontSize: titleFontSize + 4,
              fontWeight: 'bold',
              color: '#1f2937',
              textAlign: 'center',
              marginBottom: 8
            }}>
              {currentExercise.exercise_name}
            </Text>
            
            {/* Muscle Group */}
            <View style={{
              backgroundColor: '#f0fdf4',
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 12,
              marginBottom: 24
            }}>
              <Text style={{
                fontSize: fontSize,
                fontWeight: '600',
                color: '#10b981',
                textTransform: 'capitalize'
              }}>
                {currentExercise.muscle_group}
              </Text>
            </View>
            
            {/* Set Counter */}
            <Text style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 8
            }}>
              {currentSet}/{currentExercise.sets}
            </Text>
            <Text style={{
              fontSize: fontSize,
              color: '#6b7280',
              marginBottom: 24
            }}>
              Sets
            </Text>
            
            {/* Target Reps */}
            <View style={{
              backgroundColor: '#f3f4f6',
              paddingHorizontal: 24,
              paddingVertical: 16,
              borderRadius: 12,
              width: '100%',
              alignItems: 'center'
            }}>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#6b7280',
                marginBottom: 4
              }}>
                Target Reps
              </Text>
              <Text style={{
                fontSize: 32,
                fontWeight: 'bold',
                color: '#1f2937'
              }}>
                {currentExercise.reps}
              </Text>
            </View>
          </View>

          {/* Rest Timer or Action Button */}
          {isResting ? (
            <View style={{ marginBottom: 24 }}>
              <RestTimer
                timeRemaining={restTimeRemaining}
                onTimeUpdate={handleRestTimeUpdate}
                onComplete={handleRestComplete}
                onSkip={handleSkipRest}
              />
            </View>
          ) : (
            <Pressable
              onPress={handleCompleteSet}
              disabled={currentSet > currentExercise.sets}
              style={{
                backgroundColor: currentSet > currentExercise.sets ? '#9ca3af' : '#10b981',
                paddingVertical: 24,
                borderRadius: 16,
                marginBottom: 24,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                opacity: currentSet > currentExercise.sets ? 0.6 : 1
              }}
            >
              <Feather name="check-circle" size={32} color="white" />
              <Text style={{
                fontSize: fontSize + 6,
                fontWeight: 'bold',
                color: 'white',
                marginLeft: 12
              }}>
                Complete Set
              </Text>
            </Pressable>
          )}

          {/* Action Buttons */}
          <View style={{ gap: 12 }}>
            {!workoutComplete && currentExerciseIndex < exercises.length - 1 && (
              <Pressable
                onPress={handleSkipExercise}
                style={{
                  backgroundColor: 'white',
                  paddingVertical: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#f3f4f6'
                }}
              >
                <Text style={{
                  fontSize: fontSize,
                  fontWeight: '600',
                  color: '#6b7280'
                }}>
                  Skip Exercise
                </Text>
              </Pressable>
            )}
            
            {workoutComplete && (
              <Pressable
                onPress={handleFinishWorkout}
                disabled={isCompleting}
                style={{
                  backgroundColor: '#3b82f6',
                  paddingVertical: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  opacity: isCompleting ? 0.6 : 1
                }}
              >
                <Feather name="check-circle" size={24} color="white" />
                <Text style={{
                  fontSize: fontSize + 4,
                  fontWeight: 'bold',
                  color: 'white',
                  marginLeft: 12
                }}>
                  {isCompleting ? 'Finishing...' : 'Finish Workout'}
                </Text>
              </Pressable>
            )}
          </View>

        </View>
      </ScrollView>
      
      {/* Set Complete Animation Overlay */}
      {showSetCompleteAnimation && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <View style={{
            backgroundColor: '#10b981',
            paddingHorizontal: 32,
            paddingVertical: 24,
            borderRadius: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8
          }}>
            <Feather name="check-circle" size={64} color="white" />
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: 'white',
              marginTop: 12
            }}>
              Set Complete!
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
