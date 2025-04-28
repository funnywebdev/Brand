import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface ImagePlaceholderProps {
  size?: number;
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ size = 40 }) => {
  return (
    <View 
      style={[
        styles.placeholder, 
        { width: size, height: size, borderRadius: size / 5 }
      ]}
    >
      <Text style={styles.icon}>?</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    color: '#757575',
  }
});

export default ImagePlaceholder;