import React from 'react';
import { View, Text, Pressable, useWindowDimensions, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface TermsOfServiceScreenProps {
  onBack: () => void;
}

export function TermsOfServiceScreen({ onBack }: TermsOfServiceScreenProps) {
  const { width } = useWindowDimensions();
  
  // Responsive design
  const isSmallScreen = width < 380;
  const isTablet = width > 600;
  const containerPadding = isSmallScreen ? 16 : isTablet ? 32 : 24;
  const titleFontSize = isSmallScreen ? 20 : isTablet ? 28 : 24;
  const sectionTitleFontSize = isSmallScreen ? 16 : isTablet ? 20 : 18;
  const fontSize = isSmallScreen ? 14 : 16;
  const spacing = isSmallScreen ? 12 : isTablet ? 20 : 16;

  const Section = ({ 
    title, 
    children 
  }: { 
    title: string; 
    children: React.ReactNode;
  }) => (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 12,
      padding: spacing + 4,
      marginBottom: spacing,
    }}>
      <Text style={{
        fontSize: sectionTitleFontSize,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: spacing
      }}>
        {title}
      </Text>
      {children}
    </View>
  );

  const Paragraph = ({ children }: { children: React.ReactNode }) => (
    <Text style={{
      fontSize: fontSize,
      color: '#4b5563',
      lineHeight: fontSize * 1.6,
      marginBottom: 12
    }}>
      {children}
    </Text>
  );

  const BulletPoint = ({ text }: { text: string }) => (
    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
      <Text style={{ color: '#3b82f6', marginRight: 8, fontSize: fontSize }}>•</Text>
      <Text style={{
        fontSize: fontSize,
        color: '#4b5563',
        lineHeight: fontSize * 1.5,
        flex: 1
      }}>
        {text}
      </Text>
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
                Terms of Service
              </Text>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#6b7280',
                marginTop: 2
              }}>
                Please read carefully
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
              <Feather name="file-text" size={20} color="white" />
            </View>
          </View>
        </View>

        <View style={{ padding: containerPadding }}>
          <View style={{ maxWidth: isTablet ? 800 : 600, alignSelf: 'center', width: '100%' }}>
            
            {/* Introduction */}
            <View style={{
              backgroundColor: '#f0f9ff',
              borderRadius: 12,
              padding: spacing + 4,
              marginBottom: spacing,
              borderWidth: 1,
              borderColor: '#bfdbfe'
            }}>
              <Text style={{
                fontSize: fontSize,
                color: '#1e40af',
                lineHeight: fontSize * 1.6,
                textAlign: 'center'
              }}>
                By using Jejak Atlet, you agree to these Terms of Service. Please read them carefully before using our app.
              </Text>
            </View>

            {/* Acceptance of Terms */}
            <Section title="1. Acceptance of Terms">
              <Paragraph>
                By accessing or using the Jejak Atlet mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the App.
              </Paragraph>
              <Paragraph>
                These Terms constitute a legally binding agreement between you and Jejak Atlet ("we," "us," or "our").
              </Paragraph>
            </Section>

            {/* User Accounts */}
            <Section title="2. User Accounts">
              <Paragraph>
                To use certain features of the App, you must create an account. You agree to:
              </Paragraph>
              <BulletPoint text="Provide accurate, current, and complete information during registration" />
              <BulletPoint text="Maintain the security of your password and account" />
              <BulletPoint text="Notify us immediately of any unauthorized use of your account" />
              <BulletPoint text="Accept responsibility for all activities that occur under your account" />
              <Paragraph>
                You must be at least 13 years old to create an account. Users under 18 must have parental consent.
              </Paragraph>
            </Section>

            {/* User Roles */}
            <Section title="3. User Roles and Responsibilities">
              <Text style={{
                fontSize: fontSize,
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: 8
              }}>
                Trainers:
              </Text>
              <BulletPoint text="Must provide valid certification information" />
              <BulletPoint text="Are responsible for the accuracy of fitness assessments and training logs" />
              <BulletPoint text="Must maintain professional conduct with athletes" />
              <BulletPoint text="Should not provide medical advice beyond their scope of practice" />
              
              <Text style={{
                fontSize: fontSize,
                fontWeight: '600',
                color: '#1f2937',
                marginTop: 12,
                marginBottom: 8
              }}>
                Athletes:
              </Text>
              <BulletPoint text="Are responsible for their own health and safety" />
              <BulletPoint text="Should consult healthcare professionals before starting any fitness program" />
              <BulletPoint text="Must provide accurate health and fitness information" />
              <BulletPoint text="Should follow trainer instructions responsibly" />
            </Section>

            {/* Acceptable Use */}
            <Section title="4. Acceptable Use">
              <Paragraph>
                You agree NOT to:
              </Paragraph>
              <BulletPoint text="Use the App for any illegal or unauthorized purpose" />
              <BulletPoint text="Violate any laws in your jurisdiction" />
              <BulletPoint text="Infringe on the rights of others" />
              <BulletPoint text="Transmit any harmful code, viruses, or malware" />
              <BulletPoint text="Attempt to gain unauthorized access to the App or its systems" />
              <BulletPoint text="Harass, abuse, or harm other users" />
              <BulletPoint text="Impersonate any person or entity" />
              <BulletPoint text="Share your account credentials with others" />
            </Section>

            {/* Health and Safety Disclaimer */}
            <Section title="5. Health and Safety Disclaimer">
              <Paragraph>
                Jejak Atlet is a fitness tracking and management tool. It is NOT a substitute for professional medical advice, diagnosis, or treatment.
              </Paragraph>
              <BulletPoint text="Always consult with a qualified healthcare provider before starting any fitness program" />
              <BulletPoint text="Stop exercising immediately if you experience pain, dizziness, or discomfort" />
              <BulletPoint text="We are not responsible for any injuries or health issues resulting from use of the App" />
              <BulletPoint text="Trainers are independent professionals and not employees of Jejak Atlet" />
            </Section>

            {/* Data and Privacy */}
            <Section title="6. Data and Privacy">
              <Paragraph>
                Your use of the App is also governed by our Privacy Policy. By using the App, you consent to:
              </Paragraph>
              <BulletPoint text="Collection and use of your data as described in our Privacy Policy" />
              <BulletPoint text="Storage of fitness data and test results" />
              <BulletPoint text="Sharing of your data with your assigned trainer (for athletes)" />
              <BulletPoint text="Use of cookies and similar technologies" />
            </Section>

            {/* Intellectual Property */}
            <Section title="7. Intellectual Property">
              <Paragraph>
                The App and its content, features, and functionality are owned by Jejak Atlet and are protected by international copyright, trademark, and other intellectual property laws.
              </Paragraph>
              <Paragraph>
                You may not:
              </Paragraph>
              <BulletPoint text="Copy, modify, or distribute the App or its content" />
              <BulletPoint text="Reverse engineer or decompile the App" />
              <BulletPoint text="Remove any copyright or proprietary notices" />
              <BulletPoint text="Use our trademarks without permission" />
            </Section>

            {/* Subscription and Payments */}
            <Section title="8. Subscription and Payments">
              <Paragraph>
                Currently, Jejak Atlet is provided free of charge. We reserve the right to introduce paid features or subscriptions in the future.
              </Paragraph>
              <Paragraph>
                If we introduce paid features:
              </Paragraph>
              <BulletPoint text="You will be notified in advance" />
              <BulletPoint text="Pricing will be clearly displayed" />
              <BulletPoint text="Refund policies will be provided" />
              <BulletPoint text="You can choose to continue using free features or upgrade" />
            </Section>

            {/* Termination */}
            <Section title="9. Termination">
              <Paragraph>
                We reserve the right to suspend or terminate your account at any time for:
              </Paragraph>
              <BulletPoint text="Violation of these Terms" />
              <BulletPoint text="Fraudulent or illegal activity" />
              <BulletPoint text="Abuse of the App or other users" />
              <BulletPoint text="Any reason at our sole discretion" />
              <Paragraph>
                You may terminate your account at any time by contacting us or using the in-app account deletion feature.
              </Paragraph>
            </Section>

            {/* Limitation of Liability */}
            <Section title="10. Limitation of Liability">
              <Paragraph>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, JEJAK ATLET SHALL NOT BE LIABLE FOR:
              </Paragraph>
              <BulletPoint text="Any indirect, incidental, special, or consequential damages" />
              <BulletPoint text="Loss of profits, data, or goodwill" />
              <BulletPoint text="Personal injury or property damage" />
              <BulletPoint text="Errors or omissions in the App" />
              <BulletPoint text="Actions of trainers or other users" />
              <Paragraph>
                THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
              </Paragraph>
            </Section>

            {/* Indemnification */}
            <Section title="11. Indemnification">
              <Paragraph>
                You agree to indemnify and hold harmless Jejak Atlet, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising from:
              </Paragraph>
              <BulletPoint text="Your use of the App" />
              <BulletPoint text="Your violation of these Terms" />
              <BulletPoint text="Your violation of any rights of another" />
              <BulletPoint text="Your content or data" />
            </Section>

            {/* Changes to Terms */}
            <Section title="12. Changes to Terms">
              <Paragraph>
                We reserve the right to modify these Terms at any time. We will notify you of any changes by:
              </Paragraph>
              <BulletPoint text="Posting the new Terms in the App" />
              <BulletPoint text="Sending you an email notification" />
              <BulletPoint text="Displaying an in-app notification" />
              <Paragraph>
                Your continued use of the App after changes constitutes acceptance of the new Terms.
              </Paragraph>
            </Section>

            {/* Governing Law */}
            <Section title="13. Governing Law">
              <Paragraph>
                These Terms shall be governed by and construed in accordance with the laws of Malaysia, without regard to its conflict of law provisions.
              </Paragraph>
              <Paragraph>
                Any disputes arising from these Terms or the App shall be resolved in the courts of Malaysia.
              </Paragraph>
            </Section>

            {/* Contact Information */}
            <Section title="14. Contact Us">
              <Paragraph>
                If you have any questions about these Terms, please contact us:
              </Paragraph>
              
              <View style={{
                backgroundColor: '#f9fafb',
                borderRadius: 8,
                padding: 12,
                marginTop: 8
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Feather name="mail" size={16} color="#6b7280" />
                  <Text style={{
                    fontSize: fontSize,
                    color: '#1f2937',
                    marginLeft: 8,
                    fontWeight: '600'
                  }}>
                    support@jejakatlet.com
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Feather name="file-text" size={16} color="#6b7280" />
                  <Text style={{
                    fontSize: fontSize,
                    color: '#1f2937',
                    marginLeft: 8,
                    fontWeight: '600'
                  }}>
                    legal@jejakatlet.com
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="globe" size={16} color="#6b7280" />
                  <Text style={{
                    fontSize: fontSize,
                    color: '#1f2937',
                    marginLeft: 8,
                    fontWeight: '600'
                  }}>
                    www.jejakatlet.com
                  </Text>
                </View>
              </View>
            </Section>

            {/* Effective Date */}
            <View style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: spacing,
              alignItems: 'center',
              marginBottom: spacing
            }}>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#9ca3af',
                textAlign: 'center'
              }}>
                Effective Date: January 2025
              </Text>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#9ca3af',
                textAlign: 'center',
                marginTop: 4
              }}>
                Version 1.3.11
              </Text>
              <Text style={{
                fontSize: fontSize - 2,
                color: '#9ca3af',
                textAlign: 'center',
                marginTop: 8
              }}>
                By using Jejak Atlet, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </Text>
            </View>

          </View>
        </View>
      </ScrollView>
    </View>
  );
}
