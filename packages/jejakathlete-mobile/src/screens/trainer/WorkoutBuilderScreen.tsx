import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useSession } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  getWorkoutTemplateById,
  createWorkoutTemplate,
  updateWorkoutTemplate
} from '../../lib/api';
import { ExerciseLibraryModal } from '../../components/workout/ExerciseLibraryModal';
import { ExerciseConfigModal } from '../../components/workout/ExerciseConfigModal';
import { WorkoutAssignmentModal } from '../../components/workout/WorkoutAssignmentModal';

interface WorkoutBuilderScreenProps {
  templateId?: number;
  onBack: () => void;
}

interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
}

interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: number;
  rest_time: number;
  order_index: number;
}

export function WorkoutBuilderScreen({ templateId, onBack }: WorkoutBuilderScreenProps) {
  const { user } = useSession();
  const { showSuccess, showError } = useToast();
  const { width } = useWindowDimensions();
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const cardPadding = isSmallScreen ? 16 : isTablet ? 24 : 20;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;
  
  // State
  const [workoutName, setWorkoutName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [showExerciseConfig, setShowExerciseConfig] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Validation errors
  const [nameError, setNameError] = useState('');
  
  // Load template if editing
  useEffect(() => {
    if (templateId && user?.id) {
      loadTemplate();
    }
  }, [templateId, user?.id]);
  
  const loadTemplate = async () => {
    if (!templateId || !user?.id) return;
    
    try {
      const template = await getWorkoutTemplateById(templateId);
      if (template) {
        setWorkoutName(template.name);
        setDescription(template.description || '');
        
        // Load exercises with their details
        const exerciseDetails = await Promise.all(
          template.exercises.map(async (we: any) => ({
            exercise: we.exercise,
            sets: we.sets,
            reps: we.reps,
            rest_time: we.rest_time,
            order_index: we.order_index
          }))
        );
        
        setExercises(exerciseDetails.sort((a, b) => a.order_index - b.order_index));
      }
    } catch (error) {
      console.error('Error loading template:', error);
      Alert.alert('Error', 'Failed to load workout template');
    }
  };
  
  const handleAddExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowExerciseLibrary(false);
    setShowExerciseConfig(true);
  };
  
  const handleSaveExerciseConfig = (config: { sets: number; reps: number; rest_time: number }) => {
    if (!selectedExercise) return;
    
    if (editingExerciseIndex !== null) {
      // Update existing exercise
      const updatedExercises = [...exercises];
      updatedExercises[editingExerciseIndex] = {
        ...updatedExercises[editingExerciseIndex],
        ...config
      };
      setExercises(updatedExercises);
      setEditingExerciseIndex(null);
    } else {
      // Add new exercise
      const newExercise: WorkoutExercise = {
        exercise: selectedExercise,
        sets: config.sets,
        reps: config.reps,
        rest_time: config.rest_time,
        order_index: exercises.length
      };
      setExercises([...exercises, newExercise]);
    }
    
    setSelectedExercise(null);
    setShowExerciseConfig(false);
  };
  
  const handleEditExercise = (index: number) => {
    setSelectedExercise(exercises[index].exercise);
    setEditingExerciseIndex(index);
    setShowExerciseConfig(true);
  };
  
  const handleRemoveExercise = (index: number) => {
    Alert.alert(
      'Remove Exercise',
      'Are you sure you want to remove this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedExercises = exercises.filter((_, i) => i !== index);
            // Update order indices
            const reorderedExercises = updatedExercises.map((ex, i) => ({
              ...ex,
              order_index: i
            }));
            setExercises(reorderedExercises);
          }
        }
      ]
    );
  };
  
  const validateForm = (): boolean => {
    let isValid = true;
    
    // Validate workout name
    if (!workoutName.trim()) {
      setNameError('Workout name is required');
      isValid = false;
    } else if (workoutName.trim().length < 3) {
      setNameError('Workout name must be at least 3 characters');
      isValid = false;
    } else if (workoutName.trim().length > 100) {
      setNameError('Workout name must be less than 100 characters');
      isValid = false;
    } else {
      setNameError('');
    }
    
    // Validate at least one exercise
    if (exercises.length === 0) {
      Alert.alert('Validation Error', 'Add at least one exercise to the workout');
      isValid = false;
    }
    
    return isValid;
  };
  
  const handleSaveAsTemplate = async () => {
    if (!validateForm() || !user?.id) return;
    
    setIsSaving(true);
    try {
      const workoutData = {
        trainer_id: user.id,
        name: workoutName.trim(),
        description: description.trim() || undefined,
        exercises: exercises.map((ex, index) => ({
          exercise_id: ex.exercise.id,
          order_index: index,
          sets: ex.sets,
          reps: ex.reps,
          rest_time: ex.rest_time
        }))
      };
      
      if (templateId) {
        await updateWorkoutTemplate(templateId, user.id, workoutData);
        showSuccess('Workout template updated successfully');
        Alert.alert('Success', 'Workout template updated successfully', [
          { text: 'OK', onPress: onBack }
        ]);
      } else {
        await createWorkoutTemplate(workoutData);
        showSuccess('Workout template saved successfully');
        Alert.alert('Success', 'Workout template saved successfully', [
          { text: 'OK', onPress: onBack }
        ]);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showError('Failed to save workout template');
      Alert.alert('Error', 'Failed to save workout template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAssignToAthletes = async () => {
    if (!validateForm() || !user?.id) return;
    
    // If this is a new workout (not saved yet), save it first
    if (!templateId) {
      setIsSaving(true);
      try {
        const workoutData = {
          trainer_id: user.id,
          name: workoutName.trim(),
          description: description.trim() || undefined,
          exercises: exercises.map((ex, index) => ({
            exercise_id: ex.exercise.id,
            order_index: index,
            sets: ex.sets,
            reps: ex.reps,
            rest_time: ex.rest_time
          }))
        };
        
        const result = await createWorkoutTemplate(workoutData);
        if (result.success) {
          // Open assignment modal with the new template ID
          setShowAssignmentModal(true);
        } else {
          Alert.alert('Error', 'Failed to save workout template. Please try again.');
        }
      } catch (error) {
        console.error('Error saving template:', error);
        Alert.alert('Error', 'Failed to save workout template. Please try again.');
      } finally {
        setIsSaving(false);
      }
    } else {
      setShowAssignmentModal(true);
    }
  };
  
  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: containerPadding,
          paddingBottom: 100
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ maxWidth: isTablet ? 800 : 600, alignSelf: 'center', width: '100%' }}>
          
          {/* Header */}
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 16,
            marginBottom: spacing
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                onPress={onBack}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#f3f4f6',
                  marginRight: 12
                }}
              >
                <Feather name="arrow-left" size={20} color="#6b7280" />
              </Pressable>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: titleFontSize,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 4
                }}>
                  {templateId ? 'Edit Workout' : 'Create Workout'}
                </Text>
              </View>
              
              <Pressable
                onPress={handleSaveAsTemplate}
                disabled={isSaving}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: isSaving ? '#9ca3af' : '#3b82f6',
                  borderRadius: 8
                }}
              >
                <Text style={{
                  color: 'white',
                  fontSize: fontSize - 1,
                  fontWeight: '600'
                }}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
          
          {/* Workout Details Card */}
          <View style={{
            backgroundColor: 'white',
            padding: containerPadding,
            borderRadius: 16,
            marginBottom: spacing
          }}>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 16
            }}>
              Workout Details
            </Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: fontSize,
                fontWeight: '600',
                color: '#374151',
                marginBottom: 8
              }}>
                Workout Name *
              </Text>
              <Input
                placeholder="e.g., Upper Body Strength"
                value={workoutName}
                onChangeText={(text) => {
                  setWorkoutName(text);
                  if (nameError) setNameError('');
                }}
                error={nameError}
              />
            </View>
            
            <View>
              <Text style={{
                fontSize: fontSize,
                fontWeight: '600',
                color: '#374151',
                marginBottom: 8
              }}>
                Description (Optional)
              </Text>
              <Input
                placeholder="Add workout description..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
          
          {/* Exercises List Card */}
          <View style={{
            backgroundColor: 'white',
            padding: containerPadding,
            borderRadius: 16,
            marginBottom: spacing
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16
            }}>
              <Text style={{
                fontSize: fontSize + 2,
                fontWeight: 'bold',
                color: '#1f2937'
              }}>
                Exercises ({exercises.length})
              </Text>
              
              <Pressable
                onPress={() => setShowExerciseLibrary(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#3b82f6',
                  borderRadius: 8
                }}
              >
                <Feather name="plus" size={16} color="white" />
                <Text style={{
                  color: 'white',
                  fontSize: fontSize - 2,
                  fontWeight: '600',
                  marginLeft: 4
                }}>
                  Add Exercise
                </Text>
              </Pressable>
            </View>
            
            {exercises.length === 0 ? (
              <View style={{
                alignItems: 'center',
                paddingVertical: 32,
                backgroundColor: '#f9fafb',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                borderStyle: 'dashed'
              }}>
                <Feather name="list" size={32} color="#9ca3af" />
                <Text style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  marginTop: 12,
                  textAlign: 'center'
                }}>
                  No exercises added yet
                </Text>
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#9ca3af',
                  textAlign: 'center',
                  marginTop: 4
                }}>
                  Tap "Add Exercise" to get started
                </Text>
              </View>
            ) : (
              <View>
                {exercises.map((exercise, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: '#f9fafb',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: index < exercises.length - 1 ? 12 : 0,
                      borderWidth: 1,
                      borderColor: '#e5e7eb'
                    }}
                  >
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between'
                    }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <View style={{
                            width: 24,
                            height: 24,
                            backgroundColor: '#3b82f6',
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 8
                          }}>
                            <Text style={{
                              color: 'white',
                              fontSize: 12,
                              fontWeight: 'bold'
                            }}>
                              {index + 1}
                            </Text>
                          </View>
                          
                          <Text style={{
                            fontSize: fontSize,
                            fontWeight: '600',
                            color: '#1f2937',
                            flex: 1
                          }}>
                            {exercise.exercise.name}
                          </Text>
                        </View>
                        
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginLeft: 32,
                          marginTop: 4
                        }}>
                          <View style={{
                            backgroundColor: '#dbeafe',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 4,
                            marginRight: 8
                          }}>
                            <Text style={{
                              fontSize: fontSize - 3,
                              color: '#3b82f6',
                              fontWeight: '600'
                            }}>
                              {exercise.exercise.muscle_group.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginLeft: 32,
                          marginTop: 8
                        }}>
                          <Text style={{
                            fontSize: fontSize - 2,
                            color: '#6b7280'
                          }}>
                            {exercise.sets} sets × {exercise.reps} reps • {exercise.rest_time}s rest
                          </Text>
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => handleEditExercise(index)}
                          style={{
                            padding: 8,
                            backgroundColor: 'white',
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#e5e7eb'
                          }}
                        >
                          <Feather name="edit-2" size={16} color="#6b7280" />
                        </Pressable>
                        
                        <Pressable
                          onPress={() => handleRemoveExercise(index)}
                          style={{
                            padding: 8,
                            backgroundColor: 'white',
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: '#e5e7eb'
                          }}
                        >
                          <Feather name="trash-2" size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
          
          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Save as Template"
                onPress={handleSaveAsTemplate}
                disabled={isSaving}
                variant="primary"
                size="large"
              />
            </View>
            
            <View style={{ flex: 1 }}>
              <Button
                title="Assign to Athletes"
                onPress={handleAssignToAthletes}
                variant="outline"
                size="large"
              />
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Modals will be rendered here */}
      {showExerciseLibrary && (
        <ExerciseLibraryModal
          visible={showExerciseLibrary}
          onClose={() => setShowExerciseLibrary(false)}
          onSelectExercise={handleAddExercise}
        />
      )}
      
      {showExerciseConfig && selectedExercise && (
        <ExerciseConfigModal
          visible={showExerciseConfig}
          exercise={selectedExercise}
          initialConfig={
            editingExerciseIndex !== null
              ? {
                  sets: exercises[editingExerciseIndex].sets,
                  reps: exercises[editingExerciseIndex].reps,
                  rest_time: exercises[editingExerciseIndex].rest_time
                }
              : undefined
          }
          onSave={handleSaveExerciseConfig}
          onClose={() => {
            setShowExerciseConfig(false);
            setSelectedExercise(null);
            setEditingExerciseIndex(null);
          }}
        />
      )}
      
      {showAssignmentModal && user?.id && (
        <WorkoutAssignmentModal
          visible={showAssignmentModal}
          workoutTemplateId={templateId || 0}
          workoutTemplateName={workoutName}
          trainerId={user.id}
          onClose={() => setShowAssignmentModal(false)}
          onAssignSuccess={() => {
            // Optionally navigate back or show success message
            Alert.alert('Success', 'Workout assigned successfully');
          }}
        />
      )}
    </View>
  );
}


