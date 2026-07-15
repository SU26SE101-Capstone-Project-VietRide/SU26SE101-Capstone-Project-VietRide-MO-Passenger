import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Tracks foreground availability for lifecycle-sensitive network work. */
export function useIsAppActive(): boolean {
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const handleStateChange = (nextState: AppStateStatus): void => {
      setIsActive(nextState === 'active');
    };
    const subscription = AppState.addEventListener('change', handleStateChange);

    return () => subscription.remove();
  }, []);

  return isActive;
}
