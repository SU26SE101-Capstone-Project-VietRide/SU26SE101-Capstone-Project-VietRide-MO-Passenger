import React from 'react';
import { StatusBar } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export function StatusBarDynamic(): React.JSX.Element {
  const theme = useTheme();
  
  return (
    <StatusBar 
      barStyle={theme.isDark ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent
    />
  );
}
