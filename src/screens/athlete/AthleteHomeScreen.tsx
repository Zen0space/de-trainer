import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, ScrollView, RefreshControl, Alert } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { FloatingBottomNav } from '../../components/ui/FloatingBottomNav';
// Import athlete screens
import { TrainerConnectionScreen } from './TrainerConnectionScreen';
import { WorkoutHistoryScreen } from './WorkoutHistoryScreen';
import { AthleteProgressScreen } from './AthleteProgressScreen';
import { AthleteSettingsScreen } from './AthleteSettingsScreen';
import { tursoDbHelpers } from '../../lib/turso-database';

interface AthleteStats {
  totalWorkouts: number;
  recentTestResults: number;
  currentTrainer: string | null;
  personalRecords: number;
}

interface RecentActivity {
  id: number;
  test_name: string;
  result_text: string;
  test_date: string;
  is_best_record: boolean;
  notes?: string;
}

export function AthleteHomeScreen() {
  const { user, logout } = useSession();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('home');
  const [stats, setStats] = useState<AthleteStats>({
    totalWorkouts: 0,
    recentTestResults: 0,
    currentTrainer: null,
    personalRecords: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
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
  const bottomNavHeight = (isSmallScreen ? 70 : isTablet ? 90 : 80) + 32; // nav height + buffer

  // Fetch athlete dashboard data
  const fetchDashboardData = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Get athlete's current trainer
      const trainerData = await tursoDbHelpers.get(`
        SELECT 
          u.full_name as trainer_name,
          t.trainer_code
        FROM enrollments e
        JOIN users u ON e.trainer_id = u.id
        JOIN trainers t ON t.user_id = u.id
        WHERE e.athlete_id = ? AND e.status = 'approved'
        LIMIT 1
      `, [user.id]);

      // Get total workout count (test results)
      const workoutCount = await tursoDbHelpers.get(`
        SELECT COUNT(*) as count
        FROM test_results
        WHERE athlete_id = ?
      `, [user.id]);

      // Get recent test results count (last 30 days)
      const recentTestCount = await tursoDbHelpers.get(`
        SELECT COUNT(*) as count
        FROM test_results
        WHERE athlete_id = ? AND test_date >= date('now', '-30 days')
      `, [user.id]);

      // Get personal records count
      const personalRecords = await tursoDbHelpers.get(`
        SELECT COUNT(*) as count
        FROM test_results
        WHERE athlete_id = ? AND is_best_record = TRUE
      `, [user.id]);

      // Get recent activities (last 10 test results)
      const recentTests = await tursoDbHelpers.all(`
        SELECT 
          tr.id,
          t.name as test_name,
          tr.result_text,
          tr.test_date,
          tr.is_best_record,
          tr.notes
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        WHERE tr.athlete_id = ?
        ORDER BY tr.test_date DESC, tr.created_at DESC
        LIMIT 10
      `, [user.id]);



      setStats({
        totalWorkouts: workoutCount?.count || 0,
        recentTestResults: recentTestCount?.count || 0,
        currentTrainer: trainerData?.trainer_name || null,
        personalRecords: personalRecords?.count || 0
      });

      setRecentActivities(recentTests || []);
    } catch (error) {
      console.error('❌ Error fetching athlete dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  // Handle refresh
  const onRefresh = () => {
    fetchDashboardData(true);
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
  };

  // Show Coming Soon alert for Goals feature
  const showComingSoonAlert = () => {
    Alert.alert(
      "🎯 Goals Feature",
      "We're working hard to bring you an amazing goal-setting and tracking experience! This feature will be available in an upcoming update.\n\nStay tuned for more fitness tracking capabilities!",
      [
        {
          text: "Got it!",
          style: "default"
        }
      ],
      { 
        cancelable: true,
        userInterfaceStyle: 'light'
      }
    );
  };

  // Quick actions for athletes
  const quickActions = [
    { id: 1, title: 'View Progress', icon: 'trending-up', color: '#3b82f6' },
    { id: 2, title: 'My Trainer', icon: 'user-check', color: '#10b981' },
    { id: 3, title: 'Test History', icon: 'activity', color: '#f59e0b' },
    { id: 4, title: 'Goals', icon: 'target', color: '#8b5cf6' },
  ];

  // Render different screens based on active tab
  const renderScreen = () => {
    switch (activeTab) {
      case 'workouts':
        return <WorkoutHistoryScreen />;
      case 'progress':
        return <AthleteProgressScreen />;
      case 'settings':
        return <AthleteSettingsScreen />;
      case 'trainer':
        return <TrainerConnectionScreen onBack={() => setActiveTab('home')} />;
      case 'home':
      default:
        return renderHomeScreen();
    }
  };

  const renderPlaceholderScreen = (title: string, icon: string, description: string) => (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#f9fafb',
      padding: containerPadding,
      paddingBottom: containerPadding + bottomNavHeight 
    }}>
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        maxWidth: isTablet ? 800 : 600, 
        alignSelf: 'center', 
        width: '100%' 
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
          <Feather name={icon as any} size={36} color="#9ca3af" />
        </View>
        
        <Text style={{
          fontSize: titleFontSize,
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: 12,
          textAlign: 'center'
        }}>
          {title}
        </Text>
        
        <Text style={{
          fontSize: fontSize,
          color: '#6b7280',
          textAlign: 'center',
          lineHeight: 24,
          maxWidth: 280
        }}>
          {description}
        </Text>
      </View>
    </View>
  );

  const renderHomeScreen = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ 
        padding: containerPadding,
        paddingBottom: containerPadding + bottomNavHeight 
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View style={{ maxWidth: isTablet ? 800 : 600, alignSelf: 'center', width: '100%' }}>
        
        {/* Header */}
        <View style={{
          backgroundColor: 'white',
          padding: cardPadding,
          borderRadius: 16,
          marginBottom: spacing,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: titleFontSize,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 4
              }}>
                My Dashboard
              </Text>
              <View style={{
                backgroundColor: '#f0fdf4',
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 12,
                alignSelf: 'flex-start'
              }}>
                <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '600' }}>
                  ATHLETE
                </Text>
              </View>
            </View>
            
            <Pressable
              onPress={logout}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: '#f3f4f6'
              }}
            >
              <Feather name="log-out" size={20} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginBottom: spacing,
          gap: spacing / 2
        }}>
          <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
            <View style={{
              backgroundColor: 'white',
              padding: cardPadding,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#3b82f6', marginBottom: 4 }}>
                {stats.totalWorkouts}
              </Text>
              <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Total Tests</Text>
            </View>
          </View>
          
          <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
            <View style={{
              backgroundColor: 'white',
              padding: cardPadding,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#10b981', marginBottom: 4 }}>
                {stats.recentTestResults}
              </Text>
              <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Recent Tests</Text>
            </View>
          </View>
          
          <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
            <View style={{
              backgroundColor: 'white',
              padding: cardPadding,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#f59e0b', marginBottom: 4 }}>
                {stats.personalRecords}
              </Text>
              <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Personal Records</Text>
            </View>
          </View>
          
          <View style={{ flex: 1, minWidth: isSmallScreen ? '48%' : 150 }}>
            <View style={{
              backgroundColor: 'white',
              padding: cardPadding,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <Text style={{ 
                fontSize: 28, 
                fontWeight: 'bold', 
                color: stats.currentTrainer ? '#10b981' : '#ef4444', 
                marginBottom: 4 
              }}>
                {stats.currentTrainer ? '1' : '0'}
              </Text>
              <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>
                Trainer Assigned
              </Text>
            </View>
          </View>
        </View>

        {/* Current Trainer Card */}
        {stats.currentTrainer && (
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 16,
            marginBottom: spacing,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 16
            }}>
              My Trainer
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 50,
                height: 50,
                backgroundColor: '#10b981',
                borderRadius: 25,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16
              }}>
                <Text style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>
                  {stats.currentTrainer.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: fontSize,
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: 2
                }}>
                  {stats.currentTrainer}
                </Text>
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#6b7280'
                }}>
                  Certified Trainer
                </Text>
              </View>
              
              <Pressable
                onPress={() => setActiveTab('trainer')}
                style={{
                  backgroundColor: '#f0fdf4',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{
                  fontSize: fontSize - 2,
                  fontWeight: '600',
                  color: '#10b981'
                }}>
                  View Details
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{
          backgroundColor: 'white',
          padding: cardPadding,
          borderRadius: 16,
          marginBottom: spacing,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <Text style={{
            fontSize: fontSize + 2,
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: 16
          }}>
            Quick Actions
          </Text>
          
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12
          }}>
            {quickActions.map((action) => (
              <Pressable
                key={action.id}
                style={{
                  flex: 1,
                  minWidth: isSmallScreen ? '48%' : 140,
                  backgroundColor: '#f8fafc',
                  padding: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#e5e7eb'
                }}
                onPress={() => {
                  if (action.title === 'View Progress') {
                    setActiveTab('progress');
                  } else if (action.title === 'My Trainer') {
                    setActiveTab('trainer');
                  } else if (action.title === 'Test History') {
                    setActiveTab('workouts');
                  } else if (action.title === 'Goals') {
                    showComingSoonAlert();
                  }
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  backgroundColor: action.color,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8
                }}>
                  <Feather name={action.icon as any} size={20} color="white" />
                </View>
                <Text style={{
                  fontSize: fontSize - 2,
                  fontWeight: '600',
                  color: '#374151',
                  textAlign: 'center'
                }}>
                  {action.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={{
          backgroundColor: 'white',
          padding: cardPadding,
          borderRadius: 16,
          marginBottom: spacing,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <Text style={{
            fontSize: fontSize + 2,
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: 16
          }}>
            Recent Test Results
          </Text>
          
          {isLoading ? (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 40
            }}>
              <Feather name="loader" size={24} color="#6b7280" />
              <Text style={{
                fontSize: fontSize,
                color: '#6b7280',
                marginTop: 8
              }}>
                Loading...
              </Text>
            </View>
          ) : recentActivities.length > 0 ? (
            <>
              {recentActivities.slice(0, 5).map((activity, index) => (
                <View
                  key={activity.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: index < Math.min(recentActivities.length, 5) - 1 ? 1 : 0,
                    borderBottomColor: '#f3f4f6'
                  }}
                >
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: activity.is_best_record ? '#f59e0b' : '#10b981',
                    marginRight: 12
                  }} />
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: fontSize,
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: 2
                    }}>
                      {activity.test_name}
                    </Text>
                    <Text style={{
                      fontSize: fontSize - 2,
                      color: '#6b7280'
                    }}>
                      {activity.result_text}{activity.is_best_record ? ' 🏆' : ''}
                    </Text>
                  </View>
                  
                  <Text style={{
                    fontSize: fontSize - 2,
                    color: '#9ca3af'
                  }}>
                    {new Date(activity.test_date).toLocaleDateString()}
                  </Text>
                </View>
              ))}
              
              <Pressable
                style={{
                  marginTop: 16,
                  padding: 12,
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  alignItems: 'center'
                }}
                onPress={() => setActiveTab('workouts')}
              >
                <Text style={{
                  fontSize: fontSize,
                  fontWeight: '600',
                  color: '#3b82f6'
                }}>
                  View All Results
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 40
            }}>
              <Feather name="activity" size={32} color="#9ca3af" />
              <Text style={{
                fontSize: fontSize,
                color: '#6b7280',
                marginTop: 12,
                textAlign: 'center'
              }}>
                No test results yet
              </Text>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#9ca3af',
                textAlign: 'center',
                marginTop: 4
              }}>
                Your trainer will add fitness test results here
              </Text>
            </View>
          )}
        </View>

      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {renderScreen()}
      
      {/* Floating Bottom Navigation */}
      <FloatingBottomNav 
        activeTab={activeTab}
        onTabPress={handleTabPress}
        userRole="athlete"
      />
    </View>
  );
}
