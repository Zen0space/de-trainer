import { useState, useEffect } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

interface KeyboardAwareProps {
  containerPadding?: number;
}

export function useKeyboardAware({ containerPadding = 24 }: KeyboardAwareProps = {}) {
  const { height } = useWindowDimensions();

  // Keyboard state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Calculate precise scroll area for modal (accounting for header and safe areas)
  const modalHeaderHeight = 80; // Approximate header height
  const safeAreaBottom = 34; // Approximate safe area bottom
  const availableHeight = isKeyboardVisible
    ? height - keyboardHeight - modalHeaderHeight - safeAreaBottom
    : height - modalHeaderHeight - safeAreaBottom;
  const maxScrollHeight = Math.max(200, availableHeight - containerPadding * 2); // Minimum 200px

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  return {
    // State
    keyboardHeight,
    isKeyboardVisible,
    availableHeight,
    maxScrollHeight,
    
    // KeyboardAvoidingView props
    keyboardAvoidingViewProps: {
      style: { flex: 1 },
      behavior: Platform.OS === 'ios' ? 'padding' as const : 'height' as const,
      keyboardVerticalOffset: Platform.OS === 'ios' ? 0 : 20,
    },
    
    // ScrollView props
    scrollViewProps: {
      style: {
        maxHeight: maxScrollHeight
      },
      contentContainerStyle: {
        padding: containerPadding,
        paddingBottom: containerPadding + (isKeyboardVisible ? keyboardHeight + 20 : 100)
      },
      showsVerticalScrollIndicator: false,
      keyboardShouldPersistTaps: 'handled' as const,
      nestedScrollEnabled: true,
      bounces: false,
    }
  };
}
