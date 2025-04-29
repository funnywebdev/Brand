import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const SecondTabScreen: React.FC = () => {
  const theme = useTheme();
  
  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.content}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>Second Tab Content</Text>
          <Text style={styles.description}>
            This is the placeholder for the second tab functionality.
          </Text>
        </View>
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
  },
});

export default SecondTabScreen;