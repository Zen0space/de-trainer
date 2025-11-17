import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import { getWorkoutAssignments } from '../../lib/offline-api';
import { TabView } from '../../components/ui/TabView';

interface WorkoutAssignment {
  id: number;
  workout_template_id: number;
  athlete_id: number;
  trainer_id: number;
  scheduled_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  workout_name: string;
  workout_description?: string;
  trainer_name: string;
}

interface WorkoutListScreenProps {
  onWorkoutPress?: (workoutId: number) => void;
}

export function WorkoutListScreen({ onWorkoutPress }: WorkoutListScreenProps) {
  const { user } = useSession();
  const { width } = useWindowDimensions();
  
  // State
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [workouts, setWorkouts] = useState<WorkoutAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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

  // Fetch workouts
  const fetchWorkouts = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Get today's date for filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      let assignments: WorkoutAssignment[] = [];

      if (activeTab === 'upcoming') {
        // Get pending and in_progress workouts scheduled for today or future
        assignments = await getWorkoutAssignments(user.id, {
          startDate: todayStr
        });
        
        // Filter to only show pending and in_progress
        assignments = assignments.filter(
          w => w.status === 'pending' || w.status === 'in_progress'
        );
      } else {
        // Get completed and skipped workouts
        assignments = await getWorkoutAssignments(user.id);
        
        // Filter to only show completed and skipped
        assignments = assignments.filter(
          w => w.status === 'completed' || w.status === 'skipped'
        );
      }

      setWorkouts(assignments);
    } catch (error) {
      console.error('❌ Error fetching workouts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, [user?.id, activeTab]);

  // Handle refresh
  const onRefresh = () => {
    fetchWorkouts(true);
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'upcoming' | 'completed');
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#fef3c7', text: '#f59e0b' };
      case 'in_progress':
        return { bg: '#dbeafe', text: '#3b82f6' };
      case 'completed':
        return { bg: '#d1fae5', text: '#10b981' };
      case 'skipped':
        return { bg: '#fee2e2', text: '#ef4444' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const workoutDate = new Date(date);
    workoutDate.setHours(0, 0, 0, 0);

    if (workoutDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (workoutDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Render workout card
  const renderWorkoutCard = (workout: WorkoutAssignment) => {
    const statusColors = getStatusColor(workout.status);
    const isOverdue = activeTab === 'upcoming' && 
      new Date(workout.scheduled_date) < new Date() && 
      workout.status === 'pending';

    return (
      <Pressable
        key={workout.id}
        onPress={() => onWorkoutPress?.(workout.id)}
        style={{
          backgroundColor: 'white',
          padding: cardPadding,
          borderRadius: 12,
          marginBottom: spacing,
          borderWidth: 1,
          borderColor: isOverdue ? '#fecaca' : '#f3f4f6',
        }}
      >
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: 12
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 4
            }}>
              {workout.workout_name}
            </Text>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280'
            }}>
              by {workout.trainer_name}
            </Text>
          </View>
          
          <View style={{
            backgroundColor: statusColors.bg,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12
          }}>
            <Text style={{
              fontSize: fontSize - 2,
              fontWeight: '600',
              color: statusColors.text,
              textTransform: 'capitalize'
            }}>
              {workout.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Description */}
        {workout.workout_description && (
          <Text style={{
            fontSize: fontSize - 2,
            color: '#6b7280',
            marginBottom: 12,
            lineHeight: 20
          }} numberOfLines={2}>
            {workout.workout_description}
          </Text>
        )}

        {/* Footer */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="calendar" size={16} color="#6b7280" />
            <Text style={{
              fontSize: fontSize - 2,
              color: isOverdue ? '#ef4444' : '#6b7280',
              marginLeft: 6,
              fontWeight: isOverdue ? '600' : '400'
            }}>
              {formatDate(workout.scheduled_date)}
              {isOverdue && ' (Overdue)'}
            </Text>
          </View>
          
          {workout.status === 'completed' && workout.completed_at && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="check-circle" size={16} color="#10b981" />
              <Text style={{
                fontSize: fontSize - 2,
                color: '#10b981',
                marginLeft: 6
              }}>
                Completed
              </Text>
            </View>
          )}
          
          {workout.status === 'in_progress' && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="play-circle" size={16} color="#3b82f6" />
              <Text style={{
                fontSize: fontSize - 2,
                color: '#3b82f6',
                marginLeft: 6
              }}>
                In Progress
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    const emptyConfig = activeTab === 'upcoming'
      ? {
          icon: 'calendar',
          title: 'No Upcoming Workouts',
          description: 'Your trainer hasn\'t assigned any workouts yet. Check back later!'
        }
      : {
          icon: 'check-circle',
          title: 'No Completed Workouts',
          description: 'Complete your first workout to see it here!'
        };

    return (
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60
      }}>
        <View style={{
          width: 80,
          height: 80,
          backgroundColor: '#f3f4f6',
          borderRadius: 40,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24
        }}>
          <Feather name={emptyConfig.icon as any} size={36} color="#9ca3af" />
        </View>
        
        <Text style={{
          fontSize: fontSize + 4,
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: 12,
          textAlign: 'center'
        }}>
          {emptyConfig.title}
        </Text>
        
        <Text style={{
          fontSize: fontSize,
          color: '#6b7280',
          textAlign: 'center',
          lineHeight: 24,
          maxWidth: 280
        }}>
          {emptyConfig.description}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: containerPadding,
          paddingBottom: containerPadding + bottomNavHeight,
          flexGrow: 1
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ maxWidth: isTablet ? 800 : 600, alignSelf: 'center', width: '100%' }}>
          
          {/* Header */}
          <View style={{ marginBottom: spacing }}>
            <Text style={{
              fontSize: titleFontSize,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 8
            }}>
              My Workouts
            </Text>
            <Text style={{
              fontSize: fontSize,
              color: '#6b7280'
            }}>
              View and track your assigned workouts
            </Text>
          </View>

          {/* Tab Navigation */}
          <View style={{ marginBottom: spacing }}>
            <TabView
              tabs={[
                { key: 'upcoming', title: 'Upcoming' },
                { key: 'completed', title: 'Completed' }
              ]}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </View>

          {/* Loading State */}
          {isLoading && !isRefreshing ? (
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 60
            }}>
              <Feather name="loader" size={32} color="#6b7280" />
              <Text style={{
                fontSize: fontSize,
                color: '#6b7280',
                marginTop: 12
              }}>
                Loading workouts...
              </Text>
            </View>
          ) : workouts.length === 0 ? (
            renderEmptyState()
          ) : (
            <View>
              {workouts.map(workout => renderWorkoutCard(workout))}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
