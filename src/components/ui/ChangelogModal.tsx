import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
  Linking,
  Alert,
  useWindowDimensions,
  Easing,
  PanResponder,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { tursoDbHelpers } from '../../lib/turso-database';

interface ChangelogEntry {
  id: number;
  version: string;
  title: string;
  content: string;
  update_link: string | null;
  release_date: string;
  is_critical: boolean;
  is_latest: boolean;
  created_at: string;
  updated_at: string;
}

interface ChangelogModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ChangelogModal({ visible, onClose }: ChangelogModalProps) {
  const [changelog, setChangelog] = useState<ChangelogEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));
  const [backdropAnim] = useState(new Animated.Value(0));
  const [gestureAnim] = useState(new Animated.Value(0));
  const { width, height } = useWindowDimensions();
  const modalHeight = height * 0.85;
  const dragThreshold = modalHeight * 0.3; // 30% of modal height to trigger dismiss
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const titleFontSize = isSmallScreen ? 22 : isTablet ? 28 : 24;
  const fontSize = isSmallScreen ? 14 : 16;
  const padding = isSmallScreen ? 16 : isTablet ? 24 : 20;

  // Fetch latest changelog
  const fetchChangelog = async () => {
    setLoading(true);
    try {
      const latestChangelog = await tursoDbHelpers.get(`
        SELECT * FROM changelog 
        WHERE is_latest = TRUE 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      setChangelog(latestChangelog || null);
    } catch (error) {
      console.error('❌ Error fetching changelog:', error);
      Alert.alert('Error', 'Failed to load changelog information');
    } finally {
      setLoading(false);
    }
  };

  // Pan responder for drag-to-dismiss
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only respond to vertical gestures (downward swipes)
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
    },
    onPanResponderMove: (_, gestureState) => {
      // Only allow downward movement
      if (gestureState.dy > 0) {
        gestureAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      const { dy, vy } = gestureState;
      
      // Dismiss if dragged beyond threshold or has sufficient velocity
      if (dy > dragThreshold || vy > 0.5) {
        // Dismiss with velocity-based animation
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: Math.max(150, 300 - Math.abs(vy) * 100),
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnim, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => {
          gestureAnim.setValue(0);
          onClose();
        });
      } else {
        // Snap back to position
        Animated.spring(gestureAnim, {
          toValue: 0,
          tension: 140,
          friction: 10,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  // Enhanced animation effects with improved timing and physics
  useEffect(() => {
    if (visible) {
      fetchChangelog();
      gestureAnim.setValue(0);
      
      // Parallel animations with optimized timing
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 140,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.bezier(0.25, 0.46, 0.45, 0.94)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit animations with faster, smoother timing
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.bezier(0.55, 0.06, 0.68, 0.19)),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        gestureAnim.setValue(0);
      });
    }
  }, [visible]);

  // Handle update link press
  const handleUpdatePress = async () => {
    if (!changelog?.update_link) return;
    
    try {
      const supported = await Linking.canOpenURL(changelog.update_link);
      if (supported) {
        await Linking.openURL(changelog.update_link);
      } else {
        Alert.alert('Error', 'Cannot open update link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open update link');
    }
  };

  // Format content for display (simple markdown-like formatting)
  const formatContent = (content: string) => {
    const lines = content.split('\n');
    const formattedLines: React.ReactElement[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('### ')) {
        // Section headers
        formattedLines.push(
          <Text key={index} style={{
            fontSize: fontSize + 2,
            fontWeight: 'bold',
            color: '#1f2937',
            marginTop: index > 0 ? 20 : 0,
            marginBottom: 8,
          }}>
            {trimmedLine.replace('### ', '')}
          </Text>
        );
      } else if (trimmedLine.startsWith('- ')) {
        // Bullet points
        formattedLines.push(
          <View key={index} style={{ flexDirection: 'row', marginBottom: 4 }}>
            <Text style={{ color: '#6b7280', marginRight: 8, fontSize }}>•</Text>
            <Text style={{ 
              flex: 1, 
              color: '#4b5563', 
              fontSize,
              lineHeight: fontSize * 1.4 
            }}>
              {trimmedLine.replace('- ', '')}
            </Text>
          </View>
        );
      } else if (trimmedLine.length > 0) {
        // Regular text
        formattedLines.push(
          <Text key={index} style={{
            color: '#4b5563',
            fontSize,
            lineHeight: fontSize * 1.4,
            marginBottom: 4,
          }}>
            {trimmedLine}
          </Text>
        );
      } else {
        // Empty line for spacing
        formattedLines.push(<View key={index} style={{ height: 8 }} />);
      }
    });
    
    return formattedLines;
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

  // Enhanced interpolations with gesture support
  const translateY = Animated.add(
    slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [modalHeight, 0],
      extrapolate: 'clamp',
    }),
    gestureAnim
  );

  const backdropOpacity = backdropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
    extrapolate: 'clamp',
  });

  // Scale effect for modal during drag (subtle iOS-like behavior)
  const modalScale = gestureAnim.interpolate({
    inputRange: [0, dragThreshold],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'black',
          opacity: backdropOpacity,
        }}
      >
        <Pressable 
          style={{ flex: 1 }} 
          onPress={onClose}
        />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: modalHeight,
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY }, { scale: modalScale }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 20,
        }}
      >
        {/* Draggable Header Area */}
        <View {...panResponder.panHandlers}>
          {/* Enhanced Drag Handle */}
          <View style={{
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 8,
            paddingHorizontal: 20,
          }}>
            <Animated.View style={{
              width: 36,
              height: 4,
              backgroundColor: gestureAnim.interpolate({
                inputRange: [0, 50],
                outputRange: ['#d1d5db', '#9ca3af'],
                extrapolate: 'clamp',
              }),
              borderRadius: 2,
              transform: [{
                scaleX: gestureAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [1, 1.2],
                  extrapolate: 'clamp',
                })
              }],
            }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: padding,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
          }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: titleFontSize,
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: 4,
            }}>
              What's New
            </Text>
            {changelog && (
              <Text style={{
                fontSize: fontSize - 1,
                color: '#6b7280',
              }}>
                Version {changelog.version} • {formatDate(changelog.release_date)}
              </Text>
            )}
          </View>
          
          <Pressable
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#f3f4f6',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="x" size={18} color="#6b7280" />
          </Pressable>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            padding: padding,
            paddingBottom: padding + 60, // Extra space for button
          }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 60,
            }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#f3f4f6',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                <Feather name="loader" size={20} color="#6b7280" />
              </View>
              <Text style={{
                fontSize,
                color: '#6b7280',
                textAlign: 'center',
              }}>
                Loading changelog...
              </Text>
            </View>
          ) : changelog ? (
            <View>
              {/* Title */}
              <Text style={{
                fontSize: fontSize + 4,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 16,
                textAlign: 'center',
              }}>
                {changelog.title}
              </Text>

              {/* Critical Update Badge */}
              {changelog.is_critical && (
                <View style={{
                  backgroundColor: '#fef2f2',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#fecaca',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Feather name="alert-circle" size={16} color="#dc2626" />
                  <Text style={{
                    fontSize: fontSize - 1,
                    color: '#dc2626',
                    fontWeight: '600',
                    marginLeft: 8,
                  }}>
                    Critical Update Required
                  </Text>
                </View>
              )}

              {/* Content */}
              <View>
                {formatContent(changelog.content)}
              </View>
            </View>
          ) : (
            <View style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 60,
            }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#f3f4f6',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                <Feather name="info" size={24} color="#6b7280" />
              </View>
              <Text style={{
                fontSize: fontSize + 2,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 8,
                textAlign: 'center',
              }}>
                No Updates Available
              </Text>
              <Text style={{
                fontSize,
                color: '#6b7280',
                textAlign: 'center',
                lineHeight: fontSize * 1.4,
                maxWidth: 280,
              }}>
                You're running the latest version of Jejak Atlet. Check back later for updates!
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Update Button */}
        {changelog?.update_link && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
            padding: padding,
          }}>
            <Pressable
              onPress={handleUpdatePress}
              style={{
                backgroundColor: '#3b82f6',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="download" size={20} color="white" />
              <Text style={{
                fontSize: fontSize + 1,
                fontWeight: '600',
                color: 'white',
                marginLeft: 8,
              }}>
                Update Now
              </Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}
