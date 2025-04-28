import {Platform, NativeModules} from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Formats an image path for proper display in React Native
 *
 * @param imagePath The original image path from the database
 * @returns Formatted image path ready for Image component
 */
export const formatImagePath = (imagePath: string | null): string | null => {
  if (!imagePath) return null;
  // If path is already a URI (http, https, file), return as is
  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://') ||
    imagePath.startsWith('file://')
  ) {
    return imagePath;
  }

  // For Android, ensure the file:// prefix is added
  if (Platform.OS === 'android') {
    return `file://${RNFS.ExternalStorageDirectoryPath}/brand/${imagePath}`;
  }

  return imagePath;
};

/**
 * Get the full path to access an image from the app's brand directory
 * Tries internal storage first, falls back to external if not found
 *
 * @param imageName The name of the image file (e.g., "profile.jpg")
 * @returns Promise resolving to the full file:// URI path to the image or null if not found
 */
export const getBrandImagePath = async (
  imageName: string,
): Promise<string | null> => {
  if (Platform.OS !== 'android') {
    return null; // Currently only implemented for Android
  }

  try {
    // First check internal storage (app private directory)
    const internalDirPath = `${RNFS.DocumentDirectoryPath}/brand`;
    const internalImagePath = `${internalDirPath}/${imageName}`;

    const internalExists = await RNFS.exists(internalImagePath);
    if (internalExists) {
      return `file://${internalImagePath}`;
    }

    // Check app-specific external storage directory
    const externalDirPath = `${RNFS.ExternalDirectoryPath}/brand`;
    const externalImagePath = `${externalDirPath}/${imageName}`;

    const externalExists = await RNFS.exists(externalImagePath);
    if (externalExists) {
      return `file://${externalImagePath}`;
    }

    // As a last resort, check the public external storage directory
    // Note: This requires MANAGE_EXTERNAL_STORAGE or READ_EXTERNAL_STORAGE permission
    const publicExternalDirPath = `${RNFS.ExternalStorageDirectoryPath}/brand`;
    const publicExternalImagePath = `${publicExternalDirPath}/${imageName}`;

    const publicExternalExists = await RNFS.exists(publicExternalImagePath);
    if (publicExternalExists) {
      return `file://${publicExternalImagePath}`;
    }

    return null;
  } catch (error) {
    console.error('Error accessing brand image:', error);
    return null;
  }
};

/**
 * Lists all available images in the brand directories
 * Combines results from internal and external storage
 *
 * @returns Promise resolving to an array of file:// URI paths to all images
 */
export const listBrandImages = async (): Promise<string[]> => {
  if (Platform.OS !== 'android') {
    return []; // Currently only implemented for Android
  }

  try {
    const imageList: string[] = [];

    // Check internal storage
    const internalDirPath = `${RNFS.DocumentDirectoryPath}/brand`;
    if (await RNFS.exists(internalDirPath)) {
      const internalFiles = await RNFS.readDir(internalDirPath);
      internalFiles.forEach(file => {
        if (file.isFile() && isImageFile(file.name)) {
          imageList.push(`file://${file.path}`);
        }
      });
    }

    // Check app-specific external storage
    const externalDirPath = `${RNFS.ExternalDirectoryPath}/brand`;
    if (await RNFS.exists(externalDirPath)) {
      const externalFiles = await RNFS.readDir(externalDirPath);
      externalFiles.forEach(file => {
        if (file.isFile() && isImageFile(file.name)) {
          imageList.push(`file://${file.path}`);
        }
      });
    }

    // Check public external storage
    const publicExternalDirPath = `${RNFS.ExternalStorageDirectoryPath}/brand`;
    if (await RNFS.exists(publicExternalDirPath)) {
      const publicExternalFiles = await RNFS.readDir(publicExternalDirPath);
      publicExternalFiles.forEach(file => {
        if (file.isFile() && isImageFile(file.name)) {
          imageList.push(`file://${file.path}`);
        }
      });
    }

    return imageList;
  } catch (error) {
    console.error('Error listing brand images:', error);
    return [];
  }
};

/**
 * Helper function to check if a file is an image based on extension
 */
const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const lowerFilename = filename.toLowerCase();
  return imageExtensions.some(ext => lowerFilename.endsWith(ext));
};

/**
 * Saves an image to the brand directory - tries to save to internal storage first,
 * falls back to external if internal storage is unavailable
 *
 * @param imageName Filename to save the image as (e.g., "profile.jpg")
 * @param imageData Image data (base64 string, file path, or URL)
 * @param sourceType Type of imageData ('base64', 'file', or 'url')
 * @returns Promise resolving to the file:// URI path where the image was saved or null if failed
 */
export const saveBrandImage = async (
  imageName: string,
  imageData: string,
  sourceType: 'base64' | 'file' | 'url' = 'file',
): Promise<string | null> => {
  if (Platform.OS !== 'android') {
    return null; // Currently only implemented for Android
  }

  try {
    // First try internal storage (more secure, app-private)
    const internalDirPath = `${RNFS.DocumentDirectoryPath}/brand`;
    const internalImagePath = `${internalDirPath}/${imageName}`;

    // Create directory if it doesn't exist
    const internalDirExists = await RNFS.exists(internalDirPath);
    if (!internalDirExists) {
      await RNFS.mkdir(internalDirPath);
    }

    // Save the image based on the source type
    if (sourceType === 'base64') {
      await RNFS.writeFile(internalImagePath, imageData, 'base64');
      return `file://${internalImagePath}`;
    } else if (sourceType === 'file') {
      // If source is a file path, copy the file
      if (imageData.startsWith('file://')) {
        imageData = imageData.substring(7); // Remove file:// prefix
      }
      await RNFS.copyFile(imageData, internalImagePath);
      return `file://${internalImagePath}`;
    } else if (sourceType === 'url') {
      // Download from URL
      const downloadResult = await RNFS.downloadFile({
        fromUrl: imageData,
        toFile: internalImagePath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        return `file://${internalImagePath}`;
      }
    }

    // If internal storage fails or we're specifically looking to save to external storage,
    // try external app-specific directory
    const externalDirPath = `${RNFS.ExternalDirectoryPath}/brand`;
    const externalImagePath = `${externalDirPath}/${imageName}`;

    // Create directory if it doesn't exist
    const externalDirExists = await RNFS.exists(externalDirPath);
    if (!externalDirExists) {
      await RNFS.mkdir(externalDirPath);
    }

    // Save to external storage
    if (sourceType === 'base64') {
      await RNFS.writeFile(externalImagePath, imageData, 'base64');
      return `file://${externalImagePath}`;
    } else if (sourceType === 'file') {
      if (imageData.startsWith('file://')) {
        imageData = imageData.substring(7); // Remove file:// prefix
      }
      await RNFS.copyFile(imageData, externalImagePath);
      return `file://${externalImagePath}`;
    } else if (sourceType === 'url') {
      const downloadResult = await RNFS.downloadFile({
        fromUrl: imageData,
        toFile: externalImagePath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        return `file://${externalImagePath}`;
      }
    }

    return null;
  } catch (error) {
    console.error('Error saving brand image:', error);
    return null;
  }
};
