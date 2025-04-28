import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { getBrandImagePath, listBrandImages } from '../utils/ImageUtils';

interface ImagePlaceholderProps {
  size?: number;
  imageName?: string;
  fallbackText?: string;
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ 
  size = 40, 
  imageName,
  fallbackText = '?'
}) => {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load image from brand directory
  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        
        if (imageName) {
          // Try to load the specific image
          const path = await getBrandImagePath(imageName);
          setImagePath(path);
        } else {
          // If no specific image requested, try to load the first available image
          const images = await listBrandImages();
          if (images.length > 0) {
            setImagePath(images[0]);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading brand image:', err);
        setError('Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [imageName]);

  // If we have an image path, display the image
  if (imagePath) {
    return (
      <Image 
        source={{ uri: imagePath }} 
        style={[styles.image, { width: size, height: size, borderRadius: size / 5 }]} 
        resizeMode="cover"
      />
    );
  }

  // Otherwise show the placeholder
  return (
    <View 
      style={[
        styles.placeholder, 
        { width: size, height: size, borderRadius: size / 5 }
      ]}
    >
      <Text style={styles.icon}>{loading ? '...' : fallbackText}</Text>
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
  },
  image: {
    backgroundColor: '#f0f0f0',
  }
});

export default ImagePlaceholder;