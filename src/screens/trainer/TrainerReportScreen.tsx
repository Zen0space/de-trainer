import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ScrollView, KeyboardAvoidingView, RefreshControl } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { tursoDbHelpers } from '../../lib/turso-database';
import { useKeyboardAware } from '../../hooks/useKeyboardAware';
import { AthleteDetailReportScreen } from './AthleteDetailReportScreen';

// Types for the athlete listing functionality
interface Athlete {
  id: number;
  full_name: string;
  email: string;
  sport: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  enrollment_date: string;
  total_tests: number;
  last_test_date: string | null;
  best_records: number;
}

interface AthleteStats {
  total_athletes: number;
  active_athletes: number;
  recent_activity: number;
}

export function TrainerReportScreen({ onBack }: { onBack: () => void }) {
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

  // Keyboard-aware scrolling
  const { keyboardAvoidingViewProps, scrollViewProps } = useKeyboardAware({ containerPadding });

  // State management
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [filteredAthletes, setFilteredAthletes] = useState<Athlete[]>([]);
  const [athleteStats, setAthleteStats] = useState<AthleteStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);

  // Fetch enrolled athletes with statistics
  useEffect(() => {
    fetchAthletes();
  }, [user?.id]);

  const fetchAthletes = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch enrolled athletes with test statistics
      const enrolledAthletes = await tursoDbHelpers.all(`
        SELECT 
          u.id,
          u.full_name,
          u.email,
          a.sport,
          a.level,
          e.requested_at as enrollment_date,
          COUNT(tr.id) as total_tests,
          MAX(tr.test_date) as last_test_date,
          SUM(CASE WHEN tr.is_best_record = 1 THEN 1 ELSE 0 END) as best_records
        FROM enrollments e
        JOIN users u ON e.athlete_id = u.id
        JOIN athletes a ON a.user_id = u.id
        LEFT JOIN test_results tr ON tr.athlete_id = u.id
        WHERE e.trainer_id = ? AND e.status = 'approved'
        GROUP BY u.id, u.full_name, u.email, a.sport, a.level, e.requested_at
        ORDER BY u.full_name
      `, [user.id]);

      const athleteData = (enrolledAthletes || []).map((athlete: any) => ({
        ...athlete,
        total_tests: athlete.total_tests || 0,
        best_records: athlete.best_records || 0
      }));

      setAthletes(athleteData);
      setFilteredAthletes(athleteData);

      // Calculate statistics
      const stats: AthleteStats = {
        total_athletes: athleteData.length,
        active_athletes: athleteData.filter(a => a.last_test_date && 
          new Date(a.last_test_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
        recent_activity: athleteData.filter(a => a.last_test_date && 
          new Date(a.last_test_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      };
      setAthleteStats(stats);

    } catch (error) {
      console.error('❌ Error fetching athletes:', error);
      Alert.alert('Error', 'Failed to load athletes. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAthletes(athletes);
    } else {
      const filtered = athletes.filter(athlete =>
        athlete.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athlete.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athlete.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAthletes(filtered);
    }
  }, [searchQuery, athletes]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No activity';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getActivityStatus = (lastTestDate: string | null) => {
    if (!lastTestDate) return 'inactive';
    const daysSinceTest = Math.floor((Date.now() - new Date(lastTestDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceTest <= 7) return 'active';
    if (daysSinceTest <= 30) return 'moderate';
    return 'inactive';
  };

  // Show athlete detail report if selected
  if (selectedAthleteId) {
    return (
      <AthleteDetailReportScreen 
        athleteId={selectedAthleteId} 
        onBack={() => setSelectedAthleteId(null)} 
      />
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <Feather name="loader" size={32} color="#6b7280" />
        <Text style={{ fontSize: fontSize, color: '#6b7280', marginTop: 16 }}>
          Loading athletes...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <KeyboardAvoidingView {...keyboardAvoidingViewProps}>
        <ScrollView
          {...scrollViewProps}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchAthletes(true)}
              tintColor="#10b981"
              colors={['#10b981']}
            />
          }
        >
          <View style={{ maxWidth: isTablet ? 1000 : 600, alignSelf: 'center', width: '100%' }}>
            
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
                    My Athletes
                  </Text>
                  <Text style={{ color: '#6b7280', fontSize: fontSize - 2 }}>
                    Manage and track athlete progress
                  </Text>
                </View>
                
                <View style={{
                  width: 40,
                  height: 40,
                  backgroundColor: '#10b981',
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Feather name="users" size={20} color="white" />
                </View>
              </View>

              {/* Search Bar */}
              <Input
                placeholder="Search athletes by name, sport, or email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Statistics Overview */}
            {athleteStats && (
              <View style={{ 
                flexDirection: isSmallScreen ? 'column' : 'row', 
                gap: spacing,
                marginBottom: spacing 
              }}>
                <View style={{
                  flex: 1,
                  backgroundColor: 'white',
                  padding: cardPadding,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Feather name="users" size={20} color="#3b82f6" />
                    <Text style={{
                      fontSize: fontSize - 2,
                      color: '#6b7280',
                      marginLeft: 8,
                      fontWeight: '600'
                    }}>
                      Total Athletes
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: fontSize + 8,
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>
                    {athleteStats.total_athletes}
                  </Text>
                </View>

                <View style={{
                  flex: 1,
                  backgroundColor: 'white',
                  padding: cardPadding,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Feather name="activity" size={20} color="#10b981" />
                    <Text style={{
                      fontSize: fontSize - 2,
                      color: '#6b7280',
                      marginLeft: 8,
                      fontWeight: '600'
                    }}>
                      Active (30d)
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: fontSize + 8,
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>
                    {athleteStats.active_athletes}
                  </Text>
                </View>

                <View style={{
                  flex: 1,
                  backgroundColor: 'white',
                  padding: cardPadding,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Feather name="trending-up" size={20} color="#f59e0b" />
                    <Text style={{
                      fontSize: fontSize - 2,
                      color: '#6b7280',
                      marginLeft: 8,
                      fontWeight: '600'
                    }}>
                      Recent (7d)
                    </Text>
                  </View>
                  <Text style={{
                    fontSize: fontSize + 8,
                    fontWeight: 'bold',
                    color: '#1f2937'
                  }}>
                    {athleteStats.recent_activity}
                  </Text>
                </View>
              </View>
            )}

            {/* Athletes List */}
            {filteredAthletes.length > 0 ? (
              <View style={{
                backgroundColor: 'white',
                borderRadius: 16,
                marginBottom: spacing,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
                overflow: 'hidden'
              }}>
                {filteredAthletes.map((athlete, index) => {
                  const activityStatus = getActivityStatus(athlete.last_test_date);
                  const statusColor = activityStatus === 'active' ? '#10b981' : 
                                    activityStatus === 'moderate' ? '#f59e0b' : '#ef4444';
                  
                  return (
                    <Pressable
                      key={athlete.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: cardPadding,
                        borderBottomWidth: index < filteredAthletes.length - 1 ? 1 : 0,
                        borderBottomColor: '#f3f4f6',
                        backgroundColor: 'white'
                      }}
                      onPress={() => {
                        setSelectedAthleteId(athlete.id);
                      }}
                    >
                      {/* Profile Avatar */}
                      <View style={{
                        width: 60,
                        height: 60,
                        backgroundColor: getLevelColor(athlete.level),
                        borderRadius: 30,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 16
                      }}>
                        <Text style={{
                          fontSize: fontSize + 4,
                          color: 'white',
                          fontWeight: 'bold'
                        }}>
                          {getInitials(athlete.full_name)}
                        </Text>
                      </View>

                      {/* Athlete Info */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{
                            fontSize: fontSize + 2,
                            fontWeight: 'bold',
                            color: '#1f2937',
                            flex: 1
                          }}>
                            {athlete.full_name}
                          </Text>
                          <View style={{
                            width: 8,
                            height: 8,
                            backgroundColor: statusColor,
                            borderRadius: 4,
                            marginLeft: 8
                          }} />
                        </View>
                        
                        <Text style={{
                          fontSize: fontSize - 1,
                          color: '#6b7280',
                          marginBottom: 2
                        }}>
                          {athlete.email}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <View style={{
                            backgroundColor: getLevelColor(athlete.level) + '20',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                            marginRight: 8
                          }}>
                            <Text style={{
                              fontSize: fontSize - 2,
                              color: getLevelColor(athlete.level),
                              fontWeight: '600',
                              textTransform: 'capitalize'
                            }}>
                              {athlete.level}
                            </Text>
                          </View>
                          
                          <Text style={{
                            fontSize: fontSize - 2,
                            color: '#9ca3af',
                            fontWeight: '500'
                          }}>
                            {athlete.sport}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Feather name="activity" size={14} color="#6b7280" />
                          <Text style={{
                            fontSize: fontSize - 2,
                            color: '#6b7280',
                            marginLeft: 4,
                            marginRight: 12
                          }}>
                            {athlete.total_tests} tests
                          </Text>
                          
                          <Feather name="award" size={14} color="#f59e0b" />
                          <Text style={{
                            fontSize: fontSize - 2,
                            color: '#6b7280',
                            marginLeft: 4,
                            marginRight: 12
                          }}>
                            {athlete.best_records} records
                          </Text>
                          
                          <Feather name="clock" size={14} color="#6b7280" />
                          <Text style={{
                            fontSize: fontSize - 2,
                            color: '#6b7280',
                            marginLeft: 4
                          }}>
                            {formatDate(athlete.last_test_date)}
                          </Text>
                        </View>
                      </View>

                      {/* Chevron */}
                      <Feather name="chevron-right" size={20} color="#9ca3af" />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              /* Empty State */
              <View style={{
                backgroundColor: 'white',
                padding: cardPadding * 2,
                borderRadius: 16,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
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
                  <Feather name="users" size={36} color="#9ca3af" />
                </View>
                
                <Text style={{
                  fontSize: fontSize + 4,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 12,
                  textAlign: 'center'
                }}>
                  {searchQuery ? 'No Athletes Found' : 'No Athletes Yet'}
                </Text>
                
                <Text style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  textAlign: 'center',
                  lineHeight: 24,
                  maxWidth: 320
                }}>
                  {searchQuery 
                    ? `No athletes match "${searchQuery}". Try a different search term.`
                    : 'You don\'t have any enrolled athletes yet. Athletes need to enroll with you first to appear here.'
                  }
                </Text>
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
