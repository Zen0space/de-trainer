import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions, Alert, ScrollView } from 'react-native';
import { useSession } from '../../contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { ProfileScreen } from './ProfileScreen';
import { ChangelogModal } from '../../components/ui/ChangelogModal';
import { PrivacyPolicyModal } from '../../components/ui/PrivacyPolicyModal';
import { PrivacySecurityScreen } from '../shared/PrivacySecurityScreen';
import { TermsOfServiceScreen } from '../shared/TermsOfServiceScreen';
import { SyncDataCard } from '../../components/ui/SyncDataCard';
import { clearLocalDatabase } from '../../lib/local-database';

export function SettingsScreen() {
  const { user, logout } = useSession();
  const { width } = useWindowDimensions();
  const [showProfile, setShowProfile] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showPrivacySecurity, setShowPrivacySecurity] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const cardPadding = isSmallScreen ? 16 : isTablet ? 24 : 20;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;

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

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will delete all local data and you will need to sync again. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearLocalDatabase();
              Alert.alert('Success', 'Local cache cleared successfully. Please sync to restore your data.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
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
        backgroundColor: '#f3f3f3',
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

  // Show ProfileScreen if requested
  if (showProfile) {
    return <ProfileScreen onBack={() => setShowProfile(false)} />;
  }

  // Show PrivacySecurityScreen if requested
  if (showPrivacySecurity) {
    return <PrivacySecurityScreen onBack={() => setShowPrivacySecurity(false)} />;
  }

  // Show TermsOfServiceScreen if requested
  if (showTermsOfService) {
    return <TermsOfServiceScreen onBack={() => setShowTermsOfService(false)} />;
  }


  return (
    <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
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
                backgroundColor: '#6366f1',
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
          }}>
            <SettingItem
              icon="user"
              title="Profile"
              subtitle={`${user?.full_name || 'Unknown'} • ${user?.email || 'No email'}`}
              onPress={() => setShowProfile(true)}
            />
          </View>

          {/* Preferences Section */}
          <SectionHeader title="Preferences" />
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: spacing,
            overflow: 'hidden',
          }}>
            <SettingItem
              icon="globe"
              title="Language"
              subtitle="English (US)"
              onPress={() => Alert.alert('Language', 'Language settings coming soon!')}
            />
          </View>

          {/* Data & Storage Section */}
          <SectionHeader title="Data & Storage" />
          
          {/* Sync Data Card */}
          <SyncDataCard />
          
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: spacing,
            overflow: 'hidden',
          }}>
            <SettingItem
              icon="trash-2"
              title="Clear Cache"
              subtitle="Clear local database cache"
              onPress={handleClearCache}
            />
          </View>

          {/* About Section */}
          <SectionHeader title="About" />
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: spacing * 2,
            overflow: 'hidden',
          }}>
            <SettingItem
              icon="info"
              title="App Version"
              subtitle="1.3.11"
              onPress={() => setShowChangelog(true)}
            />
            <SettingItem
              icon="help-circle"
              title="Help & Support"
              subtitle="Get help and contact support"
              onPress={() => Alert.alert('Support', 'Help & support coming soon!')}
            />
            <SettingItem
              icon="file-text"
              title="Terms of Service"
              subtitle="Read our terms and conditions"
              onPress={() => setShowTermsOfService(true)}
            />
            <SettingItem
              icon="shield"
              title="Privacy Policy"
              subtitle="Learn how we protect your data"
              onPress={() => setShowPrivacyPolicy(true)}
            />
            <SettingItem
              icon="star"
              title="Rate App"
              subtitle="Help us improve by rating the app"
              onPress={() => Alert.alert('Rate', 'Rate app coming soon!')}
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
      
      {/* Changelog Modal */}
      <ChangelogModal 
        visible={showChangelog} 
        onClose={() => setShowChangelog(false)} 
      />
      
      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        visible={showPrivacyPolicy} 
        onClose={() => setShowPrivacyPolicy(false)} 
      />
    </View>
  );
}
