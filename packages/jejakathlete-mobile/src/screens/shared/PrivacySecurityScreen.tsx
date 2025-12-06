import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';

import { formatTimeAgoShort } from '../../lib/date-utils';
import * as SecureStore from 'expo-secure-store';

interface Session {
  id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  location: string;
  last_active: string;
  created_at: string;
  is_current: boolean;
}

interface PrivacySecurityScreenProps {
  onBack: () => void;
}

export function PrivacySecurityScreen({ onBack }: PrivacySecurityScreenProps) {
  const { width } = useWindowDimensions();
  const { user, logout } = useSession();
  
  // State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [cookiesEnabled, setCookiesEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const sectionTitleFontSize = isSmallScreen ? 16 : isTablet ? 20 : 18;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;

  // Load sessions and settings
  useEffect(() => {
    loadSessionsAndSettings();
  }, [user?.id]);

  const loadSessionsAndSettings = async () => {
    setLoading(true);
    try {
      // Load mock sessions (in production, fetch from backend)
      const mockSessions: Session[] = [
        {
          id: '1',
          device_name: 'iPhone 14 Pro',
          device_type: 'mobile',
          ip_address: '192.168.1.100',
          location: 'San Francisco, CA',
          last_active: new Date().toISOString(),
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          is_current: true,
        },
        {
          id: '2',
          device_name: 'MacBook Pro',
          device_type: 'desktop',
          ip_address: '192.168.1.101',
          location: 'San Francisco, CA',
          last_active: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_current: false,
        },
      ];
      setSessions(mockSessions);



      // Load settings from SecureStore
      const cookies = await SecureStore.getItemAsync('cookies_enabled');
      const analytics = await SecureStore.getItemAsync('analytics_enabled');
      const twoFactor = await SecureStore.getItemAsync('two_factor_enabled');
      
      setCookiesEnabled(cookies !== 'false');
      setAnalyticsEnabled(analytics === 'true');
      setTwoFactorEnabled(twoFactor === 'true');
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    if (session.is_current) {
      Alert.alert(
        'End Current Session',
        'This will sign you out of the app. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              await logout();
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'End Session',
        `End session on ${session.device_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End Session',
            style: 'destructive',
            onPress: () => {
              setSessions(prev => prev.filter(s => s.id !== sessionId));
              Alert.alert('Success', 'Session ended successfully');
            },
          },
        ]
      );
    }
  };

  const handleEndAllOtherSessions = () => {
    const otherSessions = sessions.filter(s => !s.is_current);
    if (otherSessions.length === 0) {
      Alert.alert('No Other Sessions', 'You only have one active session');
      return;
    }

    Alert.alert(
      'End All Other Sessions',
      `This will end ${otherSessions.length} other session${otherSessions.length > 1 ? 's' : ''}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End All',
          style: 'destructive',
          onPress: () => {
            setSessions(prev => prev.filter(s => s.is_current));
            Alert.alert('Success', 'All other sessions ended');
          },
        },
      ]
    );
  };



  const toggleCookies = async (value: boolean) => {
    setCookiesEnabled(value);
    await SecureStore.setItemAsync('cookies_enabled', value.toString());
  };

  const toggleAnalytics = async (value: boolean) => {
    setAnalyticsEnabled(value);
    await SecureStore.setItemAsync('analytics_enabled', value.toString());
  };

  const toggleTwoFactor = async (value: boolean) => {
    if (value) {
      Alert.alert(
        'Enable Two-Factor Authentication',
        'Two-factor authentication adds an extra layer of security. Coming soon!',
        [{ text: 'OK' }]
      );
    } else {
      setTwoFactorEnabled(value);
      await SecureStore.setItemAsync('two_factor_enabled', value.toString());
    }
  };

  const Section = ({ 
    icon, 
    title, 
    children 
  }: { 
    icon: string; 
    title: string; 
    children: React.ReactNode;
  }) => (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 12,
      padding: spacing + 4,
      marginBottom: spacing,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing }}>
        <View style={{
          width: 36,
          height: 36,
          backgroundColor: '#f0f9ff',
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12
        }}>
          <Feather name={icon as any} size={18} color="#3b82f6" />
        </View>
        <Text style={{
          fontSize: sectionTitleFontSize,
          fontWeight: 'bold',
          color: '#1f2937',
          flex: 1
        }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );

  const SettingRow = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
    showSwitch = true,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    showSwitch?: boolean;
  }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
    }}>
      <View style={{
        width: 32,
        height: 32,
        backgroundColor: '#f3f4f6',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
      }}>
        <Feather name={icon as any} size={16} color="#6b7280" />
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: fontSize,
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: subtitle ? 2 : 0
        }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{
            fontSize: fontSize - 2,
            color: '#6b7280'
          }}>
            {subtitle}
          </Text>
        )}
      </View>
      
      {showSwitch && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
          thumbColor={value ? '#3b82f6' : '#f3f4f6'}
        />
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingBottom: containerPadding + 100 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{
          backgroundColor: 'white',
          padding: containerPadding,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                color: '#1f2937'
              }}>
                Privacy & Security
              </Text>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#6b7280',
                marginTop: 2
              }}>
                Manage sessions, cookies, and security
              </Text>
            </View>
            
            <View style={{
              width: 40,
              height: 40,
              backgroundColor: '#3b82f6',
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Feather name="shield" size={20} color="white" />
            </View>
          </View>
        </View>

        <View style={{ padding: containerPadding }}>
          <View style={{ maxWidth: isTablet ? 800 : 600, alignSelf: 'center', width: '100%' }}>
            
            {loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={{ marginTop: 16, color: '#6b7280', fontSize: fontSize }}>
                  Loading settings...
                </Text>
              </View>
            ) : (
              <>
                {/* Active Sessions */}
                <Section icon="smartphone" title="Active Sessions">
                  <Text style={{
                    fontSize: fontSize - 1,
                    color: '#6b7280',
                    marginBottom: 12
                  }}>
                    Manage devices where you're currently signed in
                  </Text>
                  
                  {sessions.map((session, index) => (
                    <View
                      key={session.id}
                      style={{
                        backgroundColor: session.is_current ? '#f0f9ff' : '#f9fafb',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: index < sessions.length - 1 ? 12 : 0,
                        borderWidth: session.is_current ? 1 : 0,
                        borderColor: '#bfdbfe',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          backgroundColor: session.is_current ? '#dbeafe' : '#f3f4f6',
                          borderRadius: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          <Feather 
                            name={session.device_type === 'mobile' ? 'smartphone' : 'monitor'} 
                            size={18} 
                            color={session.is_current ? '#3b82f6' : '#6b7280'} 
                          />
                        </View>
                        
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{
                              fontSize: fontSize,
                              fontWeight: '600',
                              color: '#1f2937',
                              flex: 1
                            }}>
                              {session.device_name}
                            </Text>
                            {session.is_current && (
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
                                  CURRENT
                                </Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                            <Feather name="map-pin" size={12} color="#9ca3af" />
                            <Text style={{
                              fontSize: fontSize - 2,
                              color: '#6b7280',
                              marginLeft: 4
                            }}>
                              {session.location}
                            </Text>
                          </View>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                            <Feather name="wifi" size={12} color="#9ca3af" />
                            <Text style={{
                              fontSize: fontSize - 2,
                              color: '#6b7280',
                              marginLeft: 4
                            }}>
                              {session.ip_address}
                            </Text>
                          </View>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="clock" size={12} color="#9ca3af" />
                            <Text style={{
                              fontSize: fontSize - 2,
                              color: '#6b7280',
                              marginLeft: 4
                            }}>
                              Last active {formatTimeAgoShort(session.last_active)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <Pressable
                        onPress={() => handleEndSession(session.id)}
                        style={{
                          backgroundColor: session.is_current ? '#fee2e2' : '#fef2f2',
                          borderRadius: 6,
                          padding: 10,
                          alignItems: 'center',
                          marginTop: 8
                        }}
                      >
                        <Text style={{
                          fontSize: fontSize - 1,
                          fontWeight: '600',
                          color: '#dc2626'
                        }}>
                          {session.is_current ? 'Sign Out' : 'End Session'}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                  
                  {sessions.filter(s => !s.is_current).length > 0 && (
                    <Pressable
                      onPress={handleEndAllOtherSessions}
                      style={{
                        backgroundColor: '#fef2f2',
                        borderRadius: 8,
                        padding: 12,
                        alignItems: 'center',
                        marginTop: 12,
                        borderWidth: 1,
                        borderColor: '#fecaca'
                      }}
                    >
                      <Text style={{
                        fontSize: fontSize,
                        fontWeight: '600',
                        color: '#dc2626'
                      }}>
                        End All Other Sessions
                      </Text>
                    </Pressable>
                  )}
                </Section>

                {/* Security Settings */}
                <Section icon="shield" title="Security Settings">
                  <SettingRow
                    icon="lock"
                    title="Two-Factor Authentication"
                    subtitle="Add an extra layer of security"
                    value={twoFactorEnabled}
                    onValueChange={toggleTwoFactor}
                  />
                </Section>

                {/* Privacy Settings */}
                <Section icon="eye" title="Privacy Settings">
                  <SettingRow
                    icon="cookie"
                    title="Cookies"
                    subtitle="Allow cookies for better experience"
                    value={cookiesEnabled}
                    onValueChange={toggleCookies}
                  />
                  
                  <SettingRow
                    icon="bar-chart-2"
                    title="Analytics"
                    subtitle="Help us improve the app"
                    value={analyticsEnabled}
                    onValueChange={toggleAnalytics}
                  />
                  
                  <View style={{
                    backgroundColor: '#f0fdf4',
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: '#10b981'
                  }}>
                    <Text style={{
                      fontSize: fontSize - 1,
                      color: '#065f46',
                      lineHeight: (fontSize - 1) * 1.5
                    }}>
                      We never sell your data. Analytics help us understand app usage and improve features.
                    </Text>
                  </View>
                </Section>



                {/* Account Actions */}
                <Section icon="alert-triangle" title="Account Actions">
                  <Pressable
                    onPress={() => Alert.alert('Export Data', 'Data export coming soon!')}
                    style={{
                      backgroundColor: '#f0f9ff',
                      borderRadius: 8,
                      padding: 12,
                      alignItems: 'center',
                      marginBottom: 12
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Feather name="download" size={16} color="#3b82f6" />
                      <Text style={{
                        fontSize: fontSize,
                        fontWeight: '600',
                        color: '#3b82f6',
                        marginLeft: 8
                      }}>
                        Export My Data
                      </Text>
                    </View>
                  </Pressable>
                  
                  <Pressable
                    onPress={() => Alert.alert('Delete Account', 'Account deletion coming soon!')}
                    style={{
                      backgroundColor: '#fef2f2',
                      borderRadius: 8,
                      padding: 12,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#fecaca'
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Feather name="user-x" size={16} color="#dc2626" />
                      <Text style={{
                        fontSize: fontSize,
                        fontWeight: '600',
                        color: '#dc2626',
                        marginLeft: 8
                      }}>
                        Delete Account
                      </Text>
                    </View>
                  </Pressable>
                </Section>
              </>
            )}

          </View>
        </View>
      </ScrollView>
    </View>
  );
}
