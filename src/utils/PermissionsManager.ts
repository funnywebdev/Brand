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
      const readStoragePermission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Read Permission',
          message: 'This app needs access to your storage to read images.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        }
      );
      
      // For Android 10 and below, we also need WRITE_EXTERNAL_STORAGE
      if (Platform.Version <= 29) {
        const writeStoragePermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Write Permission',
            message: 'This app needs access to write files to your storage.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
        
        return readStoragePermission === PermissionsAndroid.RESULTS.GRANTED &&
               writeStoragePermission === PermissionsAndroid.RESULTS.GRANTED;
      }
      
      return readStoragePermission === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.error('Error requesting permissions:', err);
    return false;
  }
};

/**
 * Checks if all required permissions are granted
 * @returns Promise<boolean> whether all permissions are granted
 */
export const checkPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }
  
  try {
    // For Android 13+ (API 33+)
    if (Platform.Version >= 33) {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
    } 
    // For Android 10-12
    else if (Platform.Version > 29) {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
    }
    // For Android 10 and below, we need both READ and WRITE
    else {
      const hasReadPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      const hasWritePermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      
      return hasReadPermission && hasWritePermission;
    }
  } catch (err) {
    console.error('Error checking permissions:', err);
    return false;
  }
};