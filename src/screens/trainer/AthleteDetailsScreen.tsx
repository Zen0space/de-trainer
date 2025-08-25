import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ScrollView, RefreshControl } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { tursoDbHelpers } from '../../lib/turso-database';

interface AthleteProfile {
  id: number;
  full_name: string;
  email: string;
  sport: string;
  level: string;
  created_at: string;
  is_verified: boolean;
  enrollment_date?: string;
  enrollment_notes?: string;
}

interface TrainingLog {
  id: number;
  test_name: string;
  component_name: string;
  result_value: number | null;
  result_text: string | null;
  test_date: string;
  unit: string;
  notes: string | null;
  is_best_record: boolean;
  improvement_direction: 'higher' | 'lower';
}

interface TrainingStats {
  total_tests: number;
  recent_tests: number;
  best_records: number;
  improvement_percentage: number;
}

export function AthleteDetailsScreen({ 
  athleteId, 
  onBack 
}: { 
  athleteId: number; 
  onBack: () => void; 
}) {
  const { user } = useSession();
  const { width } = useWindowDimensions();
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const cardPadding = isSmallScreen ? 16 : isTablet ? 24 : 20;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;
  
  // Bottom navigation height for content padding (consistent with TrainerHomeScreen)
  const bottomNavHeight = (isSmallScreen ? 70 : isTablet ? 90 : 80) + 32; // nav height + buffer

  // State management
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'logs'>('profile');
  const [sortBy, setSortBy] = useState<'date' | 'test' | 'result'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch athlete data
  const fetchAthleteData = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Get athlete profile
      const profile = await tursoDbHelpers.get(`
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.created_at,
          u.is_verified,
          a.sport,
          a.level,
          e.requested_at as enrollment_date,
          e.notes as enrollment_notes
        FROM users u
        JOIN athletes a ON u.id = a.user_id
        LEFT JOIN enrollments e ON e.athlete_id = u.id AND e.trainer_id = ? AND e.status = 'approved'
        WHERE u.id = ? AND u.role = 'athlete'
      `, [user.id, athleteId]);

      if (!profile) {
        Alert.alert('Error', 'Athlete not found or not enrolled with you.');
        onBack();
        return;
      }

      // Get training logs with test and component info
      const logs = await tursoDbHelpers.all(`
        SELECT 
          tr.id,
          tr.result_value,
          tr.result_text,
          tr.test_date,
          tr.notes,
          tr.is_best_record,
          tr.input_unit,
          t.name as test_name,
          t.unit,
          t.improvement_direction,
          fc.name as component_name
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        JOIN fitness_components fc ON t.component_id = fc.id
        WHERE tr.athlete_id = ?
        ORDER BY tr.test_date DESC, tr.created_at DESC
      `, [athleteId]);

      // Calculate training stats
      const totalTests = logs?.length || 0;
      const recentTests = logs?.filter(log => {
        const testDate = new Date(log.test_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return testDate >= thirtyDaysAgo;
      }).length || 0;
      const bestRecords = logs?.filter(log => log.is_best_record).length || 0;

      // Calculate improvement percentage (simplified - based on recent vs older records)
      let improvementPercentage = 0;
      if (totalTests > 1) {
        const recentAvg = logs?.slice(0, Math.min(5, totalTests)).reduce((sum, log) => 
          sum + (log.result_value || 0), 0) / Math.min(5, totalTests) || 0;
        const olderAvg = logs?.slice(-Math.min(5, totalTests)).reduce((sum, log) => 
          sum + (log.result_value || 0), 0) / Math.min(5, totalTests) || 0;
        
        if (olderAvg > 0) {
          improvementPercentage = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
        }
      }

      const stats: TrainingStats = {
        total_tests: totalTests,
        recent_tests: recentTests,
        best_records: bestRecords,
        improvement_percentage: improvementPercentage
      };

      console.log('👤 Athlete profile loaded:', profile);
      console.log('📊 Training logs loaded:', logs?.length || 0);
      console.log('📈 Training stats:', stats);

      setAthleteProfile(profile);
      setTrainingLogs(logs || []);
      setTrainingStats(stats);
    } catch (error) {
      console.error('❌ Error fetching athlete data:', error);
      Alert.alert('Error', 'Failed to load athlete data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAthleteData();
  }, [athleteId, user?.id]);

  // Handle refresh
  const onRefresh = () => {
    fetchAthleteData(true);
  };

  // Sort training logs
  const sortedLogs = [...trainingLogs].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.test_date).getTime() - new Date(b.test_date).getTime();
        break;
      case 'test':
        comparison = a.test_name.localeCompare(b.test_name);
        break;
      case 'result':
        const aValue = a.result_value || 0;
        const bValue = b.result_value || 0;
        comparison = aValue - bValue;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get verification badge
  const getVerificationBadge = () => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: athleteProfile?.is_verified ? '#f0fdf4' : '#fef3c7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: athleteProfile?.is_verified ? '#dcfce7' : '#fde68a'
    }}>
      <Feather 
        name={athleteProfile?.is_verified ? "check-circle" : "alert-circle"} 
        size={14} 
        color={athleteProfile?.is_verified ? "#10b981" : "#f59e0b"} 
      />
      <Text style={{
        fontSize: fontSize - 2,
        fontWeight: '600',
        color: athleteProfile?.is_verified ? '#059669' : '#d97706',
        marginLeft: 4
      }}>
        {athleteProfile?.is_verified ? 'Verified' : 'Unverified'}
      </Text>
    </View>
  );

  // Tab Button Component
  const TabButton = ({ id, label, isActive, onPress }: {
    id: string;
    label: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: isActive ? '#3b82f6' : 'transparent',
        borderRadius: 8,
        alignItems: 'center',
      }}
    >
      <Text style={{
        fontSize: fontSize,
        fontWeight: isActive ? '600' : '400',
        color: isActive ? 'white' : '#6b7280',
      }}>
        {label}
      </Text>
    </Pressable>
  );

  // Training Log Card Component
  const TrainingLogCard = ({ log }: { log: TrainingLog }) => (
    <View style={{
      backgroundColor: 'white',
      padding: cardPadding,
      borderRadius: 12,
      marginBottom: spacing,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      borderLeftWidth: log.is_best_record ? 4 : 0,
      borderLeftColor: log.is_best_record ? '#10b981' : 'transparent',
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: fontSize,
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: 2
          }}>
            {log.test_name}
          </Text>
          <Text style={{
            fontSize: fontSize - 2,
            color: '#6b7280',
            marginBottom: 4
          }}>
            {log.component_name} • {formatDate(log.test_date)}
          </Text>
        </View>
        
        {log.is_best_record && (
          <View style={{
            backgroundColor: '#f0fdf4',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Feather name="award" size={12} color="#10b981" />
            <Text style={{
              fontSize: fontSize - 3,
              color: '#059669',
              fontWeight: '600',
              marginLeft: 4
            }}>
              BEST
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{
          fontSize: fontSize + 2,
          fontWeight: 'bold',
          color: log.is_best_record ? '#10b981' : '#1f2937'
        }}>
          {log.result_value ? `${log.result_value} ${log.unit}` : log.result_text}
        </Text>
        
        <View style={{
          backgroundColor: '#f3f4f6',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 6
        }}>
          <Text style={{
            fontSize: fontSize - 2,
            color: '#6b7280',
            fontWeight: '500'
          }}>
            {log.improvement_direction === 'higher' ? '↑' : '↓'} Better
          </Text>
        </View>
      </View>

      {log.notes && (
        <Text style={{
          fontSize: fontSize - 1,
          color: '#6b7280',
          fontStyle: 'italic',
          lineHeight: 20
        }}>
          "{log.notes}"
        </Text>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: containerPadding,
          paddingBottom: containerPadding + bottomNavHeight
        }}>
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <Feather name="loader" size={32} color="#6b7280" />
            <Text style={{
              fontSize: fontSize,
              color: '#6b7280',
              marginTop: 16,
              textAlign: 'center'
            }}>
              Loading athlete details...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!athleteProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: containerPadding,
          paddingBottom: containerPadding + bottomNavHeight
        }}>
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}>
            <Feather name="alert-circle" size={32} color="#ef4444" />
            <Text style={{
              fontSize: fontSize,
              color: '#ef4444',
              marginTop: 16,
              textAlign: 'center'
            }}>
              Athlete not found
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Pressable
                onPress={onBack}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#f3f4f6'
                }}
              >
                <Feather name="arrow-left" size={20} color="#6b7280" />
              </Pressable>
              
              <Text style={{
                fontSize: titleFontSize,
                fontWeight: 'bold',
                color: '#1f2937',
                flex: 1,
                textAlign: 'center'
              }}>
                Athlete Details
              </Text>
              
              <View style={{ width: 36 }} />
            </View>

            {/* Athlete Basic Info */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 70,
                height: 70,
                backgroundColor: '#3b82f6',
                borderRadius: 35,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16
              }}>
                <Text style={{ fontSize: 24, color: 'white', fontWeight: 'bold' }}>
                  {athleteProfile.full_name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: fontSize + 2,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 4
                }}>
                  {athleteProfile.full_name}
                </Text>
                <Text style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  marginBottom: 8
                }}>
                  {athleteProfile.email}
                </Text>
                {getVerificationBadge()}
              </View>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={{
            backgroundColor: 'white',
            padding: 4,
            borderRadius: 12,
            marginBottom: spacing,
            flexDirection: 'row',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <TabButton
              id="profile"
              label="Profile"
              isActive={activeTab === 'profile'}
              onPress={() => setActiveTab('profile')}
            />
            <TabButton
              id="logs"
              label={`Training Logs (${trainingLogs.length})`}
              isActive={activeTab === 'logs'}
              onPress={() => setActiveTab('logs')}
            />
          </View>

          {/* Content */}
          {activeTab === 'profile' ? (
            <>
              {/* Training Stats */}
              {trainingStats && (
                <View style={{
                  backgroundColor: 'white',
                  padding: cardPadding,
                  borderRadius: 16,
                  marginBottom: spacing,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <Text style={{
                    fontSize: fontSize + 1,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: 16
                  }}>
                    Training Statistics
                  </Text>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: fontSize + 4, fontWeight: 'bold', color: '#3b82f6' }}>
                        {trainingStats.total_tests}
                      </Text>
                      <Text style={{ fontSize: fontSize - 2, color: '#6b7280', textAlign: 'center' }}>
                        Total Tests
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: fontSize + 4, fontWeight: 'bold', color: '#10b981' }}>
                        {trainingStats.recent_tests}
                      </Text>
                      <Text style={{ fontSize: fontSize - 2, color: '#6b7280', textAlign: 'center' }}>
                        Recent (30d)
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: fontSize + 4, fontWeight: 'bold', color: '#f59e0b' }}>
                        {trainingStats.best_records}
                      </Text>
                      <Text style={{ fontSize: fontSize - 2, color: '#6b7280', textAlign: 'center' }}>
                        Best Records
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Sport & Level */}
              <View style={{
                backgroundColor: 'white',
                padding: cardPadding,
                borderRadius: 16,
                marginBottom: spacing,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}>
                <Text style={{
                  fontSize: fontSize + 1,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 12
                }}>
                  Athletic Information
                </Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{
                      fontSize: fontSize - 1,
                      color: '#6b7280',
                      marginBottom: 4
                    }}>
                      Sport
                    </Text>
                    <View style={{
                      backgroundColor: '#f0fdf4',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#dcfce7'
                    }}>
                      <Text style={{
                        fontSize: fontSize,
                        fontWeight: '600',
                        color: '#059669',
                        textAlign: 'center'
                      }}>
                        {athleteProfile.sport}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{
                      fontSize: fontSize - 1,
                      color: '#6b7280',
                      marginBottom: 4
                    }}>
                      Level
                    </Text>
                    <View style={{
                      backgroundColor: '#fefbf2',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#fde68a'
                    }}>
                      <Text style={{
                        fontSize: fontSize,
                        fontWeight: '600',
                        color: '#d97706',
                        textAlign: 'center',
                        textTransform: 'capitalize'
                      }}>
                        {athleteProfile.level}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Account Details */}
              <View style={{
                backgroundColor: 'white',
                padding: cardPadding,
                borderRadius: 16,
                marginBottom: spacing,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}>
                <Text style={{
                  fontSize: fontSize + 1,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 12
                }}>
                  Account Details
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Feather name="calendar" size={18} color="#6b7280" />
                  <Text style={{
                    fontSize: fontSize,
                    color: '#6b7280',
                    marginLeft: 8
                  }}>
                    Joined: {formatDate(athleteProfile.created_at)}
                  </Text>
                </View>
                
                {athleteProfile.enrollment_date && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="user-plus" size={18} color="#6b7280" />
                    <Text style={{
                      fontSize: fontSize,
                      color: '#6b7280',
                      marginLeft: 8
                    }}>
                      Enrolled: {formatDate(athleteProfile.enrollment_date)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Enrollment Notes */}
              {athleteProfile.enrollment_notes && (
                <View style={{
                  backgroundColor: 'white',
                  padding: cardPadding,
                  borderRadius: 16,
                  marginBottom: spacing,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <Text style={{
                    fontSize: fontSize + 1,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: 12
                  }}>
                    Enrollment Notes
                  </Text>
                  
                  <Text style={{
                    fontSize: fontSize,
                    color: '#6b7280',
                    lineHeight: 22
                  }}>
                    {athleteProfile.enrollment_notes}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Training Logs Section */}
              {trainingLogs.length > 0 ? (
                <>
                  {/* Sort Controls */}
                  <View style={{
                    backgroundColor: 'white',
                    padding: cardPadding,
                    borderRadius: 16,
                    marginBottom: spacing,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}>
                    <Text style={{
                      fontSize: fontSize,
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: 12
                    }}>
                      Sort by:
                    </Text>
                    
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { key: 'date', label: 'Date' },
                        { key: 'test', label: 'Test' },
                        { key: 'result', label: 'Result' }
                      ].map(({ key, label }) => (
                        <Pressable
                          key={key}
                          onPress={() => {
                            if (sortBy === key) {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortBy(key as any);
                              setSortOrder('desc');
                            }
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor: sortBy === key ? '#3b82f6' : '#f3f4f6',
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}
                        >
                          <Text style={{
                            fontSize: fontSize - 1,
                            color: sortBy === key ? 'white' : '#6b7280',
                            fontWeight: sortBy === key ? '600' : '400'
                          }}>
                            {label}
                          </Text>
                          {sortBy === key && (
                            <Feather 
                              name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
                              size={14} 
                              color="white" 
                              style={{ marginLeft: 4 }}
                            />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Training Logs List */}
                  {sortedLogs.map((log) => (
                    <TrainingLogCard key={log.id} log={log} />
                  ))}
                </>
              ) : (
                /* No Training Logs */
                <View style={{
                  backgroundColor: 'white',
                  padding: cardPadding,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 300,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
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
                    <Feather name="activity" size={36} color="#9ca3af" />
                  </View>
                  
                  <Text style={{
                    fontSize: fontSize + 2,
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: 8,
                    textAlign: 'center'
                  }}>
                    No Training Logs Yet
                  </Text>
                  
                  <Text style={{
                    fontSize: fontSize,
                    color: '#6b7280',
                    textAlign: 'center',
                    lineHeight: 22,
                    maxWidth: 280
                  }}>
                    This athlete doesn't have any training logs yet. Start adding fitness test results to track their progress.
                  </Text>
                </View>
              )}
            </>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
