import {Platform} from 'react-native';
import RNFS from 'react-native-fs';

export interface MainRegisterItem {
  name: string;
  brand: string;
  totalSpace: number;
  image?: string;
  flag?: number;
  currentAmount?: number; // Added field for tracking current amount
}

export interface JsonItem {
  id: number;
  fullInvoiceName: string;
  objCompany: string;
  censoredDt: string;
  updatedDt?: string; // Optional field for when items are updated
  mainRegisters: MainRegisterItem[];
  editStatus?: {
    saved: boolean;
    exported: boolean;
    lastSaved?: string;
    lastExported?: string;
    exportPath?: string;
  };
}

export interface SearchOptions {
  idFilter?: number;
  companyFilter?: string;
}

class JsonFileService {
  private readonly invoicesDirectory: string;

  constructor() {
    // Set predefined "invoices" directory based on platform
    if (Platform.OS === 'android') {
      this.invoicesDirectory = `${RNFS.ExternalStorageDirectoryPath}/brand/invoices`;
    } else {
      this.invoicesDirectory = `${RNFS.DocumentDirectoryPath}/invoices`;
    }
  }

  /**
   * Gets the invoices directory path
   */
  getInvoicesDirectory(): string {
    return this.invoicesDirectory;
  }

  /**
   * Creates the invoices directory if it doesn't exist
   */
  async ensureInvoicesDirectoryExists(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.invoicesDirectory);
      if (!exists) {
        console.log(`Creating invoices directory: ${this.invoicesDirectory}`);
        await RNFS.mkdir(this.invoicesDirectory);
      }
    } catch (error) {
      console.error('Error creating invoices directory:', error);
      throw error;
    }
  }

  /**
   * Finds all JSON files in the invoices directory
   */
  async findJsonFiles(): Promise<string[]> {
    try {
      const exists = await RNFS.exists(this.invoicesDirectory);
      if (!exists) {
        // Create the directory if it doesn't exist
        await this.ensureInvoicesDirectoryExists();
        return [];
      }

      const files = await RNFS.readDir(this.invoicesDirectory);
      return files
        .filter(
          file => file.isFile() && file.name.toLowerCase().endsWith('.json'),
        )
        .map(file => file.path);
    } catch (error) {
      console.error('Error finding JSON files:', error);
      throw error;
    }
  }

  /**
   * Reads and parses a JSON file
   */
  async readJsonFile(filePath: string): Promise<JsonItem[]> {
    try {
      const content = await RNFS.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading JSON file ${filePath}:`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Scans all JSON files in the invoices directory and merges items,
   * keeping the most recent item when IDs are duplicated
   */
  async scanJsonItems(options: SearchOptions = {}): Promise<JsonItem[]> {
    try {
      const {idFilter, companyFilter} = options;
      // Find all JSON files
      const jsonFiles = await this.findJsonFiles();
      console.log(
        `Found ${jsonFiles.length} JSON files in ${this.invoicesDirectory}`,
      );

      if (jsonFiles.length === 0) {
        return [];
      }

      // Map to store the most recent item for each ID
      const itemsMap = new Map<number, JsonItem>();

      // Read and process each file
      for (const filePath of jsonFiles) {
        try {
          const items = await this.readJsonFile(filePath);

          // Process each item
          items.forEach(item => {
            // Apply filters if specified
            if (idFilter !== undefined && item.id !== idFilter) {
              return;
            }

            if (
              companyFilter &&
              (!item.objCompany ||
                !item.objCompany
                  .toLowerCase()
                  .includes(companyFilter.toLowerCase()))
            ) {
              return;
            }

            // Check if this ID already exists in our map
            if (itemsMap.has(item.id)) {
              const existingItem = itemsMap.get(item.id)!;

              // Keep the item with the more recent updatedDt
              const existingDate = existingItem.updatedDt
                ? new Date(existingItem.updatedDt)
                : new Date(existingItem.censoredDt);

              const newDate = item.updatedDt
                ? new Date(item.updatedDt)
                : new Date(item.censoredDt);

              // If new item is more recent, replace the existing one
              if (newDate > existingDate) {
                itemsMap.set(item.id, item);
              }
            } else {
              // New ID, add to map
              itemsMap.set(item.id, item);
            }
          });
        } catch (error) {
          console.error(`Error processing file ${filePath}:`, error);
          // Continue with next file on error
        }
      }

      // Convert map to array and sort by ID
      return Array.from(itemsMap.values()).sort((a, b) => a.id - b.id);
    } catch (error) {
      console.error('Error scanning JSON items:', error);
      throw error;
    }
  }

  /**
   * Counts mainRegisters across all valid JSON items
   */
  countTotalMainRegisters(items: JsonItem[]): number {
    return items.reduce((total, item) => {
      return (
        total +
        (Array.isArray(item.mainRegisters) ? item.mainRegisters.length : 0)
      );
    }, 0);
  }

  /**
   * Gets the exports directory path
   */
  getExportsDirectory(): string {
    if (Platform.OS === 'android') {
      return `${RNFS.ExternalStorageDirectoryPath}/brand/exports`;
    } else {
      return `${RNFS.DocumentDirectoryPath}/exports`;
    }
  }

  /**
   * Ensures the exports directory exists
   */
  async ensureExportsDirectoryExists(): Promise<void> {
    const exportsDir = this.getExportsDirectory();
    try {
      const exists = await RNFS.exists(exportsDir);
      if (!exists) {
        console.log(`Creating exports directory: ${exportsDir}`);
        await RNFS.mkdir(exportsDir);
      }
    } catch (error) {
      console.error('Error creating exports directory:', error);
      throw error;
    }
  }

  /**
   * Save edited item to persistent storage
   */
  async saveEditedItem(item: JsonItem): Promise<JsonItem> {
    try {
      // Ensure we have a store directory
      const storeDir = `${RNFS.DocumentDirectoryPath}/edited_items`;
      const exists = await RNFS.exists(storeDir);
      if (!exists) {
        await RNFS.mkdir(storeDir);
      }

      // Create a filename based on the item id
      const filePath = `${storeDir}/item_${item.id}.json`;
      
      // Update the edit status
      const updatedItem = {
        ...item,
        editStatus: {
          ...item.editStatus,
          saved: true,
          lastSaved: new Date().toISOString()
        }
      };

      // Save the item to file
      await RNFS.writeFile(filePath, JSON.stringify(updatedItem, null, 2), 'utf8');
      console.log(`Item ${item.id} saved to ${filePath}`);
      
      return updatedItem;
    } catch (error) {
      console.error('Error saving edited item:', error);
      throw error;
    }
  }

  /**
   * Export edited item to JSON file
   */
  async exportEditedItem(item: JsonItem): Promise<JsonItem> {
    try {
      // Ensure exports directory exists
      await this.ensureExportsDirectoryExists();
      
      // Create a filename with timestamp to prevent overwriting
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
      const exportDir = this.getExportsDirectory();
      const fileName = `item_${item.id}_${timestamp}.json`;
      const filePath = `${exportDir}/${fileName}`;
      
      // Update the edit status
      const updatedItem = {
        ...item,
        editStatus: {
          ...item.editStatus,
          exported: true,
          lastExported: new Date().toISOString(),
          exportPath: filePath
        }
      };

      // Export the item to file
      await RNFS.writeFile(filePath, JSON.stringify(updatedItem, null, 2), 'utf8');
      console.log(`Item ${item.id} exported to ${filePath}`);
      
      // Also update the saved item
      await this.saveEditedItem(updatedItem);
      
      return updatedItem;
    } catch (error) {
      console.error('Error exporting edited item:', error);
      throw error;
    }
  }

  /**
   * Load all saved edited items
   */
  async loadAllEditedItems(): Promise<Map<number, JsonItem>> {
    try {
      const itemsMap = new Map<number, JsonItem>();
      const storeDir = `${RNFS.DocumentDirectoryPath}/edited_items`;
      
      // Check if directory exists
      const exists = await RNFS.exists(storeDir);
      if (!exists) {
        return itemsMap;
      }
      
      // Read all files in the directory
      const files = await RNFS.readDir(storeDir);
      const jsonFiles = files.filter(
        file => file.isFile() && file.name.toLowerCase().endsWith('.json'),
      );
      
      // Process each file
      for (const file of jsonFiles) {
        try {
          const content = await RNFS.readFile(file.path, 'utf8');
          const item = JSON.parse(content) as JsonItem;
          if (item && item.id) {
            itemsMap.set(item.id, item);
          }
        } catch (error) {
          console.error(`Error reading edited item file ${file.path}:`, error);
          // Continue with next file
        }
      }
      
      return itemsMap;
    } catch (error) {
      console.error('Error loading edited items:', error);
      return new Map<number, JsonItem>();
    }
  }
  
  /**
   * Delete saved item to reset editing
   */
  async deleteSavedItem(itemId: number): Promise<boolean> {
    try {
      const storeDir = `${RNFS.DocumentDirectoryPath}/edited_items`;
      const filePath = `${storeDir}/item_${itemId}.json`;
      
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        return false;
      }
      
      // Delete the file
      await RNFS.unlink(filePath);
      console.log(`Deleted saved item ${itemId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting saved item ${itemId}:`, error);
      return false;
    }
  }
  
  /**
   * Reset saved and exported status for an item
   */
  async resetItemStatus(item: JsonItem): Promise<JsonItem> {
    // First delete the saved file
    await this.deleteSavedItem(item.id);
    
    // Return a new item with status removed and current amounts cleared
    const updatedItem: JsonItem = {
      ...item,
      editStatus: undefined,
      mainRegisters: item.mainRegisters.map(register => ({
        ...register,
        currentAmount: undefined
      }))
    };
    
    return updatedItem;
  }
  
  /**
   * Reset all saved items
   */
  async resetAllSavedItems(): Promise<boolean> {
    try {
      const storeDir = `${RNFS.DocumentDirectoryPath}/edited_items`;
      
      // Check if directory exists
      const exists = await RNFS.exists(storeDir);
      if (!exists) {
        return true; // Nothing to reset
      }
      
      // Get all saved files
      const files = await RNFS.readDir(storeDir);
      const jsonFiles = files.filter(file => file.isFile() && file.name.endsWith('.json'));
      
      // Delete each file
      for (const file of jsonFiles) {
        await RNFS.unlink(file.path);
      }
      
      console.log(`Reset ${jsonFiles.length} saved items`);
      return true;
    } catch (error) {
      console.error('Error resetting all saved items:', error);
      return false;
    }
  }
}

export default new JsonFileService();
