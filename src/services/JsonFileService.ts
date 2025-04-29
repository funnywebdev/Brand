import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export interface MainRegisterItem {
  name: string;
  brand: string;
  totalSpace: number;
  image?: string;
  flag?: number;
}

export interface JsonItem {
  id: number;
  fullInvoiceName: string;
  objCompany: string;
  censoredDt: string;
  updatedDt?: string; // Optional field for when items are updated
  mainRegisters: MainRegisterItem[];
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
        .filter(file => file.isFile() && file.name.toLowerCase().endsWith('.json'))
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
      const { idFilter, companyFilter } = options;
      
      // Find all JSON files
      const jsonFiles = await this.findJsonFiles();
      console.log(`Found ${jsonFiles.length} JSON files in ${this.invoicesDirectory}`);
      
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
            
            if (companyFilter && 
                (!item.objCompany || 
                 !item.objCompany.toLowerCase().includes(companyFilter.toLowerCase()))) {
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
      return total + (Array.isArray(item.mainRegisters) ? item.mainRegisters.length : 0);
    }, 0);
  }
}

export default new JsonFileService();