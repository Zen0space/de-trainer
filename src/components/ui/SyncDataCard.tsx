import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { syncService, SyncResult } from '../../lib/sync-service';
import { useSession } from '../../contexts/AuthContext';

export function SyncDataCard() {
  const { width } = useWindowDimensions();
  const { user } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [totalSynced, setTotalSynced] = useState(0);
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;

  // Load sync status on mount
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status.status);
      setLastSyncAt(status.lastSyncAt);
      setLastError(status.lastError);
      setTotalSynced(status.totalSynced);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;

    if (!user) {
      Alert.alert('Error', 'Please log in to sync data');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastError(null);

    try {
      // Pass user context for scoped sync
      const result: SyncResult = await syncService.sync(user.id, user.role);
      
      if (result.success) {
        setSyncStatus('success');
        setLastSyncAt(new Date().toISOString());
        setTotalSynced(result.pushedCount + result.pulledCount);
        
        Alert.alert(
          'Sync Successful',
          `${result.message}\n\nPushed: ${result.pushedCount} records\nPulled: ${result.pulledCount} records`,
          [{ text: 'OK' }]
        );
      } else {
        setSyncStatus('error');
        setLastError(result.errors.join('; '));
        
        Alert.alert(
          'Sync Completed with Errors',
          `${result.message}\n\nErrors: ${result.errors.length}`,
          [
            { text: 'View Details', onPress: () => showErrorDetails(result.errors) },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      setSyncStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      
      Alert.alert(
        'Sync Failed',
        `Failed to sync data: ${errorMessage}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSyncing(false);
      // Reload status after sync
      await loadSyncStatus();
    }
  };

  const showErrorDetails = (errors: string[]) => {
    Alert.alert(
      'Sync Errors',
      errors.join('\n\n'),
      [{ text: 'OK' }]
    );
  };

  const formatLastSyncTime = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return '#3b82f6';
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing': return 'refresh-cw';
      case 'success': return 'check-circle';
      case 'error': return 'alert-circle';
      default: return 'cloud';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing': return 'Syncing...';
      case 'success': return 'Synced';
      case 'error': return 'Sync Error';
      default: return 'Ready to Sync';
    }
  };

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 12,
      padding: spacing + 4,
      marginBottom: spacing,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing }}>
        <View style={{
          width: 40,
          height: 40,
          backgroundColor: '#f0f9ff',
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12
        }}>
          <Feather name="database" size={20} color="#3b82f6" />
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: fontSize + 2,
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: 2
          }}>
            Data Sync
          </Text>
          <Text style={{
            fontSize: fontSize - 2,
            color: '#6b7280'
          }}>
            Backup and sync your data to the cloud
          </Text>
        </View>
      </View>

      {/* Sync Status */}
      <View style={{
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
        marginBottom: spacing,
        borderLeftWidth: 4,
        borderLeftColor: getStatusColor()
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Feather name={getStatusIcon() as any} size={16} color={getStatusColor()} />
          <Text style={{
            fontSize: fontSize,
            fontWeight: '600',
            color: '#1f2937',
            marginLeft: 8
          }}>
            {getStatusText()}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>
            Last Sync:
          </Text>
          <Text style={{ fontSize: fontSize - 2, color: '#1f2937', fontWeight: '500' }}>
            {formatLastSyncTime(lastSyncAt)}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: fontSize - 2, color: '#6b7280' }}>
            Total Synced:
          </Text>
          <Text style={{ fontSize: fontSize - 2, color: '#1f2937', fontWeight: '500' }}>
            {totalSynced} records
          </Text>
        </View>
      </View>

      {/* Error Message */}
      {lastError && syncStatus === 'error' && (
        <View style={{
          backgroundColor: '#fef2f2',
          borderRadius: 8,
          padding: 12,
          marginBottom: spacing,
          borderLeftWidth: 4,
          borderLeftColor: '#ef4444'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Feather name="alert-triangle" size={16} color="#ef4444" style={{ marginTop: 2 }} />
            <Text style={{
              fontSize: fontSize - 2,
              color: '#991b1b',
              marginLeft: 8,
              flex: 1,
              lineHeight: (fontSize - 2) * 1.4
            }}>
              {lastError}
            </Text>
          </View>
        </View>
      )}

      {/* Sync Button */}
      <Pressable
        onPress={handleSync}
        disabled={isSyncing}
        style={{
          backgroundColor: isSyncing ? '#e5e7eb' : '#3b82f6',
          borderRadius: 8,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
        ) : (
          <Feather name="refresh-cw" size={18} color="white" style={{ marginRight: 8 }} />
        )}
        <Text style={{
          fontSize: fontSize,
          fontWeight: '600',
          color: 'white'
        }}>
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Text>
      </Pressable>

      {/* Info Text */}
      <Text style={{
        fontSize: fontSize - 3,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: (fontSize - 3) * 1.5
      }}>
        Your data is stored locally and synced to the cloud. Sync regularly to keep your data backed up and accessible across devices.
      </Text>
    </View>
  );
}
