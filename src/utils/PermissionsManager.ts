import { PermissionsAndroid, Platform } from 'react-native';

export const requestPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }
  
  try {
    // For Android 13+ (API 33+)
    if (Platform.Version >= 33) {
      const mediaImagesPermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Image Access Permission',
          message: 'This app needs access to your images to display them from the database.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      
      return mediaImagesPermission === PermissionsAndroid.RESULTS.GRANTED;
    } 
    // For Android 12 and below
    else {
      const storagePermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Access Permission',
          message: 'This app needs access to your storage to display images from the database.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      
      return storagePermission === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.error('Error requesting permissions:', err);
    return false;
  }
};