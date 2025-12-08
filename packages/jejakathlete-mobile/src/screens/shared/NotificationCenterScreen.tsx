import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterScreenProps {
  onBack: () => void;
}

export function NotificationCenterScreen({ onBack }: NotificationCenterScreenProps) {
  const { width } = useWindowDimensions();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (isRefreshAction = false) => {
    if (isRefreshAction) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await trpc.notifications.getMyNotifications.query({
        unread_only: false,
        limit: 50,
      });
      setNotifications(data.notifications);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchNotifications(true);
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.is_read) {
      try {
        await trpc.notifications.markAsRead.mutate({ notification_id: notification.id });
        fetchNotifications();
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const handleDeleteNotification = (notificationId: number) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await trpc.notifications.deleteNotification.mutate({ notification_id: notificationId });
              fetchNotifications();
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  const handleMarkAllAsRead = async () => {
    const unreadCount = notifications.filter((n: any) => !n.is_read).length;
    if (unreadCount === 0) {
      Alert.alert('Info', 'No unread notifications');
      return;
    }

    try {
      await trpc.notifications.markAllAsRead.mutate();
      Alert.alert('Success', 'All notifications marked as read');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'enrollment_request':
        return 'user-plus';
      case 'enrollment_response':
        return 'check-circle';
      case 'workout_assigned':
        return 'activity';
      case 'event_assigned':
        return 'calendar';
      case 'test_result':
        return 'trending-up';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'enrollment_request':
        return '#3b82f6';
      case 'enrollment_response':
        return '#10b981';
      case 'workout_assigned':
        return '#f59e0b';
      case 'event_assigned':
        return '#8b5cf6';
      case 'test_result':
        return '#06b6d4';
      default:
        return '#6b7280';
    }
  };

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
        <View
          style={{
            backgroundColor: '#ffffff',
            padding: containerPadding,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing }}>
            <TouchableOpacity onPress={onBack}>
              <Feather name="arrow-left" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={{ fontSize: titleFontSize, fontWeight: 'bold', color: '#1f2937' }}>
              Notifications
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: containerPadding }}>
          <Feather name="alert-circle" size={48} color="#ef4444" />
          <Text style={{ fontSize, color: '#6b7280', marginTop: spacing, textAlign: 'center' }}>
            Failed to load notifications. Please try again.
          </Text>
        </View>
      </View>
    );
  }

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#ffffff',
          padding: containerPadding,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing }}>
            <TouchableOpacity onPress={onBack}>
              <Feather name="arrow-left" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={{ fontSize: titleFontSize, fontWeight: 'bold', color: '#1f2937' }}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: '#ef4444',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                }}>
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead}>
              <Text style={{ color: '#3b82f6', fontSize: fontSize - 2, fontWeight: '600' }}>
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: containerPadding }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3b82f6']}
            tintColor="#3b82f6"
          />
        }>
        {isLoading ? (
          <View style={{ padding: spacing * 2, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : notifications.length === 0 ? (
          <View
            style={{
              backgroundColor: '#ffffff',
              padding: spacing * 2,
              borderRadius: 12,
              alignItems: 'center',
            }}>
            <Feather name="bell-off" size={48} color="#d1d5db" />
            <Text style={{ fontSize, color: '#6b7280', marginTop: spacing, textAlign: 'center' }}>
              No notifications yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing }}>
            {notifications.map((notification: any) => (
              <TouchableOpacity
                key={notification.id}
                onPress={() => handleNotificationPress(notification)}
                style={{
                  backgroundColor: notification.is_read ? '#ffffff' : '#eff6ff',
                  padding: spacing,
                  borderRadius: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: getNotificationColor(notification.type),
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}>
                <View style={{ flexDirection: 'row', gap: spacing }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${getNotificationColor(notification.type)}20`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <Feather
                      name={getNotificationIcon(notification.type) as any}
                      size={20}
                      color={getNotificationColor(notification.type)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text
                        style={{
                          fontSize,
                          fontWeight: notification.is_read ? '500' : 'bold',
                          color: '#1f2937',
                          flex: 1,
                        }}>
                        {notification.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteNotification(notification.id)}
                        style={{ padding: 4 }}>
                        <Feather name="x" size={16} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                    <Text
                      style={{
                        fontSize: fontSize - 2,
                        color: '#6b7280',
                        marginTop: 4,
                      }}>
                      {notification.message}
                    </Text>
                    <Text
                      style={{
                        fontSize: fontSize - 4,
                        color: '#9ca3af',
                        marginTop: 8,
                      }}>
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
