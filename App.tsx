/**
 * React Native App with Material UI (React Native Paper)
 * Offline SQLite database support
 *
 * @format
 */

import React, { useEffect } from 'react';
import { useColorScheme, StatusBar, StyleSheet, LogBox } from 'react-native';
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  // Add any other warnings you want to ignore
]);

function App(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // Define light and dark themes
  const theme = isDarkMode
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: '#BB86FC',
          secondary: '#03DAC6',
        },
      }
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: '#6200EE',
          secondary: '#03DAC6',
        },
      };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <HomeScreen />
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default App;
