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
  
  // Calculate precise scroll area
  const availableHeight = isKeyboardVisible ? height - keyboardHeight : height;
  const maxScrollHeight = availableHeight - containerPadding * 2;

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
        flex: 1,
        maxHeight: maxScrollHeight 
      },
      contentContainerStyle: { 
        padding: containerPadding,
        paddingBottom: containerPadding + (isKeyboardVisible ? 20 : 100)
      },
      showsVerticalScrollIndicator: false,
      keyboardShouldPersistTaps: 'handled' as const,
      nestedScrollEnabled: true,
      bounces: false,
    }
  };
}
