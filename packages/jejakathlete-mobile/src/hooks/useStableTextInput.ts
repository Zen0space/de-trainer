import { useRef, useCallback } from 'react';
import { TextInput } from 'react-native';

/**
 * Custom hook for stable TextInput management that prevents keyboard dismissal
 * 
 * Problem: Controlled TextInput components (using `value` prop) cause re-renders
 * on every character typed, which can dismiss the keyboard in certain scenarios.
 * 
 * Solution: Use uncontrolled inputs with `defaultValue` and refs to access values
 * only when needed (e.g., on save), preventing unnecessary re-renders.
 * 
 * Based on React Native best practices and 2025 community solutions:
 * - Use defaultValue instead of value to prevent re-renders
 * - Use useRef to access current text value when needed
 * - Maintain focus through ref system without state updates
 */

interface UseStableTextInputOptions {
  initialValue?: string;
  onValueChange?: (value: string) => void;
  validateOnBlur?: boolean;
}

interface StableTextInputReturn {
  // Ref to attach to TextInput component
  inputRef: React.RefObject<TextInput | null>;
  
  // Props to spread on TextInput
  inputProps: {
    defaultValue: string;
    onChangeText?: (text: string) => void;
    onBlur?: () => void;
  };
  
  // Methods to interact with the input
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

export function useStableTextInput({
  initialValue = '',
  onValueChange,
  validateOnBlur = false
}: UseStableTextInputOptions = {}): StableTextInputReturn {
  const inputRef = useRef<TextInput>(null);
  const currentValueRef = useRef<string>(initialValue);

  // Update internal value tracking without causing re-renders
  const handleChangeText = useCallback((text: string) => {
    currentValueRef.current = text;
    
    // Optional: Call onValueChange if provided, but this should be used sparingly
    // to avoid the same re-render issues we're trying to solve
    if (onValueChange && !validateOnBlur) {
      onValueChange(text);
    }
  }, [onValueChange, validateOnBlur]);

  // Handle blur events (when user finishes editing)
  const handleBlur = useCallback(() => {
    if (onValueChange && validateOnBlur) {
      onValueChange(currentValueRef.current);
    }
  }, [onValueChange, validateOnBlur]);

  // Get current value without causing re-render
  const getValue = useCallback((): string => {
    return currentValueRef.current;
  }, []);

  // Programmatically set value
  const setValue = useCallback((value: string) => {
    if (inputRef.current) {
      inputRef.current.setNativeProps({ text: value });
      currentValueRef.current = value;
    }
  }, []);

  // Focus the input
  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Blur the input
  const blur = useCallback(() => {
    inputRef.current?.blur();
  }, []);

  // Clear the input
  const clear = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.clear();
      currentValueRef.current = '';
    }
  }, []);

  return {
    inputRef,
    inputProps: {
      defaultValue: initialValue,
      onChangeText: handleChangeText,
      onBlur: handleBlur,
    },
    getValue,
    setValue,
    focus,
    blur,
    clear,
  };
}

/**
 * Hook for managing multiple stable text inputs in forms
 * Useful for profile edit forms where multiple fields need stable focus management
 */
export function useStableForm<T extends Record<string, string>>(
  initialValues: T
) {
  const inputRefs = useRef<Partial<Record<keyof T, React.RefObject<TextInput | null>>>>({});
  const valuesRef = useRef<T>(initialValues);

  // Initialize refs for each field
  Object.keys(initialValues).forEach((key) => {
    const typedKey = key as keyof T;
    if (!inputRefs.current[typedKey]) {
      (inputRefs.current as any)[typedKey] = useRef<TextInput | null>(null);
    }
  });

  // Get current values for all fields
  const getValues = useCallback((): T => {
    return valuesRef.current;
  }, []);

  // Get value for specific field
  const getValue = useCallback((fieldName: keyof T): string => {
    return valuesRef.current[fieldName] || '';
  }, []);

  // Set value for specific field
  const setValue = useCallback((fieldName: keyof T, value: string) => {
    const inputRef = inputRefs.current[fieldName];
    if (inputRef?.current) {
      inputRef.current.setNativeProps({ text: value });
      valuesRef.current = { ...valuesRef.current, [fieldName]: value };
    }
  }, []);

  // Get input props for a specific field
  const getInputProps = useCallback((fieldName: keyof T) => {
    return {
      ref: inputRefs.current[fieldName],
      defaultValue: initialValues[fieldName] || '',
      onChangeText: (text: string) => {
        valuesRef.current = { ...valuesRef.current, [fieldName]: text };
      },
    };
  }, [initialValues]);

  // Focus specific field
  const focusField = useCallback((fieldName: keyof T) => {
    inputRefs.current[fieldName]?.current?.focus();
  }, []);

  return {
    getValues,
    getValue,
    setValue,
    getInputProps,
    focusField,
    inputRefs: inputRefs.current,
  };
}
