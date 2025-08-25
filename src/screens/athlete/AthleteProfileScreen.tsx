import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ScrollView, RefreshControl } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { tursoDbHelpers } from '../../lib/turso-database';

interface AthleteProfile {
  // User information
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  is_verified: boolean;
  
  // Athlete information
  user_id: number;
  sport: string;
  level: string;
}

interface TrainerInfo {
  trainer_name: string;
  trainer_email: string;
  trainer_code: string;
  enrollment_status: string;
  enrollment_date: string;
}

export function AthleteProfileScreen({ onBack }: { onBack: () => void }) {
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

  // State management
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch profile data
  const fetchProfile = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Query to get user and athlete information
      const profileData = await tursoDbHelpers.get(`
        SELECT 
          u.id,
          u.email,
          u.full_name,
          u.role,
          u.created_at,
          u.is_verified,
          a.user_id,
          a.sport,
          a.level
        FROM users u
        LEFT JOIN athletes a ON u.id = a.user_id
        WHERE u.id = ? AND u.role = 'athlete'
      `, [user.id]);

      console.log('👤 Athlete profile data:', profileData);

      if (profileData) {
        setProfile(profileData);
      } else {
        Alert.alert('Error', 'Profile not found or you are not an athlete.');
      }

      // Get trainer information if enrolled
      const trainer = await tursoDbHelpers.get(`
        SELECT 
          u.full_name as trainer_name,
          u.email as trainer_email,
          t.trainer_code,
          e.status as enrollment_status,
          e.responded_at as enrollment_date
        FROM enrollments e
        JOIN users u ON e.trainer_id = u.id
        JOIN trainers t ON t.user_id = u.id
        WHERE e.athlete_id = ? AND e.status = 'approved'
        LIMIT 1
      `, [user.id]);

      console.log('👨‍🏫 Trainer info:', trainer);
      setTrainerInfo(trainer);

    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  // Handle refresh
  const onRefresh = () => {
    fetchProfile(true);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get level color and background
  const getLevelStyle = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return { color: '#10b981', bg: '#f0fdf4' };
      case 'intermediate':
        return { color: '#f59e0b', bg: '#fefbf2' };
      case 'advanced':
        return { color: '#ef4444', bg: '#fef2f2' };
      case 'professional':
        return { color: '#8b5cf6', bg: '#f5f3ff' };
      default:
        return { color: '#6b7280', bg: '#f9fafb' };
    }
  };

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
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
    }}>
      <Text style={{
        fontSize: fontSize + 2,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16
      }}>
        {title}
      </Text>
      {children}
    </View>
  );

  const InfoRow = ({ label, value, icon }: { 
    label: string; 
    value: string | null; 
    icon?: string;
  }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
    }}>
      {icon && (
        <View style={{
          width: 32,
          height: 32,
          backgroundColor: '#f8fafc',
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12
        }}>
          <Feather name={icon as any} size={16} color="#6b7280" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: fontSize - 2,
          color: '#6b7280',
          marginBottom: 2
        }}>
          {label}
        </Text>
        <Text style={{
          fontSize: fontSize,
          fontWeight: '500',
          color: '#1f2937'
        }}>
          {value || 'Not provided'}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: containerPadding
        }}>
          <Feather name="loader" size={32} color="#6b7280" />
          <Text style={{
            fontSize: fontSize,
            color: '#6b7280',
            marginTop: 16,
            textAlign: 'center'
          }}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: containerPadding
        }}>
          <Feather name="alert-circle" size={32} color="#ef4444" />
          <Text style={{
            fontSize: fontSize + 2,
            fontWeight: 'bold',
            color: '#1f2937',
            marginTop: 16,
            textAlign: 'center'
          }}>
            Profile Not Found
          </Text>
          <Text style={{
            fontSize: fontSize,
            color: '#6b7280',
            marginTop: 8,
            textAlign: 'center'
          }}>
            Unable to load your profile information.
          </Text>
          <Pressable
            onPress={onBack}
            style={{
              backgroundColor: '#3b82f6',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 24
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const levelStyle = getLevelStyle(profile.level);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: containerPadding,
          paddingBottom: containerPadding + 100 
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
                  My Profile
                </Text>
                <Text style={{ color: '#6b7280', fontSize: fontSize - 2 }}>
                  Your athlete profile information
                </Text>
              </View>
              
              <Pressable
                onPress={() => Alert.alert('Edit Profile', 'Edit profile functionality coming soon!')}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#3b82f6',
                }}
              >
                <Feather name="edit-2" size={20} color="white" />
              </Pressable>
            </View>
          </View>

          {/* Profile Header */}
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 16,
            marginBottom: spacing,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}>
            {/* Avatar */}
            <View style={{
              width: 100,
              height: 100,
              backgroundColor: '#10b981',
              borderRadius: 50,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Text style={{ 
                fontSize: 36, 
                color: 'white', 
                fontWeight: 'bold' 
              }}>
                {profile.full_name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>

            {/* Name and Status */}
            <Text style={{
              fontSize: titleFontSize,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              {profile.full_name}
            </Text>

            <View style={{
              backgroundColor: levelStyle.bg,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8
            }}>
              <Feather name="zap" size={14} color={levelStyle.color} />
              <Text style={{ 
                color: levelStyle.color, 
                fontSize: 12, 
                fontWeight: '600',
                marginLeft: 4
              }}>
                {profile.level.toUpperCase()} ATHLETE
              </Text>
            </View>

            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280',
              textAlign: 'center'
            }}>
              {profile.sport} Specialist
            </Text>
          </View>

          {/* Personal Information */}
          <InfoCard title="Personal Information">
            <InfoRow label="Full Name" value={profile.full_name} icon="user" />
            <InfoRow label="Email Address" value={profile.email} icon="mail" />
            <InfoRow label="Account Type" value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} icon="shield" />
            <InfoRow label="Member Since" value={formatDate(profile.created_at)} icon="calendar" />
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
            }}>
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: '#f8fafc',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Feather name="check-circle" size={16} color={profile.is_verified ? '#10b981' : '#6b7280'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#6b7280',
                  marginBottom: 2
                }}>
                  Email Verification
                </Text>
                <Text style={{
                  fontSize: fontSize,
                  fontWeight: '500',
                  color: profile.is_verified ? '#10b981' : '#ef4444'
                }}>
                  {profile.is_verified ? 'Verified' : 'Not Verified'}
                </Text>
              </View>
            </View>
          </InfoCard>

          {/* Athletic Information */}
          <InfoCard title="Athletic Information">
            <InfoRow label="Primary Sport" value={profile.sport} icon="zap" />
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: '#f3f4f6',
            }}>
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: '#f8fafc',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Feather name="trending-up" size={16} color="#6b7280" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#6b7280',
                  marginBottom: 2
                }}>
                  Skill Level
                </Text>
                <View style={{
                  backgroundColor: levelStyle.bg,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  alignSelf: 'flex-start'
                }}>
                  <Text style={{
                    fontSize: fontSize - 2,
                    fontWeight: '600',
                    color: levelStyle.color
                  }}>
                    {profile.level.charAt(0).toUpperCase() + profile.level.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          </InfoCard>

          {/* Trainer Information */}
          {trainerInfo ? (
            <InfoCard title="My Trainer">
              <InfoRow label="Trainer Name" value={trainerInfo.trainer_name} icon="user-check" />
              <InfoRow label="Trainer Email" value={trainerInfo.trainer_email} icon="mail" />
              <InfoRow label="Trainer Code" value={trainerInfo.trainer_code} icon="hash" />
              <InfoRow label="Enrollment Date" value={formatDate(trainerInfo.enrollment_date)} icon="calendar" />
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
              }}>
                <View style={{
                  width: 32,
                  height: 32,
                  backgroundColor: '#f8fafc',
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <Feather name="check-circle" size={16} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: fontSize - 2,
                    color: '#6b7280',
                    marginBottom: 2
                  }}>
                    Status
                  </Text>
                  <Text style={{
                    fontSize: fontSize,
                    fontWeight: '500',
                    color: '#10b981'
                  }}>
                    Enrolled & Active
                  </Text>
                </View>
              </View>
            </InfoCard>
          ) : (
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
              alignItems: 'center'
            }}>
              <Feather name="user-x" size={32} color="#9ca3af" />
              <Text style={{
                fontSize: fontSize + 2,
                fontWeight: 'bold',
                color: '#1f2937',
                marginTop: 12,
                marginBottom: 8,
                textAlign: 'center'
              }}>
                No Trainer Assigned
              </Text>
              <Text style={{
                fontSize: fontSize,
                color: '#6b7280',
                textAlign: 'center',
                lineHeight: 22
              }}>
                You haven't enrolled with a trainer yet. Find a trainer to start your fitness journey!
              </Text>
            </View>
          )}

          {/* Quick Actions */}
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
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 16
            }}>
              Quick Actions
            </Text>
            
            <Pressable
              onPress={() => Alert.alert('Edit Profile', 'Edit profile functionality coming soon!')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                marginBottom: 8
              }}
            >
              <Feather name="edit-2" size={20} color="#3b82f6" />
              <Text style={{
                fontSize: fontSize,
                fontWeight: '500',
                color: '#1f2937',
                marginLeft: 12
              }}>
                Edit Profile
              </Text>
              <View style={{ flex: 1 }} />
              <Feather name="chevron-right" size={20} color="#6b7280" />
            </Pressable>

            <Pressable
              onPress={() => Alert.alert('Change Password', 'Change password functionality coming soon!')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                backgroundColor: '#f8fafc',
                borderRadius: 8,
              }}
            >
              <Feather name="lock" size={20} color="#3b82f6" />
              <Text style={{
                fontSize: fontSize,
                fontWeight: '500',
                color: '#1f2937',
                marginLeft: 12
              }}>
                Change Password
              </Text>
              <View style={{ flex: 1 }} />
              <Feather name="chevron-right" size={20} color="#6b7280" />
            </Pressable>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
