import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, ScrollView } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { FloatingBottomNav } from '../../components/ui/FloatingBottomNav';
import { TrainingLogScreen } from './TrainingLogScreen';
import { SettingsScreen } from './SettingsScreen';
import { ManageAthletesScreen } from './ManageAthletesScreen';
import { AthleteDetailsScreen } from './AthleteDetailsScreen';

export function TrainerHomeScreen() {
  const { user, logout } = useSession();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('home');
  const [showManageAthletes, setShowManageAthletes] = useState(false);
  const [showAthleteProfile, setShowAthleteProfile] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  
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

  // Mock data - in real app this would come from API
  const stats = {
    totalAthletes: 12,
    activeSessions: 3,
    completedSessions: 45,
    avgProgress: 78
  };

  const recentActivities = [
    { id: 1, athlete: 'John Smith', action: 'Completed workout', time: '2 hours ago', type: 'success' },
    { id: 2, athlete: 'Sarah Johnson', action: 'Missed session', time: '1 day ago', type: 'warning' },
    { id: 3, athlete: 'Mike Davis', action: 'New PR achieved', time: '2 days ago', type: 'success' },
  ];

  const quickActions = [
    { id: 1, title: 'Manage Athletes', icon: 'users', color: '#3b82f6' },
    { id: 2, title: 'Create Workout', icon: 'plus-circle', color: '#10b981' },
    { id: 3, title: 'View Analytics', icon: 'bar-chart-2', color: '#f59e0b' },
    { id: 4, title: 'Schedule Session', icon: 'calendar', color: '#8b5cf6' },
  ];

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    console.log(`Navigate to ${tab} tab`);
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

    switch (activeTab) {
      case 'training':
        return <TrainingLogScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'reports':
        // TODO: Implement ReportsScreen
        return renderPlaceholderScreen('Reports', 'bar-chart-2', 'Analytics and performance reports coming soon!');
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
                  {stats.totalAthletes}
                </Text>
                <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Total Athletes</Text>
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
                  {stats.activeSessions}
                </Text>
                <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Active Sessions</Text>
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
                  {stats.completedSessions}
                </Text>
                <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Completed</Text>
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
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#8b5cf6', marginBottom: 4 }}>
                  {stats.avgProgress}%
                </Text>
                <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>Avg Progress</Text>
              </View>
            </View>
          </View>

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
                    if (action.title === 'Manage Athletes') {
                      setShowManageAthletes(true);
                    } else {
                      // TODO: Navigate to respective screens
                      console.log(`Navigate to ${action.title}`);
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
              Recent Activity
            </Text>
            
            {recentActivities.map((activity, index) => (
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
                  backgroundColor: activity.type === 'success' ? '#10b981' : '#f59e0b',
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
            ))}
            
            <Pressable
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => {
                // TODO: Navigate to full activity log
                console.log('View all activities');
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
