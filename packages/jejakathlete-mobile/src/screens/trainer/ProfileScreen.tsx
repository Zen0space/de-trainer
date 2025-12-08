import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ScrollView, RefreshControl, TextInput } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { useStableTextInput } from '../../hooks/useStableTextInput';

// Stable EditField component using uncontrolled inputs to prevent keyboard dismissal
const StableEditField = React.memo(({ 
  label, 
  value, 
  initialValue,
  keyboardType, 
  autoCapitalize, 
  placeholder, 
  error,
  fontSize,
  isEditing,
  onGetValue,
  icon
}: {
  label: string;
  value: string | null;
  initialValue: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
  placeholder?: string;
  error?: string;
  fontSize: number;
  isEditing: boolean;
  onGetValue: (getValue: () => string) => void;
  icon?: string;
}) => {
  // Use stable text input hook to prevent keyboard dismissal
  const stableInput = useStableTextInput({
    initialValue: initialValue,
    validateOnBlur: false, // Don't update on blur, only on save button
  });

  // Provide getValue function to parent component
  React.useEffect(() => {
    onGetValue(stableInput.getValue);
  }, [onGetValue, stableInput.getValue]);

  // Stable style objects using useMemo
  const containerStyle = useMemo(() => ({
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  }), []);

  const labelStyle = useMemo(() => ({
    fontSize: fontSize - 2,
    color: '#6b7280',
    marginBottom: 8
  }), [fontSize]);

  const inputStyle = useMemo(() => ({
    borderWidth: 1,
    borderColor: error ? '#ef4444' : '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize,
    backgroundColor: 'white',
  }), [error, fontSize]);

  const valueStyle = useMemo(() => ({
    fontSize: fontSize,
    fontWeight: '500' as const,
    color: '#1f2937'
  }), [fontSize]);

  const errorStyle = useMemo(() => ({
    color: '#ef4444',
    fontSize: fontSize - 2,
    marginTop: 4
  }), [fontSize]);

  return (
    <View style={containerStyle}>
      <View style={{
        flexDirection: 'row',
        alignItems: isEditing ? 'flex-start' : 'center',
      }}>
        {icon && (
          <View style={{
            width: 32,
            height: 32,
            backgroundColor: '#f3f3f3',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            marginTop: isEditing ? 24 : 0, // Align with input when editing
          }}>
            <Feather name={icon as any} size={16} color="#6b7280" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={labelStyle}>
            {label}
          </Text>
          {isEditing ? (
            <View>
              <TextInput
                ref={stableInput.inputRef}
                style={inputStyle}
                placeholder={placeholder || label}
                keyboardType={keyboardType || 'default'}
                autoCapitalize={autoCapitalize || 'words'}
                {...stableInput.inputProps}
              />
              {error && (
                <Text style={errorStyle}>
                  {error}
                </Text>
              )}
            </View>
          ) : (
            <Text style={valueStyle}>
              {value || 'Not provided'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
});

interface TrainerProfile {
  // User information
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  is_verified: boolean;
  
  // Trainer information
  user_id: number;
  trainer_code: string;
  certification_id: string | null;
  specialization: string | null;
  verification_status: string;
}

interface EditForm {
  full_name: string;
  email: string;
  certification_id: string;
  specialization: string;
}

export function ProfileScreen({ onBack }: { onBack: () => void }) {
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
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: '',
    email: '',
    certification_id: '',
    specialization: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Refs to get values from stable inputs (prevents keyboard dismissal)
  const getFullNameValue = useRef<() => string>(() => '');
  const getEmailValue = useRef<() => string>(() => '');
  const getCertificationIdValue = useRef<() => string>(() => '');
  const getSpecializationValue = useRef<() => string>(() => '');

  // Fetch profile data
  const fetchProfile = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Use tRPC to get profile
      const profileData = await trpc.profiles.getProfile.query();

      if (profileData && profileData.trainer_data) {
        setProfile({
          id: profileData.id as any,
          username: profileData.username || '',
          email: user.email || '',
          full_name: profileData.full_name || '',
          role: profileData.role,
          created_at: profileData.created_at,
          is_verified: profileData.is_verified,
          user_id: profileData.trainer_data.user_id as any,
          trainer_code: profileData.trainer_data.trainer_code,
          certification_id: profileData.trainer_data.certification_id,
          specialization: profileData.trainer_data.specialization,
          verification_status: profileData.trainer_data.verification_status,
        });
      } else {
        Alert.alert('Error', 'Trainer profile not found. Please complete your registration.');
      }
    } catch (error: any) {
      console.error('❌ Error fetching profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile. Please try again.');
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

  // Simple form handlers
  const handleEditProfile = () => {
    if (!profile) return;
    
    setEditForm({
      full_name: profile.full_name,
      email: profile.email,
      certification_id: profile.certification_id || '',
      specialization: profile.specialization || '',
    });
    setEditErrors({});
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditErrors({});
  };


  // Validate edit form
  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editForm.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    if (!editForm.email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save profile - gets values from stable inputs to prevent keyboard issues
  const handleSaveProfile = async () => {
    // Get current values from stable inputs
    const currentValues = {
      full_name: getFullNameValue.current(),
      email: getEmailValue.current(),
      certification_id: getCertificationIdValue.current(),
      specialization: getSpecializationValue.current(),
    };

    // Update editForm for validation
    setEditForm(currentValues);

    // Validate with current values
    const errors: Record<string, string> = {};

    if (!currentValues.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    if (!currentValues.email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(currentValues.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    setEditErrors(errors);
    
    if (Object.keys(errors).length > 0 || !profile) return;

    setIsUpdating(true);
    try {
      // Update profile using tRPC
      await trpc.profiles.updateProfile.mutate({
        full_name: currentValues.full_name,
        certification_id: currentValues.certification_id || undefined,
        specialization: currentValues.specialization || undefined,
      });

      // Note: Email update is not supported in this version
      // as it requires additional verification flow
      if (currentValues.email !== profile.email) {
        Alert.alert(
          'Note',
          'Email update requires verification. Please update your email through the settings page.'
        );
      }

      // Refresh profile data
      await fetchProfile();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
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

  // Get verification status color and text
  const getVerificationStatus = (status: string) => {
    switch (status) {
      case 'approved':
        return { color: '#10b981', bg: '#f0fdf4', text: 'Verified' };
      case 'pending':
        return { color: '#f59e0b', bg: '#fefbf2', text: 'Pending' };
      case 'rejected':
        return { color: '#ef4444', bg: '#fef2f2', text: 'Rejected' };
      default:
        return { color: '#6b7280', bg: '#f3f3f3', text: 'Unknown' };
    }
  };

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
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
          backgroundColor: '#f3f3f3',
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
      <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
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
      <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
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

  const verificationStatus = getVerificationStatus(profile.verification_status);

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
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
        keyboardShouldPersistTaps="handled"
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
                  Profile
                </Text>
                <Text style={{ color: '#6b7280', fontSize: fontSize - 2 }}>
                  Your trainer profile information
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {isEditing ? (
                  <>
                    <Pressable
                      onPress={handleCancelEdit}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: '#6b7280',
                      }}
                    >
                      <Feather name="x" size={20} color="white" />
                    </Pressable>
                    <Pressable
                      onPress={handleSaveProfile}
                      disabled={isUpdating}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: isUpdating ? '#9ca3af' : '#10b981',
                      }}
                    >
                      {isUpdating ? (
                        <Feather name="loader" size={20} color="white" />
                      ) : (
                        <Feather name="check" size={20} color="white" />
                      )}
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={handleEditProfile}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: '#3b82f6',
                    }}
                  >
                    <Feather name="edit-2" size={20} color="white" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {/* Profile Header */}
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 16,
            marginBottom: spacing,
            alignItems: 'center',
          }}>
            {/* Avatar */}
            <View style={{
              width: 100,
              height: 100,
              backgroundColor: '#3b82f6',
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
              backgroundColor: verificationStatus.bg,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4
            }}>
              <Feather 
                name={profile.verification_status === 'approved' ? 'check-circle' : 
                      profile.verification_status === 'pending' ? 'clock' : 'x-circle'} 
                size={14} 
                color={verificationStatus.color} 
              />
              <Text style={{ 
                color: verificationStatus.color, 
                fontSize: 12, 
                fontWeight: '600',
                marginLeft: 4
              }}>
                {verificationStatus.text.toUpperCase()} TRAINER
              </Text>
            </View>

            <Text style={{
              fontSize: fontSize - 2,
              color: '#6b7280',
              textAlign: 'center'
            }}>
              Trainer Code: {profile.trainer_code}
            </Text>
          </View>

          {/* Personal Information */}
          <InfoCard title="Personal Information">
            <InfoRow label="Username" value={profile.username} icon="at-sign" />
            <StableEditField 
              label="Full Name" 
              value={profile.full_name}
              initialValue={profile.full_name}
              onGetValue={(getValue) => { getFullNameValue.current = getValue; }}
              error={editErrors.full_name}
              autoCapitalize="words"
              placeholder="Enter your full name"
              fontSize={fontSize}
              isEditing={isEditing}
              icon="user"
            />
            <StableEditField 
              label="Email Address" 
              value={profile.email}
              initialValue={profile.email}
              onGetValue={(getValue) => { getEmailValue.current = getValue; }}
              error={editErrors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your email address"
              fontSize={fontSize}
              isEditing={isEditing}
              icon="mail"
            />
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
                backgroundColor: '#f3f3f3',
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

          {/* Trainer Information */}
          <InfoCard title="Trainer Information">
            <InfoRow label="Trainer Code" value={profile.trainer_code} icon="hash" />
            <StableEditField 
              label="Certification ID" 
              value={profile.certification_id}
              initialValue={profile.certification_id || ''}
              onGetValue={(getValue) => { getCertificationIdValue.current = getValue; }}
              placeholder="Enter certification ID (optional)"
              fontSize={fontSize}
              isEditing={isEditing}
              icon="award"
            />
            <StableEditField 
              label="Specialization" 
              value={profile.specialization}
              initialValue={profile.specialization || ''}
              onGetValue={(getValue) => { getSpecializationValue.current = getValue; }}
              placeholder="Enter your specialization (optional)"
              fontSize={fontSize}
              isEditing={isEditing}
              icon="target"
            />
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 8,
            }}>
              <View style={{
                width: 32,
                height: 32,
                backgroundColor: '#f3f3f3',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Feather 
                  name={profile.verification_status === 'approved' ? 'check-circle' : 
                        profile.verification_status === 'pending' ? 'clock' : 'x-circle'} 
                  size={16} 
                  color={verificationStatus.color} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#6b7280',
                  marginBottom: 2
                }}>
                  Verification Status
                </Text>
                <Text style={{
                  fontSize: fontSize,
                  fontWeight: '500',
                  color: verificationStatus.color
                }}>
                  {verificationStatus.text}
                </Text>
              </View>
            </View>
          </InfoCard>

          {/* Quick Actions */}
          <View style={{
            backgroundColor: 'white',
            padding: cardPadding,
            borderRadius: 12,
          }}>
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 16
            }}>
              Quick Actions
            </Text>
            
            {!isEditing && (
              <Pressable
                onPress={handleEditProfile}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  backgroundColor: '#f3f3f3',
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
            )}

            <Pressable
              onPress={() => Alert.alert('Change Password', 'Change password functionality coming soon!')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                backgroundColor: '#f3f3f3',
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
