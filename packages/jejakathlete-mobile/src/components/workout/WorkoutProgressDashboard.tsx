import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getTrainerWorkoutAssignments, rescheduleWorkoutAssignment, cancelWorkoutAssignment } from '../../lib/api';
import { formatTimeAgo } from '../../lib/date-utils';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useToast } from '../../contexts/ToastContext';

interface WorkoutProgressDashboardProps {
  trainerId: number;
  onBack: () => void;
}

interface AthleteProgress {
  athlete_id: number;
  athlete_name: string;
  total_assigned: number;
  completed: number;
  pending: number;
  completion_rate: number;
}

export function WorkoutProgressDashboard({ trainerId, onBack }: WorkoutProgressDashboardProps) {
  const { width } = useWindowDimensions();
  const { showSuccess, showError } = useToast();
  const [athleteProgress, setAthleteProgress] = useState<AthleteProgress[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [workoutAssignments, setWorkoutAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [overallStats, setOverallStats] = useState({
    totalAssigned: 0,
    totalCompleted: 0,
    completionRate: 0,
  });
  
  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [newScheduledDate, setNewScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;

  useEffect(() => {
    fetchProgressData();
  }, [trainerId]);

  useEffect(() => {
    if (selectedAthleteId) {
      fetchAthleteWorkouts(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  const fetchProgressData = async (isRefreshAction = false) => {
    if (isRefreshAction) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch all workout assignments for this trainer
      const assignments = await getTrainerWorkoutAssignments(trainerId);

      // Group by athlete and calculate stats
      const athleteMap = new Map<number, AthleteProgress>();

      assignments.forEach((assignment: any) => {
        const athleteId = assignment.athlete_id;
        const athleteName = assignment.athlete_name;

        if (!athleteMap.has(athleteId)) {
          athleteMap.set(athleteId, {
            athlete_id: athleteId,
            athlete_name: athleteName,
            total_assigned: 0,
            completed: 0,
            pending: 0,
            completion_rate: 0,
          });
        }

        const progress = athleteMap.get(athleteId)!;
        progress.total_assigned++;

        if (assignment.status === 'completed') {
          progress.completed++;
        } else if (assignment.status === 'pending' || assignment.status === 'in_progress') {
          progress.pending++;
        }
      });

      // Calculate completion rates
      const athleteProgressArray = Array.from(athleteMap.values()).map((progress) => ({
        ...progress,
        completion_rate:
          progress.total_assigned > 0
            ? Math.round((progress.completed / progress.total_assigned) * 100)
            : 0,
      }));

      // Sort by completion rate (descending)
      athleteProgressArray.sort((a, b) => b.completion_rate - a.completion_rate);

      setAthleteProgress(athleteProgressArray);

      // Calculate overall stats
      const totalAssigned = assignments.length;
      const totalCompleted = assignments.filter((a: any) => a.status === 'completed').length;
      const completionRate =
        totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

      setOverallStats({
        totalAssigned,
        totalCompleted,
        completionRate,
      });
    } catch (error) {
      console.error('❌ Error fetching progress data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchAthleteWorkouts = async (athleteId: number) => {
    try {
      const assignments = await getTrainerWorkoutAssignments(trainerId, { athleteId });
      setWorkoutAssignments(assignments);
    } catch (error) {
      console.error('❌ Error fetching athlete workouts:', error);
    }
  };

  const onRefresh = () => {
    fetchProgressData(true);
    if (selectedAthleteId) {
      fetchAthleteWorkouts(selectedAthleteId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'in_progress':
        return '#3b82f6';
      case 'pending':
        return '#f59e0b';
      case 'skipped':
        return '#6b7280';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'in_progress':
        return 'play-circle';
      case 'pending':
        return 'clock';
      case 'skipped':
        return 'skip-forward';
      case 'cancelled':
        return 'x-circle';
      default:
        return 'circle';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const handleRescheduleWorkout = (assignment: any) => {
    setSelectedAssignment(assignment);
    setNewScheduledDate(new Date(assignment.scheduled_date));
    setShowRescheduleModal(true);
  };

  const handleConfirmReschedule = async () => {
    if (!selectedAssignment) return;

    setIsRescheduling(true);
    try {
      const result = await rescheduleWorkoutAssignment(
        selectedAssignment.id,
        trainerId,
        newScheduledDate.toISOString().split('T')[0]
      );

      if (result.success) {
        showSuccess(result.message);
        Alert.alert('Success', result.message);
        setShowRescheduleModal(false);
        setSelectedAssignment(null);
        // Refresh data
        fetchProgressData();
        if (selectedAthleteId) {
          fetchAthleteWorkouts(selectedAthleteId);
        }
      } else {
        showError(result.message);
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('❌ Error rescheduling workout:', error);
      showError('Failed to reschedule workout');
      Alert.alert('Error', 'Failed to reschedule workout');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancelWorkout = (assignment: any) => {
    Alert.alert(
      'Cancel Workout',
      `Are you sure you want to cancel "${assignment.workout_name}" for ${assignment.athlete_name}? This action cannot be undone.`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await cancelWorkoutAssignment(assignment.id, trainerId);

              if (result.success) {
                showSuccess(result.message);
                Alert.alert('Success', result.message);
                // Refresh data
                fetchProgressData();
                if (selectedAthleteId) {
                  fetchAthleteWorkouts(selectedAthleteId);
                }
              } else {
                showError(result.message);
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              console.error('❌ Error cancelling workout:', error);
              showError('Failed to cancel workout');
              Alert.alert('Error', 'Failed to cancel workout');
            }
          },
        },
      ]
    );
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNewScheduledDate(selectedDate);
    }
  };

  const renderAthleteList = () => (
    <View style={{ flex: 1 }}>
      {/* Overall Stats */}
      <View
        style={{
          backgroundColor: 'white',
          padding: spacing,
          borderRadius: 12,
          marginBottom: spacing,
        }}
      >
        <Text
          style={{
            fontSize: fontSize + 2,
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: 12,
          }}
        >
          Overall Statistics
        </Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>
              {overallStats.totalAssigned}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              Total Assigned
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>
              {overallStats.totalCompleted}
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              Completed
            </Text>
          </View>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#8b5cf6' }}>
              {overallStats.completionRate}%
            </Text>
            <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              Completion Rate
            </Text>
          </View>
        </View>
      </View>

      {/* Athlete List */}
      <View
        style={{
          backgroundColor: 'white',
          padding: spacing,
          borderRadius: 12,
          flex: 1,
        }}
      >
        <Text
          style={{
            fontSize: fontSize + 2,
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: 12,
          }}
        >
          Athletes ({athleteProgress.length})
        </Text>

        {athleteProgress.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Feather name="users" size={48} color="#9ca3af" />
            <Text
              style={{
                fontSize: fontSize,
                color: '#6b7280',
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              No workout assignments yet
            </Text>
            <Text
              style={{
                fontSize: fontSize - 2,
                color: '#9ca3af',
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              Assign workouts to athletes to see progress here
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {athleteProgress.map((athlete, index) => (
              <Pressable
                key={athlete.athlete_id}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: index < athleteProgress.length - 1 ? 1 : 0,
                  borderBottomColor: '#f3f4f6',
                }}
                onPress={() => setSelectedAthleteId(athlete.athlete_id)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: fontSize,
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: 4,
                      }}
                    >
                      {athlete.athlete_name}
                    </Text>
                    <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>
                      {athlete.completed} of {athlete.total_assigned} completed
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: 'bold',
                        color:
                          athlete.completion_rate >= 80
                            ? '#10b981'
                            : athlete.completion_rate >= 50
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {athlete.completion_rate}%
                    </Text>
                    <Feather name="chevron-right" size={20} color="#9ca3af" />
                  </View>
                </View>

                {/* Progress bar */}
                <View
                  style={{
                    height: 6,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${athlete.completion_rate}%`,
                      backgroundColor:
                        athlete.completion_rate >= 80
                          ? '#10b981'
                          : athlete.completion_rate >= 50
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );

  const renderAthleteWorkouts = () => {
    const athlete = athleteProgress.find((a) => a.athlete_id === selectedAthleteId);

    return (
      <View style={{ flex: 1 }}>
        {/* Athlete Info Card */}
        <View
          style={{
            backgroundColor: 'white',
            padding: spacing,
            borderRadius: 12,
            marginBottom: spacing,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Pressable
              onPress={() => setSelectedAthleteId(null)}
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
              <Text
                style={{
                  fontSize: fontSize + 2,
                  fontWeight: 'bold',
                  color: '#1f2937',
                }}
              >
                {athlete?.athlete_name}
              </Text>
              <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>
                {athlete?.completed} of {athlete?.total_assigned} completed (
                {athlete?.completion_rate}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Workout List */}
        <View
          style={{
            backgroundColor: 'white',
            padding: spacing,
            borderRadius: 12,
            flex: 1,
          }}
        >
          <Text
            style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 12,
            }}
          >
            Workout Assignments
          </Text>

          {workoutAssignments.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Feather name="clipboard" size={48} color="#9ca3af" />
              <Text
                style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  marginTop: 12,
                  textAlign: 'center',
                }}
              >
                No workouts assigned
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {workoutAssignments.map((assignment, index) => {
                const isOverdue =
                  assignment.status === 'pending' &&
                  new Date(assignment.scheduled_date) < new Date();
                const canModify = assignment.status !== 'completed';

                return (
                  <View
                    key={assignment.id}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: index < workoutAssignments.length - 1 ? 1 : 0,
                      borderBottomColor: '#f3f4f6',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: `${getStatusColor(assignment.status)}20`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        <Feather
                          name={getStatusIcon(assignment.status) as any}
                          size={20}
                          color={getStatusColor(assignment.status)}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: fontSize,
                            fontWeight: '600',
                            color: '#1f2937',
                            marginBottom: 4,
                          }}
                        >
                          {assignment.workout_name}
                        </Text>

                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <Feather name="calendar" size={14} color="#6b7280" />
                          <Text
                            style={{
                              fontSize: fontSize - 2,
                              color: '#6b7280',
                              marginLeft: 4,
                            }}
                          >
                            {new Date(assignment.scheduled_date).toLocaleDateString()}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 12,
                              backgroundColor: `${getStatusColor(assignment.status)}20`,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: getStatusColor(assignment.status),
                              }}
                            >
                              {getStatusLabel(assignment.status)}
                            </Text>
                          </View>

                          {isOverdue && (
                            <View
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 12,
                                backgroundColor: '#fef2f2',
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '600',
                                  color: '#ef4444',
                                }}
                              >
                                OVERDUE
                              </Text>
                            </View>
                          )}
                        </View>

                        {assignment.completed_at && (
                          <Text
                            style={{
                              fontSize: fontSize - 2,
                              color: '#9ca3af',
                              marginTop: 4,
                            }}
                          >
                            Completed {formatTimeAgo(assignment.completed_at)}
                          </Text>
                        )}

                        {/* Action Buttons */}
                        {canModify && (
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            <Pressable
                              onPress={() => handleRescheduleWorkout(assignment)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                backgroundColor: '#eff6ff',
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#3b82f6',
                              }}
                            >
                              <Feather name="calendar" size={14} color="#3b82f6" />
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: '600',
                                  color: '#3b82f6',
                                  marginLeft: 4,
                                }}
                              >
                                Reschedule
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => handleCancelWorkout(assignment)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                backgroundColor: '#fef2f2',
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#ef4444',
                              }}
                            >
                              <Feather name="x-circle" size={14} color="#ef4444" />
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: '600',
                                  color: '#ef4444',
                                  marginLeft: 4,
                                }}
                              >
                                Cancel
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
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
              padding: isSmallScreen ? 16 : isTablet ? 24 : 20,
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
                    Workout Progress
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 }}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={{ marginTop: 12, fontSize: fontSize, color: '#6b7280' }}>
                Loading progress data...
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: containerPadding,
          paddingBottom: 100
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }
      >
        <View style={{ maxWidth: isTablet ? 800 : 600, alignSelf: 'center', width: '100%' }}>
          {/* Header */}
          <View style={{
            backgroundColor: 'white',
            padding: isSmallScreen ? 16 : isTablet ? 24 : 20,
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
                  Workout Progress
                </Text>
              </View>
            </View>
          </View>

          {/* Content */}
          {selectedAthleteId ? renderAthleteWorkouts() : renderAthleteList()}
        </View>
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: containerPadding,
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: fontSize + 4,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 8,
              }}
            >
              Reschedule Workout
            </Text>

            {selectedAssignment && (
              <Text
                style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  marginBottom: 20,
                }}
              >
                {selectedAssignment.workout_name}
              </Text>
            )}

            {/* Date Picker */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: fontSize - 2,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8,
                }}
              >
                New Scheduled Date
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
                  borderColor: '#d1d5db',
                }}
              >
                <Feather name="calendar" size={20} color="#6b7280" />
                <Text
                  style={{
                    fontSize: fontSize,
                    color: '#1f2937',
                    marginLeft: 8,
                    flex: 1,
                  }}
                >
                  {newScheduledDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={newScheduledDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => {
                  setShowRescheduleModal(false);
                  setSelectedAssignment(null);
                }}
                disabled={isRescheduling}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                  opacity: isRescheduling ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize,
                    fontWeight: '600',
                    color: '#6b7280',
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmReschedule}
                disabled={isRescheduling}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#3b82f6',
                  alignItems: 'center',
                  opacity: isRescheduling ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize,
                    fontWeight: '600',
                    color: 'white',
                  }}
                >
                  {isRescheduling ? 'Rescheduling...' : 'Reschedule'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
