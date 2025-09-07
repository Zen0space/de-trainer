import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

interface KeyboardInfo {
  isVisible: boolean;
  height: number;
  duration?: number;
  easing?: string;
}

/**
 * Custom hook for keyboard state management
 * Based on React Native Keyboard API: https://reactnative.dev/docs/keyboard
 */
export function useKeyboard(): KeyboardInfo {
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    isVisible: false,
    height: 0,
  });

  useEffect(() => {
    // Keyboard event handlers
    const handleKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardInfo({
        isVisible: true,
        height: event.endCoordinates.height,
        duration: event.duration,
        easing: event.easing,
      });
    };

    const handleKeyboardHide = (event: KeyboardEvent) => {
      setKeyboardInfo({
        isVisible: false,
        height: 0,
        duration: event.duration,
        easing: event.easing,
      });
    };

    // Add keyboard event listeners
    const showSubscription = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
    const hideSubscription = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);

    // Check initial keyboard state
    const initialHeight = Keyboard.isVisible() ? (Keyboard.metrics()?.height || 0) : 0;
    setKeyboardInfo({
      isVisible: Keyboard.isVisible(),
      height: initialHeight,
    });

    // Cleanup subscriptions on unmount
    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  return keyboardInfo;
}

/**
 * Hook that provides keyboard dismiss functionality
 */
export function useKeyboardDismiss() {
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return { dismissKeyboard };
}
