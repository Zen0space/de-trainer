import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, ScrollView, Alert, RefreshControl } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { FloatingBottomNav, renderScreenFromRoute, getRoutes } from '../../components/ui/FloatingBottomNav';
import { ManageAthletesScreen } from './ManageAthletesScreen';
import { AthleteDetailsScreen } from './AthleteDetailsScreen';
import { tursoDbHelpers } from '../../lib/turso-database';

export function TrainerHomeScreen() {
  const { user, logout } = useSession();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('home');
  const [showManageAthletes, setShowManageAthletes] = useState(false);
  const [showAthleteProfile, setShowAthleteProfile] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  
  // Dashboard data state
  const [stats, setStats] = useState({
    totalAthletes: 0,
    activeSessions: 0,
    completedSessions: 0,
    avgProgress: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
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
  const bottomNavHeight = (isSmallScreen ? 70 : isTablet ? 90 : 80) + 32; // nav height + buffer - SafeAreaView handles safe area

  // Fetch dashboard data from database
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async (isRefreshAction = false) => {
    if (!user?.id) return;
    
    if (isRefreshAction) {
      setIsRefreshing(true);
    } else {
      setIsLoadingDashboard(true);
    }
    try {
      
      // Fetch total enrolled athletes
      const totalAthletesResult = await tursoDbHelpers.get(`
        SELECT COUNT(*) as count
        FROM enrollments e
        WHERE e.trainer_id = ? AND e.status = 'approved'
      `, [user.id]);
      
      // Fetch active sessions (recent tests in last 7 days)
      const activeSessionsResult = await tursoDbHelpers.get(`
        SELECT COUNT(DISTINCT tr.athlete_id) as count
        FROM test_results tr
        JOIN enrollments e ON tr.athlete_id = e.athlete_id
        WHERE e.trainer_id = ? AND e.status = 'approved'
        AND tr.test_date >= date('now', '-7 days')
      `, [user.id]);
      
      // Fetch total completed sessions (total test results)
      const completedSessionsResult = await tursoDbHelpers.get(`
        SELECT COUNT(*) as count
        FROM test_results tr
        JOIN enrollments e ON tr.athlete_id = e.athlete_id
        WHERE e.trainer_id = ? AND e.status = 'approved'
      `, [user.id]);
      
      // Calculate average progress (simplified - based on personal best percentage)
      const progressResult = await tursoDbHelpers.get(`
        SELECT 
          CASE 
            WHEN COUNT(*) > 0 
            THEN ROUND((SUM(CASE WHEN tr.is_best_record = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 0)
            ELSE 0 
          END as avg_progress
        FROM test_results tr
        JOIN enrollments e ON tr.athlete_id = e.athlete_id
        WHERE e.trainer_id = ? AND e.status = 'approved'
        AND tr.test_date >= date('now', '-30 days')
      `, [user.id]);

      // Fetch recent activities
      const activities = await tursoDbHelpers.all(`
        SELECT 
          u.full_name as athlete_name,
          t.name as test_name,
          tr.test_date,
          tr.is_best_record,
          'test_completed' as activity_type
        FROM test_results tr
        JOIN users u ON tr.athlete_id = u.id
        JOIN tests t ON tr.test_id = t.id
        JOIN enrollments e ON tr.athlete_id = e.athlete_id
        WHERE e.trainer_id = ? AND e.status = 'approved'
        
        UNION ALL
        
        SELECT 
          u.full_name as athlete_name,
          'Enrolled with you' as test_name,
          e.responded_at as test_date,
          0 as is_best_record,
          'enrollment' as activity_type
        FROM enrollments e
        JOIN users u ON e.athlete_id = u.id
        WHERE e.trainer_id = ? AND e.status = 'approved'
        AND e.responded_at >= date('now', '-7 days')
        
        ORDER BY test_date DESC
        LIMIT 5
      `, [user.id, user.id]);

      // Format activities for display
      const formattedActivities = activities.map((activity: any, index: number) => ({
        id: index + 1,
        athlete: activity.athlete_name,
        action: activity.activity_type === 'enrollment' 
          ? 'Enrolled with you'
          : activity.is_best_record 
            ? `New PR in ${activity.test_name}`
            : `Completed ${activity.test_name}`,
        time: formatTimeAgo(activity.test_date),
        type: activity.is_best_record || activity.activity_type === 'enrollment' ? 'success' : 'info'
      })).slice(0, 3); // Show only top 3

      setStats({
        totalAthletes: totalAthletesResult?.count || 0,
        activeSessions: activeSessionsResult?.count || 0,
        completedSessions: completedSessionsResult?.count || 0,
        avgProgress: progressResult?.avg_progress || 0
      });
      
      setRecentActivities(formattedActivities);
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoadingDashboard(false);
      setIsRefreshing(false);
    }
  };

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const quickActions = [
    { id: 1, title: 'Manage Athletes', icon: 'users', color: '#3b82f6' },
    { id: 2, title: 'Create Workout', icon: 'plus-circle', color: '#10b981' },
    { id: 3, title: 'View Analytics', icon: 'bar-chart-2', color: '#f59e0b' },
    { id: 4, title: 'Schedule Session', icon: 'calendar', color: '#8b5cf6' },
  ];

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    // Close any open screens when switching tabs
    setShowManageAthletes(false);
    setShowAthleteProfile(false);
    setSelectedAthleteId(null);
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    fetchDashboardData(true);
  };

  // Navigation handlers
  const handleNavigateToAthleteProfile = (athleteId: number) => {
    setSelectedAthleteId(athleteId);
    setShowAthleteProfile(true);
    setShowManageAthletes(false);
  };

  const handleBackFromAthleteProfile = () => {
    setShowAthleteProfile(false);
    setSelectedAthleteId(null);
    setShowManageAthletes(true);
  };

  // Render different screens based on active tab
  const renderScreen = () => {
    // Show AthleteDetailsScreen if requested
    if (showAthleteProfile && selectedAthleteId) {
      return (
        <AthleteDetailsScreen 
          athleteId={selectedAthleteId} 
          onBack={handleBackFromAthleteProfile} 
        />
      );
    }

    // Show ManageAthletesScreen if requested
    if (showManageAthletes) {
      return (
        <ManageAthletesScreen 
          onBack={() => setShowManageAthletes(false)}
          onNavigateToAthleteProfile={handleNavigateToAthleteProfile}
        />
      );
    }

    // Use the new routing system for non-home screens
    if (activeTab !== 'home') {
      const customProps = {
        onBack: () => setActiveTab('home'), // Universal back handler
        // Add any other common props here
      };
      
      const screen = renderScreenFromRoute(activeTab, 'trainer', customProps);
      if (screen) {
        return screen;
      }
    }
    
    // Default to home screen
    return renderHomeScreen();
  };

  const renderPlaceholderScreen = (title: string, icon: string, description: string) => (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#f3f3f3',
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
            padding: cardPadding,
            borderRadius: 16,
            marginBottom: spacing,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: titleFontSize,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 4
                }}>
                  Dashboard
                </Text>
                <View style={{
                  backgroundColor: '#dbeafe',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  alignSelf: 'flex-start'
                }}>
                  <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '600' }}>
                    CERTIFIED TRAINER
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

          {/* Stats Cards - Horizontal Scroll */}
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 4,
              paddingVertical: 4,
              gap: 12,
            }}
            style={{ 
              marginBottom: spacing,
              height: isSmallScreen ? 70 : 75
            }}
          >
            <View style={{
              width: isSmallScreen ? 110 : 130,
              backgroundColor: 'white',
              padding: isSmallScreen ? 12 : 16,
              borderRadius: 12,
            }}>
              <Text style={{ 
                fontSize: isSmallScreen ? 20 : 22, 
                fontWeight: 'bold', 
                color: '#3b82f6', 
                marginBottom: 4 
              }}>
                {isLoadingDashboard ? '...' : stats.totalAthletes}
              </Text>
              <Text style={{ 
                fontSize: isSmallScreen ? 11 : 12, 
                color: '#6b7280',
                lineHeight: 16
              }}>
                Total Athletes
              </Text>
            </View>
            
            <View style={{
              width: isSmallScreen ? 110 : 130,
              backgroundColor: 'white',
              padding: isSmallScreen ? 12 : 16,
              borderRadius: 12,
            }}>
              <Text style={{ 
                fontSize: isSmallScreen ? 20 : 22, 
                fontWeight: 'bold', 
                color: '#10b981', 
                marginBottom: 4 
              }}>
                {isLoadingDashboard ? '...' : stats.activeSessions}
              </Text>
              <Text style={{ 
                fontSize: isSmallScreen ? 11 : 12, 
                color: '#6b7280',
                lineHeight: 16
              }}>
                Active Sessions
              </Text>
            </View>
            
            <View style={{
              width: isSmallScreen ? 110 : 130,
              backgroundColor: 'white',
              padding: isSmallScreen ? 12 : 16,
              borderRadius: 12,
            }}>
              <Text style={{ 
                fontSize: isSmallScreen ? 20 : 22, 
                fontWeight: 'bold', 
                color: '#f59e0b', 
                marginBottom: 4 
              }}>
                {isLoadingDashboard ? '...' : stats.completedSessions}
              </Text>
              <Text style={{ 
                fontSize: isSmallScreen ? 11 : 12, 
                color: '#6b7280',
                lineHeight: 16
              }}>
                Completed
              </Text>
            </View>
            
            <View style={{
              width: isSmallScreen ? 110 : 130,
              backgroundColor: 'white',
              padding: isSmallScreen ? 12 : 16,
              borderRadius: 12,
            }}>
              <Text style={{ 
                fontSize: isSmallScreen ? 20 : 22, 
                fontWeight: 'bold', 
                color: '#8b5cf6', 
                marginBottom: 4 
              }}>
                {isLoadingDashboard ? '...' : `${stats.avgProgress}%`}
              </Text>
              <Text style={{ 
                fontSize: isSmallScreen ? 11 : 12, 
                color: '#6b7280',
                lineHeight: 16
              }}>
                Avg Progress
              </Text>
            </View>
          </ScrollView>

          {/* Quick Actions */}
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 16,
            marginBottom: spacing,
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
                    backgroundColor: '#f3f3f3',
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#e5e7eb'
                  }}
                  onPress={() => {
                    if (action.title === 'Manage Athletes') {
                      setShowManageAthletes(true);
                    } else if (action.title === 'View Analytics') {
                      setActiveTab('reports');
                    } else if (action.title === 'Create Workout') {
                      Alert.alert(
                        'Create Workout',
                        'Workout creation feature is coming soon! Stay tuned for updates.',
                        [{ text: 'OK' }]
                      );
                    } else if (action.title === 'Schedule Session') {
                      Alert.alert(
                        'Schedule Session',
                        'Session scheduling feature is coming soon! Stay tuned for updates.',
                        [{ text: 'OK' }]
                      );
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
          }}>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 16
            }}>
              Recent Activity
            </Text>
            
            {isLoadingDashboard ? (
              // Loading state
              Array.from({ length: 3 }).map((_, index) => (
                <View
                  key={`loading-${index}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: index < 2 ? 1 : 0,
                    borderBottomColor: '#f3f4f6'
                  }}
                >
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#e5e7eb',
                    marginRight: 12
                  }} />
                  
                  <View style={{ flex: 1 }}>
                    <View style={{
                      height: 16,
                      backgroundColor: '#e5e7eb',
                      borderRadius: 4,
                      marginBottom: 4,
                      width: '60%'
                    }} />
                    <View style={{
                      height: 14,
                      backgroundColor: '#f3f4f6',
                      borderRadius: 4,
                      width: '40%'
                    }} />
                  </View>
                  
                  <View style={{
                    height: 12,
                    backgroundColor: '#f3f4f6',
                    borderRadius: 4,
                    width: 60
                  }} />
                </View>
              ))
            ) : recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <View
                  key={activity.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: index < recentActivities.length - 1 ? 1 : 0,
                    borderBottomColor: '#f3f4f6'
                  }}
                >
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: activity.type === 'success' ? '#10b981' : activity.type === 'warning' ? '#f59e0b' : '#6b7280',
                    marginRight: 12
                  }} />
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: fontSize,
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: 2
                    }}>
                      {activity.athlete}
                    </Text>
                    <Text style={{
                      fontSize: fontSize - 2,
                      color: '#6b7280'
                    }}>
                      {activity.action}
                    </Text>
                  </View>
                  
                  <Text style={{
                    fontSize: fontSize - 2,
                    color: '#9ca3af'
                  }}>
                    {activity.time}
                  </Text>
                </View>
              ))
            ) : (
              // Empty state
              <View style={{
                alignItems: 'center',
                paddingVertical: 32
              }}>
                <Feather name="activity" size={32} color="#9ca3af" />
                <Text style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  marginTop: 12,
                  textAlign: 'center'
                }}>
                  No recent activities
                </Text>
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#9ca3af',
                  textAlign: 'center',
                  marginTop: 4
                }}>
                  Activities will appear here when athletes complete tests
                </Text>
              </View>
            )}
            
            <Pressable
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: '#f3f3f3',
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => {
                // TODO: Navigate to full activity log

              }}
            >
              <Text style={{
                fontSize: fontSize,
                fontWeight: '600',
                color: '#3b82f6'
              }}>
                View All Activities
              </Text>
            </Pressable>
          </View>

        </View>
      </ScrollView>
  );

  return (
    <View style={{ flex: 1 }}>
      {renderScreen()}
      
      {/* Floating Bottom Navigation */}
      <FloatingBottomNav 
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />
    </View>
  );
}
