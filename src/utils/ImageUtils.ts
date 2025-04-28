import { Platform } from 'react-native';

/**
 * Formats an image path for proper display in React Native
 * 
 * @param imagePath The original image path from the database
 * @returns Formatted image path ready for Image component
 */
export const formatImagePath = (imagePath: string | null): string | null => {
  if (!imagePath) return null;
  
  // If path is already a URI (http, https, file), return as is
  if (imagePath.startsWith('http://') || 
      imagePath.startsWith('https://') || 
      imagePath.startsWith('file://')) {
    return imagePath;
  }
  
  // For Android, ensure the file:// prefix is added
  if (Platform.OS === 'android') {
    return `file://${imagePath}`;
  }
  
  return imagePath;
};