import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ScrollView, RefreshControl, Modal } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { tursoDbHelpers } from '../../lib/turso-database';

interface Athlete {
  id: number;
  full_name: string;
  email: string;
  sport: string;
  level: string;
  created_at: string;
}

interface EnrollmentRequest {
  id: number;
  athlete_id: number;
  athlete_name: string;
  athlete_email: string;
  athlete_sport: string;
  athlete_level: string;
  status: 'pending' | 'viewing' | 'approved' | 'rejected';
  requested_at: string;
  viewed_at: string | null;
}

interface AthleteProfile {
  id: number;
  full_name: string;
  email: string;
  sport: string;
  level: string;
  created_at: string;
  is_verified: boolean;
  total_tests: number;
  recent_tests: TestResult[];
  enrollment_date?: string;
  enrollment_notes?: string;
}

interface TestResult {
  id: number;
  test_name: string;
  result_value: number | null;
  result_text: string | null;
  test_date: string;
  unit: string;
  is_best_record: boolean;
  notes: string | null;
}

export function ManageAthletesScreen({ 
  onBack, 
  onNavigateToAthleteProfile 
}: { 
  onBack: () => void;
  onNavigateToAthleteProfile?: (athleteId: number) => void;
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

  // State management
  const [activeTab, setActiveTab] = useState<'athletes' | 'requests'>('athletes');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Athlete profile modal state
  const [showAthleteModal, setShowAthleteModal] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | null>(null);
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Fetch data
  const fetchData = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch approved athletes
      const approvedAthletes = await tursoDbHelpers.all(`
        SELECT 
          u.id,
          u.full_name,
          u.email,
          a.sport,
          a.level,
          u.created_at
        FROM enrollments e
        JOIN users u ON e.athlete_id = u.id
        JOIN athletes a ON a.user_id = u.id
        WHERE e.trainer_id = ? AND e.status = 'approved'
        ORDER BY u.full_name
      `, [user.id]);

      // Fetch pending and viewing enrollment requests
      const pendingRequests = await tursoDbHelpers.all(`
        SELECT 
          e.id,
          e.athlete_id,
          u.full_name as athlete_name,
          u.email as athlete_email,
          a.sport as athlete_sport,
          a.level as athlete_level,
          e.status,
          e.requested_at,
          e.viewed_at
        FROM enrollments e
        JOIN users u ON e.athlete_id = u.id
        JOIN athletes a ON a.user_id = u.id
        WHERE e.trainer_id = ? AND e.status IN ('pending', 'viewing')
        ORDER BY e.requested_at DESC
      `, [user.id]);

      console.log('📊 Approved athletes:', approvedAthletes);
      console.log('📋 Pending requests:', pendingRequests);

      setAthletes(approvedAthletes || []);
      setEnrollmentRequests(pendingRequests || []);
    } catch (error) {
      console.error('❌ Error fetching athlete data:', error);
      Alert.alert('Error', 'Failed to load athlete data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  // Handle enrollment approval/rejection
  const handleEnrollmentAction = async (enrollmentId: number, action: 'approved' | 'rejected') => {
    try {
      // Get enrollment details for notification
      const enrollment = await tursoDbHelpers.get(`
        SELECT e.athlete_id, u.full_name as athlete_name
        FROM enrollments e
        JOIN users u ON e.athlete_id = u.id
        WHERE e.id = ?
      `, [enrollmentId]);

      // Update enrollment status
      await tursoDbHelpers.run(`
        UPDATE enrollments 
        SET status = ?, responded_at = datetime('now')
        WHERE id = ?
      `, [action, enrollmentId]);

      // Create notification for athlete
      if (enrollment) {
        const notificationTitle = action === 'approved' 
          ? '🎉 Enrollment Approved!' 
          : '❌ Enrollment Request Declined';
        
        const notificationMessage = action === 'approved'
          ? `Congratulations! Your enrollment request has been approved. You can now start training with your trainer!`
          : `Your enrollment request has been declined. You can search for other trainers or try again later.`;

        await tursoDbHelpers.run(`
          INSERT INTO notifications (
            user_id, 
            type, 
            title, 
            message, 
            data, 
            created_at
          ) VALUES (?, ?, ?, ?, ?, datetime('now'))
        `, [
          enrollment.athlete_id,
          action === 'approved' ? 'enrollment_approved' : 'enrollment_rejected',
          notificationTitle,
          notificationMessage,
          JSON.stringify({
            enrollment_id: enrollmentId,
            trainer_id: user?.id,
            trainer_name: user?.full_name,
            action: action,
            athlete_name: enrollment.athlete_name
          })
        ]);

        console.log(`✅ Enrollment ${action} and notification sent to ${enrollment.athlete_name}`);
      }

      Alert.alert(
        'Success',
        `Enrollment request ${action} successfully!`,
        [{ text: 'OK', onPress: () => fetchData() }]
      );
    } catch (error) {
      console.error(`❌ Error ${action} enrollment:`, error);
      Alert.alert('Error', `Failed to ${action.slice(0, -1)} enrollment request. Please try again.`);
    }
  };

  // Fetch detailed athlete profile
  const fetchAthleteProfile = async (athleteId: number) => {
    setIsLoadingProfile(true);
    try {
      // Get comprehensive athlete information
      const profile = await tursoDbHelpers.get(`
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.created_at,
          u.is_verified,
          a.sport,
          a.level,
          e.id as enrollment_id,
          e.requested_at as enrollment_date,
          e.notes as enrollment_notes,
          e.status as enrollment_status
        FROM users u
        JOIN athletes a ON u.id = a.user_id
        LEFT JOIN enrollments e ON e.athlete_id = u.id AND e.trainer_id = ?
        WHERE u.id = ? AND u.role = 'athlete'
      `, [user?.id, athleteId]);

      if (!profile) {
        Alert.alert('Error', 'Athlete profile not found.');
        return;
      }

      // Update enrollment status to 'viewing' if currently 'pending'
      if (profile.enrollment_id && profile.enrollment_status === 'pending') {
        try {
          await tursoDbHelpers.run(`
            UPDATE enrollments 
            SET status = 'viewing', viewed_at = datetime('now')
            WHERE id = ?
          `, [profile.enrollment_id]);

          // Create notification for the athlete
          await tursoDbHelpers.run(`
            INSERT INTO notifications (
              user_id, 
              type, 
              title, 
              message, 
              data, 
              created_at
            ) VALUES (?, ?, ?, ?, ?, datetime('now'))
          `, [
            athleteId,
            'enrollment_status_change',
            'Profile Viewed by Trainer',
            `Your trainer is now reviewing your enrollment request. You should hear back from them soon!`,
            JSON.stringify({
              enrollment_id: profile.enrollment_id,
              trainer_id: user?.id,
              trainer_name: user?.full_name,
              previous_status: 'pending',
              new_status: 'viewing'
            })
          ]);

          console.log('✅ Status updated to viewing and notification created');
        } catch (statusError) {
          console.error('⚠️ Error updating status:', statusError);
          // Continue with profile display even if status update fails
        }
      }

      // Get test results count
      const testCount = await tursoDbHelpers.get(`
        SELECT COUNT(*) as total_tests
        FROM test_results tr
        WHERE tr.athlete_id = ?
      `, [athleteId]);

      // Get recent test results
      const recentTests = await tursoDbHelpers.all(`
        SELECT 
          tr.id,
          tr.result_value,
          tr.result_text,
          tr.test_date,
          tr.notes,
          tr.is_best_record,
          tr.input_unit,
          t.name as test_name,
          t.unit
        FROM test_results tr
        JOIN tests t ON tr.test_id = t.id
        WHERE tr.athlete_id = ?
        ORDER BY tr.test_date DESC, tr.created_at DESC
        LIMIT 5
      `, [athleteId]);

      const athleteProfileData: AthleteProfile = {
        ...profile,
        total_tests: testCount?.total_tests || 0,
        recent_tests: recentTests || []
      };

      console.log('👤 Athlete profile loaded:', athleteProfileData);
      setAthleteProfile(athleteProfileData);
      setShowAthleteModal(true);

    } catch (error) {
      console.error('❌ Error fetching athlete profile:', error);
      Alert.alert('Error', 'Failed to load athlete profile. Please try again.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Handle athlete profile view
  const handleViewAthleteProfile = (athleteId: number) => {
    if (onNavigateToAthleteProfile) {
      onNavigateToAthleteProfile(athleteId);
    } else {
      // Fallback to modal if navigation not provided (for backwards compatibility)
      setSelectedAthleteId(athleteId);
      fetchAthleteProfile(athleteId);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    fetchData(true);
  };

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

  const AthleteCard = ({ athlete }: { athlete: Athlete }) => (
    <Pressable
      onPress={() => handleViewAthleteProfile(athlete.id)}
      style={{
        backgroundColor: 'white',
        padding: cardPadding,
        borderRadius: 12,
        marginBottom: spacing,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
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
            {athlete.full_name.split(' ').map(n => n[0]).join('')}
          </Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: fontSize,
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: 2
          }}>
            {athlete.full_name}
          </Text>
          <Text style={{
            fontSize: fontSize - 2,
            color: '#6b7280',
            marginBottom: 4
          }}>
            {athlete.email}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#10b981',
              fontWeight: '600',
              backgroundColor: '#f0fdf4',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6,
              marginRight: 8
            }}>
              {athlete.sport}
            </Text>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#f59e0b',
              fontWeight: '600',
              backgroundColor: '#fefbf2',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6
            }}>
              {athlete.level}
            </Text>
          </View>
        </View>

        <View style={{
          backgroundColor: '#f0fdf4',
          padding: 8,
          borderRadius: 8,
        }}>
          <Feather name="chevron-right" size={20} color="#10b981" />
        </View>
      </View>
      
      <Text style={{
        fontSize: fontSize - 2,
        color: '#3b82f6',
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '500'
      }}>
        Tap to view athlete profile
      </Text>
    </Pressable>
  );

  const EnrollmentRequestCard = ({ request }: { request: EnrollmentRequest }) => {
    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'pending':
          return {
            borderColor: '#f59e0b',
            avatarColor: '#f59e0b',
            statusIcon: 'clock',
            statusColor: '#f59e0b',
            statusBgColor: '#fef3c7',
            statusText: 'Pending',
            description: 'New enrollment request'
          };
        case 'viewing':
          return {
            borderColor: '#3b82f6',
            avatarColor: '#3b82f6',
            statusIcon: 'eye',
            statusColor: '#3b82f6',
            statusBgColor: '#f0f9ff',
            statusText: 'Reviewing',
            description: 'Profile viewed - under review'
          };
        default:
          return {
            borderColor: '#6b7280',
            avatarColor: '#6b7280',
            statusIcon: 'help-circle',
            statusColor: '#6b7280',
            statusBgColor: '#f3f4f6',
            statusText: 'Unknown',
            description: 'Unknown status'
          };
      }
    };

    const statusInfo = getStatusInfo(request.status);
    
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    };

    return (
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
        borderLeftWidth: 4,
        borderLeftColor: statusInfo.borderColor,
      }}>
        <Pressable
          onPress={() => handleViewAthleteProfile(request.athlete_id)}
          style={{ marginBottom: 12 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 50,
              height: 50,
              backgroundColor: statusInfo.avatarColor,
              borderRadius: 25,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16
            }}>
              <Text style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>
                {request.athlete_name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Text style={{
                  fontSize: fontSize,
                  fontWeight: '600',
                  color: '#1f2937',
                  flex: 1
                }}>
                  {request.athlete_name}
                </Text>
                <View style={{
                  backgroundColor: statusInfo.statusBgColor,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Feather name={statusInfo.statusIcon as any} size={12} color={statusInfo.statusColor} />
                  <Text style={{
                    fontSize: fontSize - 3,
                    color: statusInfo.statusColor,
                    fontWeight: '600',
                    marginLeft: 4
                  }}>
                    {statusInfo.statusText}
                  </Text>
                </View>
              </View>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#6b7280',
                marginBottom: 6
              }}>
                {request.athlete_email}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#10b981',
                  fontWeight: '600',
                  backgroundColor: '#f0fdf4',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6,
                  marginRight: 8
                }}>
                  {request.athlete_sport}
                </Text>
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#f59e0b',
                  fontWeight: '600',
                  backgroundColor: '#fefbf2',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 6
                }}>
                  {request.athlete_level}
                </Text>
              </View>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#9ca3af',
                fontStyle: 'italic'
              }}>
                {statusInfo.description} • Requested {formatDate(request.requested_at)}
                {request.viewed_at && request.status === 'viewing' && ` • Viewed ${formatDate(request.viewed_at)}`}
              </Text>
            </View>

            <View style={{
              backgroundColor: '#f0f9ff',
              padding: 8,
              borderRadius: 8,
            }}>
              <Feather name="eye" size={20} color="#3b82f6" />
            </View>
          </View>
          
          <Text style={{
            fontSize: fontSize - 2,
            color: '#3b82f6',
            marginTop: 8,
            textAlign: 'center',
            fontWeight: '500'
          }}>
            Tap to view athlete profile
          </Text>
        </Pressable>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable
          onPress={() => {
            Alert.alert(
              'Approve Enrollment',
              `Are you sure you want to approve ${request.athlete_name}'s enrollment request?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Approve', onPress: () => handleEnrollmentAction(request.id, 'approved') }
              ]
            );
          }}
          style={{
            flex: 1,
            backgroundColor: '#10b981',
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: fontSize }}>
            Approve
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Alert.alert(
              'Reject Enrollment',
              `Are you sure you want to reject ${request.athlete_name}'s enrollment request?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reject', style: 'destructive', onPress: () => handleEnrollmentAction(request.id, 'rejected') }
              ]
            );
          }}
          style={{
            flex: 1,
            backgroundColor: '#ef4444',
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: fontSize }}>
            Reject
          </Text>
        </Pressable>
      </View>
    </View>
  );
  };

  const EmptyState = ({ icon, title, description }: {
    icon: string;
    title: string;
    description: string;
  }) => (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
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
        fontSize: fontSize + 2,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
        textAlign: 'center'
      }}>
        {title}
      </Text>
      
      <Text style={{
        fontSize: fontSize,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280
      }}>
        {description}
      </Text>
    </View>
  );

  // Athlete Profile Modal Component
  const AthleteProfileModal = () => {
    if (!athleteProfile) return null;

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const getVerificationBadge = () => (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: athleteProfile.is_verified ? '#f0fdf4' : '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: athleteProfile.is_verified ? '#dcfce7' : '#fde68a'
      }}>
        <Feather 
          name={athleteProfile.is_verified ? "check-circle" : "alert-circle"} 
          size={14} 
          color={athleteProfile.is_verified ? "#10b981" : "#f59e0b"} 
        />
        <Text style={{
          fontSize: fontSize - 2,
          fontWeight: '600',
          color: athleteProfile.is_verified ? '#059669' : '#d97706',
          marginLeft: 4
        }}>
          {athleteProfile.is_verified ? 'Verified' : 'Unverified'}
        </Text>
      </View>
    );

    return (
      <Modal
        visible={showAthleteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAthleteModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              padding: containerPadding,
              paddingBottom: containerPadding + 20
            }}
            showsVerticalScrollIndicator={false}
          >
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
                  onPress={() => setShowAthleteModal(false)}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: '#f3f4f6'
                  }}
                >
                  <Feather name="x" size={20} color="#6b7280" />
                </Pressable>
                
                <Text style={{
                  fontSize: titleFontSize,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  flex: 1,
                  textAlign: 'center'
                }}>
                  Athlete Profile
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
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Feather name="user-plus" size={18} color="#6b7280" />
                  <Text style={{
                    fontSize: fontSize,
                    color: '#6b7280',
                    marginLeft: 8
                  }}>
                    Enrollment Request: {formatDate(athleteProfile.enrollment_date)}
                  </Text>
                </View>
              )}
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="activity" size={18} color="#6b7280" />
                <Text style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  marginLeft: 8
                }}>
                  Total Tests: {athleteProfile.total_tests}
                </Text>
              </View>
            </View>

            {/* Recent Test Results */}
            {athleteProfile.recent_tests.length > 0 && (
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
                  Recent Test Results
                </Text>
                
                {athleteProfile.recent_tests.map((test, index) => (
                  <View 
                    key={test.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 8,
                      borderBottomWidth: index < athleteProfile.recent_tests.length - 1 ? 1 : 0,
                      borderBottomColor: '#f3f4f6'
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: fontSize,
                        fontWeight: '600',
                        color: '#1f2937',
                        marginBottom: 2
                      }}>
                        {test.test_name}
                      </Text>
                      <Text style={{
                        fontSize: fontSize - 2,
                        color: '#6b7280'
                      }}>
                        {formatDate(test.test_date)}
                      </Text>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{
                        fontSize: fontSize,
                        fontWeight: '600',
                        color: test.is_best_record ? '#10b981' : '#1f2937',
                        marginBottom: 2
                      }}>
                        {test.result_value ? `${test.result_value} ${test.unit}` : test.result_text}
                      </Text>
                      {test.is_best_record && (
                        <View style={{
                          backgroundColor: '#f0fdf4',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4
                        }}>
                          <Text style={{
                            fontSize: fontSize - 3,
                            color: '#059669',
                            fontWeight: '600'
                          }}>
                            BEST
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

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
                  Enrollment Request Notes
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

            {/* Action Buttons */}
            {selectedAthleteId && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => {
                    setShowAthleteModal(false);
                    const request = enrollmentRequests.find(r => r.athlete_id === selectedAthleteId);
                    if (request) {
                      Alert.alert(
                        'Approve Enrollment',
                        `Are you sure you want to approve ${athleteProfile.full_name}'s enrollment request?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Approve', onPress: () => handleEnrollmentAction(request.id, 'approved') }
                        ]
                      );
                    }
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#10b981',
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: fontSize + 1 }}>
                    Approve Enrollment
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowAthleteModal(false);
                    const request = enrollmentRequests.find(r => r.athlete_id === selectedAthleteId);
                    if (request) {
                      Alert.alert(
                        'Reject Enrollment',
                        `Are you sure you want to reject ${athleteProfile.full_name}'s enrollment request?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Reject', style: 'destructive', onPress: () => handleEnrollmentAction(request.id, 'rejected') }
                        ]
                      );
                    }
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#ef4444',
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600', fontSize: fontSize + 1 }}>
                    Reject Request
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

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
                  Manage Athletes
                </Text>
                <Text style={{ color: '#6b7280', fontSize: fontSize - 2 }}>
                  View your athletes and approve enrollment requests
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
              id="athletes"
              label={`Athletes (${athletes.length})`}
              isActive={activeTab === 'athletes'}
              onPress={() => setActiveTab('athletes')}
            />
            <TabButton
              id="requests"
              label={`Requests (${enrollmentRequests.length})`}
              isActive={activeTab === 'requests'}
              onPress={() => setActiveTab('requests')}
            />
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={{
              backgroundColor: 'white',
              padding: cardPadding,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200
            }}>
              <Feather name="loader" size={32} color="#6b7280" />
              <Text style={{
                fontSize: fontSize,
                color: '#6b7280',
                marginTop: 16,
                textAlign: 'center'
              }}>
                Loading...
              </Text>
            </View>
          ) : activeTab === 'athletes' ? (
            athletes.length > 0 ? (
              athletes.map((athlete) => (
                <AthleteCard key={athlete.id} athlete={athlete} />
              ))
            ) : (
              <EmptyState
                icon="users"
                title="No Athletes Yet"
                description="You don't have any approved athletes yet. Check the Requests tab to approve enrollment requests."
              />
            )
          ) : (
            enrollmentRequests.length > 0 ? (
              enrollmentRequests.map((request) => (
                <EnrollmentRequestCard key={request.id} request={request} />
              ))
            ) : (
              <EmptyState
                icon="inbox"
                title="No Pending Requests"
                description="You don't have any pending enrollment requests at the moment."
              />
            )
          )}

        </View>
      </ScrollView>
      
      {/* Athlete Profile Modal */}
      <AthleteProfileModal />
    </View>
  );
}