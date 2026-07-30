import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo } from 'react-native';
import { ReduceMotion, ReducedMotionConfig } from 'react-native-reanimated';

interface MotionContextValue {
  reduceMotion: boolean;
}

const MotionContext = createContext<MotionContextValue>({
  reduceMotion: false,
});

interface MotionProviderProps {
  children: React.ReactNode;
}

export function MotionProvider({
  children,
}: MotionProviderProps): React.JSX.Element {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isActive = true;

    void AccessibilityInfo.isReduceMotionEnabled().then(isEnabled => {
      if (isActive) {
        setReduceMotion(isEnabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, []);

  const value = useMemo(() => ({ reduceMotion }), [reduceMotion]);

  return (
    <MotionContext.Provider value={value}>
      <ReducedMotionConfig mode={ReduceMotion.System} />
      {children}
    </MotionContext.Provider>
  );
}

export const useMotion = (): MotionContextValue => useContext(MotionContext);
