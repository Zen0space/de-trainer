import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ScrollView, RefreshControl } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { AthleteProfileScreen } from './AthleteProfileScreen';
import { tursoDbHelpers } from '../../lib/turso-database';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export function AthleteSettingsScreen() {
  const { user, logout } = useSession();
  const { width } = useWindowDimensions();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const cardPadding = isSmallScreen ? 16 : isTablet ? 24 : 20;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;

  // Fetch notifications
  const fetchNotifications = async (showRefreshing = false) => {
    if (!user?.id) return;
    
    if (showRefreshing) {
      setIsRefreshing(true);
    }

    try {
      const userNotifications = await tursoDbHelpers.all(`
        SELECT 
          id, type, title, message, data, is_read, created_at, read_at
        FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC
        LIMIT 50
      `, [user.id]);

      const unreadNotifications = await tursoDbHelpers.get(`
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = ? AND is_read = FALSE
      `, [user.id]);

      setNotifications(userNotifications || []);
      setUnreadCount(unreadNotifications?.count || 0);
      console.log('📱 Notifications loaded:', userNotifications?.length || 0);
      console.log('🔔 Unread count:', unreadNotifications?.count || 0);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      await tursoDbHelpers.run(`
        UPDATE notifications 
        SET is_read = TRUE, read_at = datetime('now')
        WHERE id = ?
      `, [notificationId]);
      
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notificationId 
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await tursoDbHelpers.run(`
        UPDATE notifications 
        SET is_read = TRUE, read_at = datetime('now')
        WHERE user_id = ? AND is_read = FALSE
      `, [user.id]);
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  // Handle refresh
  const onRefresh = () => {
    fetchNotifications(true);
  };

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications, user?.id]);

  // Load unread count on component mount
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!user?.id) return;
      
      try {
        const unreadNotifications = await tursoDbHelpers.get(`
          SELECT COUNT(*) as count 
          FROM notifications 
          WHERE user_id = ? AND is_read = FALSE
        `, [user.id]);
        
        setUnreadCount(unreadNotifications?.count || 0);
      } catch (error) {
        console.error('❌ Error loading unread count:', error);
      }
    };

    loadUnreadCount();
  }, [user?.id]);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true, 
    textColor = '#1f2937',
    iconColor = '#6b7280' 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showArrow?: boolean;
    textColor?: string;
    iconColor?: string;
  }) => (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}
    >
      <View style={{
        width: 40,
        height: 40,
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16
      }}>
        <Feather name={icon as any} size={20} color={iconColor} />
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: fontSize,
          fontWeight: '600',
          color: textColor,
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
      
      {showArrow && (
        <Feather name="chevron-right" size={20} color="#9ca3af" />
      )}
    </Pressable>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={{
      fontSize: fontSize - 1,
      fontWeight: '600',
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing * 1.5,
      marginBottom: 8,
      marginLeft: 4
    }}>
      {title}
    </Text>
  );

  // Notification Item Component
  const NotificationItem = ({ notification }: { notification: Notification }) => {
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

    const getNotificationIcon = (type: string) => {
      switch (type) {
        case 'enrollment_status_change': return 'eye';
        case 'enrollment_approved': return 'check-circle';
        case 'enrollment_rejected': return 'x-circle';
        default: return 'bell';
      }
    };

    const getNotificationColor = (type: string) => {
      switch (type) {
        case 'enrollment_status_change': return '#3b82f6';
        case 'enrollment_approved': return '#10b981';
        case 'enrollment_rejected': return '#ef4444';
        default: return '#6b7280';
      }
    };

    return (
      <Pressable
        onPress={() => {
          if (!notification.is_read) {
            markAsRead(notification.id);
          }
        }}
        style={{
          flexDirection: 'row',
          padding: 16,
          backgroundColor: notification.is_read ? 'white' : '#f0f9ff',
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
          borderLeftWidth: notification.is_read ? 0 : 4,
          borderLeftColor: '#3b82f6',
        }}
      >
        <View style={{
          width: 40,
          height: 40,
          backgroundColor: notification.is_read ? '#f8fafc' : '#f0f9ff',
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12
        }}>
          <Feather 
            name={getNotificationIcon(notification.type) as any} 
            size={18} 
            color={getNotificationColor(notification.type)} 
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: fontSize,
            fontWeight: notification.is_read ? '500' : '600',
            color: '#1f2937',
            marginBottom: 4
          }}>
            {notification.title}
          </Text>
          <Text style={{
            fontSize: fontSize - 2,
            color: '#6b7280',
            lineHeight: 18,
            marginBottom: 6
          }}>
            {notification.message}
          </Text>
          <Text style={{
            fontSize: fontSize - 3,
            color: '#9ca3af'
          }}>
            {formatDate(notification.created_at)}
          </Text>
        </View>

        {!notification.is_read && (
          <View style={{
            width: 8,
            height: 8,
            backgroundColor: '#3b82f6',
            borderRadius: 4,
            marginTop: 6
          }} />
        )}
      </Pressable>
    );
  };

  // Notifications Screen
  const NotificationsScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingBottom: containerPadding + 100 
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={{
          backgroundColor: 'white',
          padding: cardPadding,
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              onPress={() => setShowNotifications(false)}
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
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Text style={{
                  fontSize: fontSize - 2,
                  color: '#3b82f6',
                  marginTop: 2
                }}>
                  {unreadCount} unread
                </Text>
              )}
            </View>
            
            {unreadCount > 0 && (
              <Pressable
                onPress={markAllAsRead}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#3b82f6',
                  borderRadius: 6
                }}
              >
                <Text style={{
                  fontSize: fontSize - 2,
                  color: 'white',
                  fontWeight: '600'
                }}>
                  Mark All Read
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Notifications List */}
        {notifications.length > 0 ? (
          <View style={{ backgroundColor: 'white' }}>
            {notifications.map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </View>
        ) : (
          <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
            paddingHorizontal: containerPadding
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
              <Feather name="bell" size={36} color="#9ca3af" />
            </View>
            
            <Text style={{
              fontSize: fontSize + 2,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              No Notifications
            </Text>
            
            <Text style={{
              fontSize: fontSize,
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: 22,
              maxWidth: 280
            }}>
              You don't have any notifications yet. We'll notify you about important updates!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  // Show ProfileScreen if requested
  if (showProfile) {
    return <AthleteProfileScreen onBack={() => setShowProfile(false)} />;
  }

  // Show NotificationsScreen if requested
  if (showNotifications) {
    return <NotificationsScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: containerPadding,
          paddingBottom: containerPadding + 100 
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
                  Settings
                </Text>
                <Text style={{ color: '#6b7280', fontSize: fontSize - 2 }}>
                  Manage your account and app preferences
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
                <Feather name="settings" size={20} color="white" />
              </View>
            </View>
          </View>

          {/* Account Section */}
          <SectionHeader title="Account" />
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: spacing,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <SettingItem
              icon="user"
              title="Profile"
              subtitle={`${user?.full_name} • ${user?.email}`}
              onPress={() => setShowProfile(true)}
            />
            <SettingItem
              icon="key"
              title="Change Password"
              subtitle="Update your account password"
              onPress={() => Alert.alert('Password', 'Change password coming soon!')}
            />
            <SettingItem
              icon="shield"
              title="Privacy & Security"
              subtitle="Control your privacy settings"
              onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon!')}
            />
          </View>

          {/* Training Section */}
          <SectionHeader title="Training" />
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: spacing,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <SettingItem
              icon="target"
              title="Goals & Targets"
              subtitle="Set and track your fitness goals"
              onPress={() => Alert.alert('Goals', 'Goals & targets coming soon!')}
            />
            <SettingItem
              icon="activity"
              title="Workout Preferences"
              subtitle="Customize your workout experience"
              onPress={() => Alert.alert('Workouts', 'Workout preferences coming soon!')}
            />
            <SettingItem
              icon="calendar"
              title="Training Schedule"
              subtitle="Manage your training schedule"
              onPress={() => Alert.alert('Schedule', 'Training schedule coming soon!')}
            />
            <SettingItem
              icon="award"
              title="Achievements"
              subtitle="View your fitness achievements"
              onPress={() => Alert.alert('Achievements', 'Achievements coming soon!')}
            />
          </View>

          {/* Preferences Section */}
          <SectionHeader title="Preferences" />
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: spacing,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <SettingItem
              icon="bell"
              title="Notifications"
              subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : "View your notifications and alerts"}
              onPress={() => {
                setShowNotifications(true);
                // Fetch notifications when opening
                fetchNotifications();
              }}
              iconColor={unreadCount > 0 ? "#3b82f6" : "#6b7280"}
            />
            <SettingItem
              icon="moon"
              title="Dark Mode"
              subtitle="Switch between light and dark themes"
              onPress={() => Alert.alert('Theme', 'Dark mode coming soon!')}
            />
            <SettingItem
              icon="globe"
              title="Language"
              subtitle="English (US)"
              onPress={() => Alert.alert('Language', 'Language settings coming soon!')}
            />
            <SettingItem
              icon="smartphone"
              title="Units"
              subtitle="Metric • Imperial"
              onPress={() => Alert.alert('Units', 'Unit settings coming soon!')}
            />
          </View>

          {/* Data & Progress Section */}
          <SectionHeader title="Data & Progress" />
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: spacing,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <SettingItem
              icon="database"
              title="Sync Data"
              subtitle="Backup and sync your progress data"
              onPress={() => Alert.alert('Sync', 'Data sync coming soon!')}
            />
            <SettingItem
              icon="download"
              title="Export Progress"
              subtitle="Download your progress as CSV or PDF"
              onPress={() => Alert.alert('Export', 'Data export coming soon!')}
            />
            <SettingItem
              icon="heart"
              title="Health Integration"
              subtitle="Connect with health apps"
              onPress={() => Alert.alert('Health', 'Health integration coming soon!')}
            />
            <SettingItem
              icon="watch"
              title="Wearable Devices"
              subtitle="Connect fitness trackers"
              onPress={() => Alert.alert('Wearables', 'Wearable integration coming soon!')}
            />
          </View>

          {/* Support Section */}
          <SectionHeader title="Support" />
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: spacing * 2,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}>
            <SettingItem
              icon="help-circle"
              title="Help & Support"
              subtitle="Get help and contact support"
              onPress={() => Alert.alert('Support', 'Help & support coming soon!')}
            />
            <SettingItem
              icon="message-circle"
              title="Feedback"
              subtitle="Share your feedback with us"
              onPress={() => Alert.alert('Feedback', 'Feedback form coming soon!')}
            />
            <SettingItem
              icon="star"
              title="Rate App"
              subtitle="Help us improve by rating the app"
              onPress={() => Alert.alert('Rate', 'Rate app coming soon!')}
            />
            <SettingItem
              icon="info"
              title="App Version"
              subtitle="1.0.0"
              onPress={() => Alert.alert('Version', 'DE-Trainer v1.0.0')}
            />
            <SettingItem
              icon="file-text"
              title="Terms of Service"
              subtitle="Read our terms and conditions"
              onPress={() => Alert.alert('Terms', 'Terms of service coming soon!')}
            />
            <SettingItem
              icon="shield-check"
              title="Privacy Policy"
              subtitle="Learn how we protect your data"
              onPress={() => Alert.alert('Privacy Policy', 'Privacy policy coming soon!')}
            />
          </View>

          {/* Sign Out Button */}
          <Pressable
            onPress={handleSignOut}
            style={{
              backgroundColor: '#fef2f2',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#fecaca',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Feather name="log-out" size={20} color="#dc2626" />
            <Text style={{
              fontSize: fontSize,
              fontWeight: '600',
              color: '#dc2626',
              marginLeft: 12
            }}>
              Sign Out
            </Text>
          </Pressable>

        </View>
      </ScrollView>
    </View>
  );
}
