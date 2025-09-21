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

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
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

  // Handle contact email press
  const handleContactPress = async () => {
    const email = 'privacy@de-trainer.com';
    const subject = 'Privacy Policy Inquiry';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Email Not Available', `Please contact us at: ${email}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open email client');
    }
  };

  // Privacy policy content sections
  const privacyPolicyContent = [
    {
      title: "Introduction",
      content: "DE-Trainer is committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy outlines how we collect, use, and protect your personal information when you use our fitness training application."
    },
    {
      title: "Information We Collect",
      content: "We collect information you provide directly to us, such as:\n\n• Account information (name, email, profile details)\n• Training data and workout history\n• Progress tracking and fitness metrics\n• Communication preferences\n• Device information and usage analytics"
    },
    {
      title: "How We Use Your Information",
      content: "We use the information we collect to:\n\n• Provide and maintain our fitness training services\n• Personalize your training experience\n• Track your progress and achievements\n• Send you important updates and notifications\n• Improve our app features and user experience\n• Ensure the security and integrity of our platform"
    },
    {
      title: "Information Sharing",
      content: "We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:\n\n• With your trainer (if you're an athlete user)\n• With service providers who assist in app operations\n• When required by law or to protect our rights\n• In connection with a business transfer or merger"
    },
    {
      title: "Data Security",
      content: "We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:\n\n• Encryption of sensitive data\n• Secure data transmission protocols\n• Regular security assessments\n• Limited access to personal information"
    },
    {
      title: "Your Rights",
      content: "You have the right to:\n\n• Access your personal information\n• Update or correct your data\n• Delete your account and associated data\n• Control your communication preferences\n• Export your training data\n• Contact us about privacy concerns"
    },
    {
      title: "Data Retention",
      content: "We retain your personal information for as long as your account is active or as needed to provide you services. We will delete your information when you delete your account, except where we are required to retain it for legal purposes."
    },
    {
      title: "Changes to This Policy",
      content: "We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy in the app and updating the 'Last Updated' date below. Your continued use of the app after changes indicates your acceptance of the updated policy."
    }
  ];

  const lastUpdated = "September 21, 2025";

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
              Privacy Policy
            </Text>
            <Text style={{
              fontSize: fontSize - 1,
              color: '#6b7280',
            }}>
              Last updated: {lastUpdated}
            </Text>
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
            paddingBottom: padding + 80, // Extra space for contact button
          }}
          showsVerticalScrollIndicator={false}
        >
          {privacyPolicyContent.map((section, index) => (
            <View key={index} style={{ marginBottom: 24 }}>
              <Text style={{
                fontSize: fontSize + 2,
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: 12,
              }}>
                {section.title}
              </Text>
              <Text style={{
                fontSize: fontSize,
                color: '#4b5563',
                lineHeight: fontSize * 1.5,
                textAlign: 'justify',
              }}>
                {section.content}
              </Text>
            </View>
          ))}

          {/* Contact Information */}
          <View style={{
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            padding: padding,
            marginTop: 8,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <Feather name="mail" size={16} color="#3b82f6" />
              <Text style={{
                fontSize: fontSize + 1,
                fontWeight: '600',
                color: '#1f2937',
                marginLeft: 8,
              }}>
                Questions About Privacy?
              </Text>
            </View>
            <Text style={{
              fontSize: fontSize - 1,
              color: '#6b7280',
              lineHeight: (fontSize - 1) * 1.4,
              marginBottom: 12,
            }}>
              If you have any questions about this Privacy Policy or our data practices, please don't hesitate to contact us.
            </Text>
            <Pressable
              onPress={handleContactPress}
              style={{
                backgroundColor: '#3b82f6',
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 16,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{
                fontSize: fontSize - 1,
                fontWeight: '600',
                color: 'white',
              }}>
                Contact Privacy Team
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
