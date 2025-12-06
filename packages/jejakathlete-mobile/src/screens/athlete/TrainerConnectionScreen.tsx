import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ScrollView, RefreshControl, KeyboardAvoidingView } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { tursoDbHelpers } from '../../lib/turso-database';
import { useKeyboardAware } from '../../hooks/useKeyboardAware';

interface TrainerInfo {
  trainer_id: number;
  trainer_name: string;
  trainer_email: string;
  trainer_code: string;
  specialization: string | null;
  certification_id: string | null;
  enrollment_status: string;
  enrollment_date: string;
  enrollment_id: number;
}

interface AvailableTrainer {
  id: number;
  full_name: string;
  email: string;
  trainer_code: string;
  specialization: string | null;
  certification_id: string | null;
}

export function TrainerConnectionScreen({ onBack }: { onBack: () => void }) {
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
  const [currentTrainer, setCurrentTrainer] = useState<TrainerInfo | null>(null);
  const [availableTrainers, setAvailableTrainers] = useState<AvailableTrainer[]>([]);
  const [searchResults, setSearchResults] = useState<AvailableTrainer[]>([]);
  const [trainerCode, setTrainerCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showTrainerSearch, setShowTrainerSearch] = useState(false);
  const [searchMode, setSearchMode] = useState<'code' | 'name'>('code');

  // Fetch trainer connection data
  const fetchTrainerData = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Get current trainer if enrolled
      const trainer = await tursoDbHelpers.get(`
        SELECT 
          e.id as enrollment_id,
          e.trainer_id,
          u.full_name as trainer_name,
          u.email as trainer_email,
          t.trainer_code,
          t.specialization,
          t.certification_id,
          e.status as enrollment_status,
          e.responded_at as enrollment_date
        FROM enrollments e
        JOIN users u ON e.trainer_id = u.id
        JOIN trainers t ON t.user_id = u.id
        WHERE e.athlete_id = ? AND e.status IN ('approved', 'pending', 'viewing', 'accepting')
        ORDER BY e.requested_at DESC
        LIMIT 1
      `, [user.id]);


      setCurrentTrainer(trainer);

      // If no current trainer, fetch available trainers
      if (!trainer || trainer.enrollment_status !== 'approved') {
        const trainers = await tursoDbHelpers.all(`
          SELECT 
            u.id,
            u.full_name,
            u.email,
            t.trainer_code,
            t.specialization,
            t.certification_id
          FROM users u
          JOIN trainers t ON u.id = t.user_id
          WHERE u.role = 'trainer' AND t.verification_status = 'approved'
          ORDER BY u.full_name
          LIMIT 20
        `, []);


        setAvailableTrainers(trainers || []);
      }

    } catch (error) {
      console.error('❌ Error fetching trainer data:', error);
      Alert.alert('Error', 'Failed to load trainer information. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrainerData();
  }, [user?.id]);

  // Handle refresh
  const onRefresh = () => {
    fetchTrainerData(true);
  };

  // Enhanced search functionality
  const handleTrainerSearch = async (query: string = searchQuery || trainerCode) => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a search term');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      let trainers: AvailableTrainer[] = [];
      
      if (searchMode === 'code') {
        // Search by trainer code (exact match)
        const trainer = await tursoDbHelpers.get(`
          SELECT 
            u.id,
            u.full_name,
            u.email,
            t.trainer_code,
            t.specialization,
            t.certification_id
          FROM users u
          JOIN trainers t ON u.id = t.user_id
          WHERE t.trainer_code = ? AND u.role = 'trainer' AND t.verification_status = 'approved'
        `, [query.trim().toUpperCase()]);
        
        if (trainer) {
          trainers = [trainer];
        }
      } else {
        // Search by trainer name (partial match)
        const results = await tursoDbHelpers.all(`
          SELECT 
            u.id,
            u.full_name,
            u.email,
            t.trainer_code,
            t.specialization,
            t.certification_id
          FROM users u
          JOIN trainers t ON u.id = t.user_id
          WHERE u.full_name LIKE ? AND u.role = 'trainer' AND t.verification_status = 'approved'
          ORDER BY u.full_name
          LIMIT 10
        `, [`%${query.trim()}%`]);
        
        trainers = results || [];
      }

      if (trainers.length > 0) {
        setSearchResults(trainers);

      } else {
        Alert.alert(
          'No Results', 
          searchMode === 'code' 
            ? 'No trainer found with this code. Please check the code and try again.'
            : 'No trainers found with this name. Try a different search term.'
        );
        setSearchResults([]);
      }
    } catch (error) {
      console.error('❌ Error searching trainer:', error);
      Alert.alert('Error', 'Failed to search for trainer. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search results
  const clearSearch = () => {
    setSearchResults([]);
    setSearchQuery('');
    setTrainerCode('');
  };

  // Enhanced enrollment request with new workflow statuses
  const handleEnrollmentRequest = async (trainerId: number) => {
    if (!user?.id) return;

    setIsEnrolling(true);
    try {
      // Get trainer information for the request
      const trainerInfo = await tursoDbHelpers.get(`
        SELECT u.full_name, u.email, t.trainer_code, t.specialization
        FROM users u
        JOIN trainers t ON u.id = t.user_id
        WHERE u.id = ? AND u.role = 'trainer'
      `, [trainerId]);

      if (!trainerInfo) {
        Alert.alert('Error', 'Trainer not found. Please try again.');
        return;
      }

      // Check for existing enrollment with comprehensive status checking
      const existingEnrollment = await tursoDbHelpers.get(`
        SELECT id, status, requested_at, viewed_at, accepting_at, responded_at
        FROM enrollments 
        WHERE athlete_id = ? AND trainer_id = ?
        ORDER BY requested_at DESC
        LIMIT 1
      `, [user.id, trainerId]);

      // Handle existing enrollment statuses
      if (existingEnrollment) {
        const { status } = existingEnrollment;
        
        switch (status) {
          case 'approved':
            Alert.alert('Already Enrolled', 'You are already enrolled with this trainer.');
            return;
            
          case 'pending':
            Alert.alert(
              'Request Pending', 
              'You already have a pending enrollment request with this trainer. Please wait for their response.'
            );
            return;
            
          case 'viewing':
            Alert.alert(
              'Request Being Reviewed', 
              'Your trainer is currently reviewing your enrollment request. You will be notified once they make a decision.'
            );
            return;
            
          case 'accepting':
            Alert.alert(
              'Request Being Processed', 
              'Your trainer is processing your enrollment request. This should be completed shortly.'
            );
            return;
            
          case 'rejected':
            // Reuse existing record after rejection
            Alert.alert(
              'Previous Request Rejected',
              'Your previous request was rejected. You can send a new enrollment request.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Send New Request', 
                  onPress: () => updateExistingEnrollmentRequest(existingEnrollment.id, trainerInfo)
                }
              ]
            );
            return;
            
          case 'cancelled':
            // Reuse existing record after cancellation
            Alert.alert(
              'Send New Request?',
              'You previously cancelled a request with this trainer. Would you like to send a new enrollment request?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Send Request', 
                  onPress: () => updateExistingEnrollmentRequest(existingEnrollment.id, trainerInfo)
                }
              ]
            );
            return;
        }
      }

      // Create new enrollment request
      await createNewEnrollmentRequest(trainerId, trainerInfo);

    } catch (error) {
      console.error('❌ Error processing enrollment request:', error);
      Alert.alert('Error', 'Failed to process enrollment request. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Helper function to create new enrollment request
  const createNewEnrollmentRequest = async (trainerId: number, trainerInfo: any) => {
    try {
      // Insert new enrollment request with pending status
      const result = await tursoDbHelpers.run(`
        INSERT INTO enrollments (
          athlete_id, 
          trainer_id, 
          status, 
          requested_at,
          notes
        ) VALUES (?, ?, 'pending', datetime('now'), ?)
      `, [
        user?.id, 
        trainerId, 
        `Enrollment request from ${user?.full_name || 'athlete'} for ${trainerInfo.trainer_code}`
      ]);



      // Show success message with trainer details
      Alert.alert(
        'Request Sent Successfully! 🎉',
        `Your enrollment request has been sent to:\n\n` +
        `👨‍🏫 ${trainerInfo.full_name} (${trainerInfo.trainer_code})\n` +
        `📧 ${trainerInfo.email}\n` +
        `🎯 ${trainerInfo.specialization || 'General Training'}\n\n` +
        `You will be notified when they respond to your request.`,
        [{ 
          text: 'OK', 
          onPress: () => {
            setTrainerCode('');
            setSearchQuery('');
            setSearchResults([]);
            setShowTrainerSearch(false);
            fetchTrainerData(); // Refresh the data
          }
        }]
      );

    } catch (error) {
      console.error('❌ Error creating enrollment request:', error);
      Alert.alert('Error', 'Failed to send enrollment request. Please try again.');
      throw error;
    }
  };

  // Helper function to update existing enrollment request
  const updateExistingEnrollmentRequest = async (enrollmentId: number, trainerInfo: any) => {
    try {
      // Update existing enrollment request to pending status
      const result = await tursoDbHelpers.run(`
        UPDATE enrollments 
        SET status = 'pending', 
            requested_at = datetime('now'),
            responded_at = NULL,
            viewed_at = NULL,
            accepting_at = NULL,
            notes = ?
        WHERE id = ?
      `, [
        `Enrollment request from ${user?.full_name || 'athlete'} for ${trainerInfo.trainer_code}`,
        enrollmentId
      ]);



      // Show success message with trainer details
      Alert.alert(
        'Request Sent Successfully! 🎉',
        `Your enrollment request has been sent to:\n\n` +
        `👨‍🏫 ${trainerInfo.full_name} (${trainerInfo.trainer_code})\n` +
        `📧 ${trainerInfo.email}\n` +
        `🎯 ${trainerInfo.specialization || 'General Training'}\n\n` +
        `You will be notified when they respond to your request.`,
        [{ 
          text: 'OK', 
          onPress: () => {

            fetchTrainerData();
          }
        }]
      );

    } catch (error) {
      console.error('❌ Error updating enrollment request:', error);
      Alert.alert('Error', 'Failed to send enrollment request. Please try again.');
    }
  };

  // Handle unenrollment
  const handleUnenrollment = () => {
    if (!currentTrainer) return;

    Alert.alert(
      'Unenroll from Trainer',
      `Are you sure you want to unenroll from ${currentTrainer.trainer_name}? This will remove your access to their training programs and you'll need to find a new trainer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unenroll', 
          style: 'destructive',
          onPress: async () => {
            try {
              await tursoDbHelpers.run(`
                UPDATE enrollments 
                SET status = 'cancelled', responded_at = datetime('now')
                WHERE id = ?
              `, [currentTrainer.enrollment_id]);

              Alert.alert('Unenrolled', 'You have been unenrolled from your trainer.', [
                { text: 'OK', onPress: () => fetchTrainerData() }
              ]);
            } catch (error) {
              console.error('❌ Error unenrolling:', error);
              Alert.alert('Error', 'Failed to unenroll. Please try again.');
            }
          }
        }
      ]
    );
  };

  const TrainerCard = ({ trainer, isCurrentTrainer = false }: { 
    trainer: AvailableTrainer | TrainerInfo; 
    isCurrentTrainer?: boolean;
  }) => (
    <View style={{
      backgroundColor: 'white',
      padding: cardPadding,
      borderRadius: 12,
      marginBottom: spacing,
      borderLeftWidth: isCurrentTrainer ? 4 : 0,
      borderLeftColor: isCurrentTrainer ? '#10b981' : 'transparent',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{
          width: 60,
          height: 60,
          backgroundColor: isCurrentTrainer ? '#10b981' : '#3b82f6',
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16
        }}>
          <Text style={{ fontSize: 20, color: 'white', fontWeight: 'bold' }}>
            {'full_name' in trainer 
              ? trainer.full_name.split(' ').map(n => n[0]).join('')
              : trainer.trainer_name.split(' ').map(n => n[0]).join('')
            }
          </Text>
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: fontSize,
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: 2
          }}>
            {'full_name' in trainer ? trainer.full_name : trainer.trainer_name}
          </Text>
          <Text style={{
            fontSize: fontSize - 2,
            color: '#6b7280',
            marginBottom: 4
          }}>
            {'full_name' in trainer ? trainer.email : trainer.trainer_email}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{
              fontSize: fontSize - 2,
              color: '#3b82f6',
              fontWeight: '600',
              backgroundColor: '#f0f9ff',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6,
              marginRight: 8,
              marginBottom: 4
            }}>
              {trainer.trainer_code}
            </Text>
            {trainer.specialization && (
              <Text style={{
                fontSize: fontSize - 2,
                color: '#10b981',
                fontWeight: '600',
                backgroundColor: '#f0fdf4',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                marginBottom: 4
              }}>
                {trainer.specialization}
              </Text>
            )}
          </View>
        </View>

        {isCurrentTrainer && (
          <View style={{
            backgroundColor: '#f0fdf4',
            padding: 8,
            borderRadius: 8,
          }}>
            <Feather name="check-circle" size={20} color="#10b981" />
          </View>
        )}
      </View>

      {!isCurrentTrainer && (
        <Pressable
          onPress={() => handleEnrollmentRequest('id' in trainer ? trainer.id : trainer.trainer_id)}
          style={{
            backgroundColor: '#3b82f6',
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 12
          }}
        >
          <Text style={{
            color: 'white',
            fontWeight: '600',
            fontSize: fontSize
          }}>
            Send Enrollment Request
          </Text>
        </Pressable>
      )}
    </View>
  );

  // Flat trainer item for available trainers list
  const FlatTrainerItem = ({ trainer, index, totalCount }: { 
    trainer: AvailableTrainer; 
    index: number;
    totalCount: number;
  }) => (
    <Pressable
      onPress={() => handleEnrollmentRequest(trainer.id)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: index < totalCount - 1 ? 1 : 0,
        borderBottomColor: '#f3f4f6',
        backgroundColor: 'transparent',
      }}
    >
      <View style={{
        width: 50,
        height: 50,
        backgroundColor: '#f3f3f3',
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#e5e7eb'
      }}>
        <Text style={{ 
          fontSize: 16, 
          color: '#374151', 
          fontWeight: 'bold' 
        }}>
          {trainer.full_name.split(' ').map(n => n[0]).join('')}
        </Text>
      </View>
      
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{
            fontSize: fontSize,
            fontWeight: '600',
            color: '#1f2937',
            flex: 1
          }}>
            {trainer.full_name}
          </Text>
          <View style={{
            backgroundColor: '#3b82f6',
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 4
          }}>
            <Text style={{
              fontSize: fontSize - 3,
              color: 'white',
              fontWeight: '600'
            }}>
              {trainer.trainer_code}
            </Text>
          </View>
        </View>
        
        <Text style={{
          fontSize: fontSize - 2,
          color: '#6b7280',
          marginBottom: 4
        }}>
          {trainer.email}
        </Text>
        
        {trainer.specialization && (
          <Text style={{
            fontSize: fontSize - 2,
            color: '#10b981',
            fontWeight: '500'
          }}>
            • {trainer.specialization}
          </Text>
        )}
      </View>

      <View style={{
        paddingLeft: 12,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <View style={{
          backgroundColor: '#f0f9ff',
          padding: 8,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#3b82f6'
        }}>
          <Feather name="user-plus" size={16} color="#3b82f6" />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
      <KeyboardAvoidingView {...keyboardAvoidingViewProps}>
        <ScrollView
          {...scrollViewProps}
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
                  My Trainer
                </Text>
                <Text style={{ color: '#6b7280', fontSize: fontSize - 2 }}>
                  Manage your trainer connection and enrollment
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
                <Feather name="user-check" size={20} color="white" />
              </View>
            </View>
          </View>

          {isLoading ? (
            /* Loading State */
            <View style={{
              backgroundColor: 'white',
              padding: cardPadding,
              borderRadius: 16,
              marginBottom: spacing,
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
                Loading trainer information...
              </Text>
            </View>
          ) : currentTrainer && currentTrainer.enrollment_status === 'approved' ? (
            /* Current Trainer */
            <>
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
                  Current Trainer
                </Text>
                
                <TrainerCard trainer={currentTrainer} isCurrentTrainer={true} />
                
                <View style={{
                  backgroundColor: '#f0fdf4',
                  padding: 16,
                  borderRadius: 12,
                  marginTop: 16,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Feather name="info" size={20} color="#10b981" />
                  <Text style={{
                    fontSize: fontSize - 1,
                    color: '#059669',
                    marginLeft: 12,
                    flex: 1,
                    lineHeight: 20
                  }}>
                    You are successfully enrolled with this trainer. They can now create workout plans and track your progress.
                  </Text>
                </View>
              </View>

              {/* Trainer Actions */}
              <View style={{
                backgroundColor: 'white',
                padding: cardPadding,
                borderRadius: 12,
                marginBottom: spacing,
              }}>
                <Text style={{
                  fontSize: fontSize + 2,
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: 16
                }}>
                  Trainer Actions
                </Text>
                
                <Pressable
                  onPress={() => Alert.alert('Contact Trainer', 'Contact trainer functionality coming soon!')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: '#f3f3f3',
                    borderRadius: 8,
                    marginBottom: 8
                  }}
                >
                  <Feather name="mail" size={20} color="#3b82f6" />
                  <Text style={{
                    fontSize: fontSize,
                    fontWeight: '500',
                    color: '#1f2937',
                    marginLeft: 12
                  }}>
                    Contact Trainer
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Feather name="chevron-right" size={20} color="#6b7280" />
                </Pressable>

                <Pressable
                  onPress={() => setShowTrainerSearch(!showTrainerSearch)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: '#f0f9ff',
                    borderRadius: 8,
                    marginBottom: 8
                  }}
                >
                  <Feather name="search" size={20} color="#3b82f6" />
                  <Text style={{
                    fontSize: fontSize,
                    fontWeight: '500',
                    color: '#3b82f6',
                    marginLeft: 12
                  }}>
                    Search Other Trainers
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Feather name={showTrainerSearch ? "chevron-up" : "chevron-down"} size={20} color="#3b82f6" />
                </Pressable>

                <Pressable
                  onPress={handleUnenrollment}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: '#fef2f2',
                    borderRadius: 8,
                  }}
                >
                  <Feather name="user-x" size={20} color="#ef4444" />
                  <Text style={{
                    fontSize: fontSize,
                    fontWeight: '500',
                    color: '#ef4444',
                    marginLeft: 12
                  }}>
                    Unenroll from Trainer
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Feather name="chevron-right" size={20} color="#ef4444" />
                </Pressable>
              </View>

              {/* Expandable Search Section for Current Trainer */}
              {showTrainerSearch && (
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
                    Search for Trainers
                  </Text>
                  
                  {/* Search Mode Toggle */}
                  <View style={{
                    flexDirection: 'row',
                    backgroundColor: '#f3f4f6',
                    borderRadius: 8,
                    padding: 4,
                    marginBottom: 16
                  }}>
                    <Pressable
                      onPress={() => {
                        setSearchMode('code');
                        clearSearch();
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        backgroundColor: searchMode === 'code' ? '#3b82f6' : 'transparent',
                        borderRadius: 6,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{
                        fontSize: fontSize - 1,
                        fontWeight: '600',
                        color: searchMode === 'code' ? 'white' : '#6b7280'
                      }}>
                        By Code
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      onPress={() => {
                        setSearchMode('name');
                        clearSearch();
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        backgroundColor: searchMode === 'name' ? '#3b82f6' : 'transparent',
                        borderRadius: 6,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{
                        fontSize: fontSize - 1,
                        fontWeight: '600',
                        color: searchMode === 'name' ? 'white' : '#6b7280'
                      }}>
                        By Name
                      </Text>
                    </Pressable>
                  </View>
                  
                  <Text style={{
                    fontSize: fontSize,
                    color: '#6b7280',
                    marginBottom: 16,
                    lineHeight: 22
                  }}>
                    {searchMode === 'code' 
                      ? 'Enter trainer code (e.g., TR001)'
                      : 'Enter trainer name to search'
                    }
                  </Text>
                  
                  <View style={{ marginBottom: 16 }}>
                    {searchMode === 'code' ? (
                      <Input
                        placeholder="Enter trainer code (e.g., TR001)"
                        value={trainerCode}
                        onChangeText={setTrainerCode}
                        autoCapitalize="characters"
                      />
                    ) : (
                      <Input
                        placeholder="Enter trainer name"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="words"
                      />
                    )}
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title={isSearching ? "Searching..." : "Search Trainer"}
                        onPress={() => handleTrainerSearch()}
                        disabled={isSearching || isEnrolling}
                      />
                    </View>
                    
                    {(searchResults.length > 0 || searchQuery || trainerCode) && (
                      <Pressable
                        onPress={clearSearch}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          backgroundColor: '#f3f4f6',
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Feather name="x" size={20} color="#6b7280" />
                      </Pressable>
                    )}
                  </View>
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <View style={{ marginTop: spacing }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 16
                      }}>
                        <Text style={{
                          fontSize: fontSize + 1,
                          fontWeight: 'bold',
                          color: '#1f2937'
                        }}>
                          Search Results
                        </Text>
                        <View style={{
                          backgroundColor: '#f0fdf4',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12
                        }}>
                          <Text style={{
                            fontSize: fontSize - 2,
                            fontWeight: '600',
                            color: '#10b981'
                          }}>
                            {searchResults.length} found
                          </Text>
                        </View>
                      </View>
                      
                      {searchResults.map((trainer, index) => (
                        <FlatTrainerItem 
                          key={trainer.id} 
                          trainer={trainer} 
                          index={index}
                          totalCount={searchResults.length}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          ) : currentTrainer && ['pending', 'viewing', 'accepting'].includes(currentTrainer.enrollment_status) ? (
            /* Enrollment Request in Progress */
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
                {currentTrainer.enrollment_status === 'pending' && 'Enrollment Request Pending'}
                {currentTrainer.enrollment_status === 'viewing' && 'Request Being Reviewed'}
                {currentTrainer.enrollment_status === 'accepting' && 'Request Being Processed'}
              </Text>
              
              <TrainerCard trainer={currentTrainer} />
              
              {/* Status-specific information cards */}
              {currentTrainer.enrollment_status === 'pending' && (
                <View style={{
                  backgroundColor: '#fefbf2',
                  padding: 16,
                  borderRadius: 12,
                  marginTop: 16,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Feather name="clock" size={20} color="#f59e0b" />
                  <Text style={{
                    fontSize: fontSize - 1,
                    color: '#d97706',
                    marginLeft: 12,
                    flex: 1,
                    lineHeight: 20
                  }}>
                    Your enrollment request is pending. The trainer will review and respond to your request soon.
                  </Text>
                </View>
              )}
              
              {currentTrainer.enrollment_status === 'viewing' && (
                <View style={{
                  backgroundColor: '#f0f9ff',
                  padding: 16,
                  borderRadius: 12,
                  marginTop: 16,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Feather name="eye" size={20} color="#3b82f6" />
                  <Text style={{
                    fontSize: fontSize - 1,
                    color: '#1e40af',
                    marginLeft: 12,
                    flex: 1,
                    lineHeight: 20
                  }}>
                    Great news! Your trainer is currently reviewing your enrollment request. They should respond shortly.
                  </Text>
                </View>
              )}
              
              {currentTrainer.enrollment_status === 'accepting' && (
                <View style={{
                  backgroundColor: '#f0fdf4',
                  padding: 16,
                  borderRadius: 12,
                  marginTop: 16,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Feather name="check-circle" size={20} color="#10b981" />
                  <Text style={{
                    fontSize: fontSize - 1,
                    color: '#059669',
                    marginLeft: 12,
                    flex: 1,
                    lineHeight: 20
                  }}>
                    Excellent! Your trainer is processing your enrollment. You should be enrolled very soon!
                  </Text>
                </View>
              )}
              
              {/* Progress indicator */}
              <View style={{
                marginTop: 16,
                backgroundColor: '#f3f3f3',
                padding: 16,
                borderRadius: 12
              }}>
                <Text style={{
                  fontSize: fontSize - 1,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 12
                }}>
                  Enrollment Progress
                </Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#10b981',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8
                    }}>
                      <Feather name="check" size={16} color="white" />
                    </View>
                    <Text style={{ fontSize: fontSize - 3, color: '#6b7280', textAlign: 'center' }}>
                      Requested
                    </Text>
                  </View>
                  
                  <View style={{ flex: 1, height: 2, backgroundColor: currentTrainer.enrollment_status === 'pending' ? '#e5e7eb' : '#10b981', marginHorizontal: 8 }} />
                  
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: ['viewing', 'accepting'].includes(currentTrainer.enrollment_status) ? '#10b981' : '#e5e7eb',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8
                    }}>
                      <Feather name={['viewing', 'accepting'].includes(currentTrainer.enrollment_status) ? 'check' : 'eye'} size={16} color={['viewing', 'accepting'].includes(currentTrainer.enrollment_status) ? 'white' : '#6b7280'} />
                    </View>
                    <Text style={{ fontSize: fontSize - 3, color: '#6b7280', textAlign: 'center' }}>
                      Reviewing
                    </Text>
                  </View>
                  
                  <View style={{ flex: 1, height: 2, backgroundColor: currentTrainer.enrollment_status === 'accepting' ? '#10b981' : '#e5e7eb', marginHorizontal: 8 }} />
                  
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#e5e7eb',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8
                    }}>
                      <Feather name="user-check" size={16} color="#6b7280" />
                    </View>
                    <Text style={{ fontSize: fontSize - 3, color: '#6b7280', textAlign: 'center' }}>
                      Enrolled
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            /* No Trainer - Find Trainer */
            <>
              {/* Enhanced Search */}
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
                  Find Your Trainer
                </Text>
                
                {/* Search Mode Toggle */}
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: '#f3f4f6',
                  borderRadius: 8,
                  padding: 4,
                  marginBottom: 16
                }}>
                  <Pressable
                    onPress={() => {
                      setSearchMode('code');
                      clearSearch();
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: searchMode === 'code' ? '#3b82f6' : 'transparent',
                      borderRadius: 6,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      fontSize: fontSize - 1,
                      fontWeight: '600',
                      color: searchMode === 'code' ? 'white' : '#6b7280'
                    }}>
                      By Code
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    onPress={() => {
                      setSearchMode('name');
                      clearSearch();
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: searchMode === 'name' ? '#3b82f6' : 'transparent',
                      borderRadius: 6,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      fontSize: fontSize - 1,
                      fontWeight: '600',
                      color: searchMode === 'name' ? 'white' : '#6b7280'
                    }}>
                      By Name
                    </Text>
                  </Pressable>
                </View>
                
                <Text style={{
                  fontSize: fontSize,
                  color: '#6b7280',
                  marginBottom: 16,
                  lineHeight: 22
                }}>
                  {searchMode === 'code' 
                    ? 'Enter your trainer\'s code (e.g., TR001)'
                    : 'Enter your trainer\'s name to search'
                  }
                </Text>
                
                <View style={{ marginBottom: 16 }}>
                  {searchMode === 'code' ? (
                    <Input
                      placeholder="Enter trainer code (e.g., TR001)"
                      value={trainerCode}
                      onChangeText={setTrainerCode}
                      autoCapitalize="characters"
                    />
                  ) : (
                    <Input
                      placeholder="Enter trainer name"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="words"
                    />
                  )}
                </View>
                
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={isSearching ? "Searching..." : "Search Trainer"}
                      onPress={() => handleTrainerSearch()}
                      disabled={isSearching || isEnrolling}
                    />
                  </View>
                  
                  {(searchResults.length > 0 || searchQuery || trainerCode) && (
                    <Pressable
                      onPress={clearSearch}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor: '#f3f4f6',
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Feather name="x" size={20} color="#6b7280" />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Search Results - Flat Design */}
              {searchResults.length > 0 && (
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 16,
                  marginBottom: spacing,
                  overflow: 'hidden'
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: cardPadding,
                    paddingTop: cardPadding,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6'
                  }}>
                    <View>
                      <Text style={{
                        fontSize: fontSize + 2,
                        fontWeight: 'bold',
                        color: '#1f2937'
                      }}>
                        Search Results
                      </Text>
                      <Text style={{
                        fontSize: fontSize - 1,
                        color: '#6b7280',
                        marginTop: 2
                      }}>
                        Tap to send enrollment request
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: '#f0fdf4',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#dcfce7'
                    }}>
                      <Text style={{
                        fontSize: fontSize - 2,
                        fontWeight: '600',
                        color: '#10b981'
                      }}>
                        {searchResults.length} found
                      </Text>
                    </View>
                  </View>
                  
                  {searchResults.map((trainer, index) => (
                    <FlatTrainerItem 
                      key={trainer.id} 
                      trainer={trainer} 
                      index={index}
                      totalCount={searchResults.length}
                    />
                  ))}
                </View>
              )}

              {/* Available Trainers - Flat Design */}
              {availableTrainers.length > 0 && (
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 16,
                  marginBottom: spacing,
                  overflow: 'hidden'
                }}>
                  <View style={{
                    paddingHorizontal: cardPadding,
                    paddingTop: cardPadding,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f3f4f6'
                  }}>
                    <Text style={{
                      fontSize: fontSize + 2,
                      fontWeight: 'bold',
                      color: '#1f2937'
                    }}>
                      Available Trainers
                    </Text>
                    <Text style={{
                      fontSize: fontSize - 1,
                      color: '#6b7280',
                      marginTop: 4
                    }}>
                      Tap to send enrollment request
                    </Text>
                  </View>
                  
                  {availableTrainers.slice(0, 5).map((trainer, index) => (
                    <FlatTrainerItem 
                      key={trainer.id} 
                      trainer={trainer} 
                      index={index}
                      totalCount={Math.min(availableTrainers.length, 5)}
                    />
                  ))}
                  
                  {availableTrainers.length > 5 && (
                    <View style={{
                      borderTopWidth: 1,
                      borderTopColor: '#f3f4f6'
                    }}>
                      <Pressable
                        style={{
                          padding: 16,
                          backgroundColor: '#f3f3f3',
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center'
                        }}
                        onPress={() => {
                          // TODO: Show all trainers

                        }}
                      >
                        <Feather name="chevron-down" size={16} color="#3b82f6" />
                        <Text style={{
                          fontSize: fontSize,
                          fontWeight: '600',
                          color: '#3b82f6',
                          marginLeft: 8
                        }}>
                          View All Trainers ({availableTrainers.length})
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {/* Info Card */}
              <View style={{
                backgroundColor: '#f0f9ff',
                padding: cardPadding,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#e0f2fe',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Feather name="info" size={20} color="#0284c7" />
                  <Text style={{
                    fontSize: fontSize,
                    fontWeight: '600',
                    color: '#0284c7',
                    marginLeft: 8
                  }}>
                    How to Connect with a Trainer
                  </Text>
                </View>
                <Text style={{
                  fontSize: fontSize - 1,
                  color: '#0369a1',
                  lineHeight: 20,
                  marginBottom: 12
                }}>
                  1. Get a trainer code from your preferred trainer{'\n'}
                  2. Enter the code above and search{'\n'}
                  3. Send an enrollment request{'\n'}
                  4. Wait for the trainer to approve your request{'\n'}
                  5. Start your fitness journey together!
                </Text>
                
                {/* Example Search */}
                <View style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.3)'
                }}>
                  <Text style={{
                    fontSize: fontSize - 2,
                    fontWeight: '600',
                    color: '#0284c7',
                    marginBottom: 6
                  }}>
                    💡 Try searching:
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: fontSize - 2, color: '#0369a1', marginRight: 8 }}>
                      • Code:
                    </Text>
                    <Pressable
                      onPress={() => {
                        setSearchMode('code');
                        setTrainerCode('TR001');
                        clearSearch();
                      }}
                      style={{
                        backgroundColor: '#3b82f6',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4
                      }}
                    >
                      <Text style={{ fontSize: fontSize - 3, color: 'white', fontWeight: '600' }}>
                        TR001
                      </Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: fontSize - 2, color: '#0369a1', marginRight: 8 }}>
                      • Name:
                    </Text>
                    <Pressable
                      onPress={() => {
                        setSearchMode('name');
                        setSearchQuery('Test');
                        clearSearch();
                      }}
                      style={{
                        backgroundColor: '#3b82f6',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4
                      }}
                    >
                      <Text style={{ fontSize: fontSize - 3, color: 'white', fontWeight: '600' }}>
                        Test
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </>
          )}

        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
