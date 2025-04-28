import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export interface Record {
  id?: number;
  name: string;
  image: string;
  origin: string;
  regNum: string;
  regDate: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface QueryResult {
  records: Record[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly TABLE_NAME = 'records'; // Default table name, will try this first
  private actualTableName: string = 'records'; // Will be updated after determining which table exists
  private isDBInitialized = false;
  private cachedTotalRecords = 0;
  private _needsSampleData = false;

  // Query optimization flags
  private hasIndexOnName = false;
  
  async initDB(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) {
      return this.db;
    }
    try {
      console.time('DB_OPEN');
      console.log('Attempting to open database: output.sqlite');
      
      // Try multiple approaches to open the database
      let dbOpenError;
      
      // Approach 1: Using createFromLocation: 1 (from Android asset folder)
      try {
        console.log('Trying to open database from assets with createFromLocation: 1');
        this.db = await SQLite.openDatabase({
          name: 'output.sqlite',
          location: 'default',
          createFromLocation: 1, // This looks for the file in android/app/src/main/assets/
        });
        console.log('Database opened successfully with createFromLocation: 1');
      } catch (error1) {
        dbOpenError = error1;
        console.warn('Failed to open with createFromLocation: 1. Error:', error1);
        
        // Approach 2: Using exact path
        try {
          console.log('Trying to open database with exact path "~output.sqlite"');
          this.db = await SQLite.openDatabase({
            name: 'output.sqlite',
            location: 'default',
            createFromLocation: '~output.sqlite', // Using the file name with tilde prefix
          });
          console.log('Database opened successfully with createFromLocation: ~output.sqlite');
        } catch (error2) {
          console.warn('Failed to open with ~output.sqlite. Error:', error2);
          
          // Approach 3: Create a new database
          try {
            console.log('Creating a new database as last resort');
            this.db = await SQLite.openDatabase({
              name: 'output.sqlite',
              location: 'default',
            });
            console.log('Created new database successfully');
            
            // Set a flag to create sample data
            this._needsSampleData = true;
          } catch (error3) {
            console.error('All database open attempts failed!', error3);
            throw new Error('Could not open or create database after multiple attempts');
          }
        }
      }
      
      console.timeEnd('DB_OPEN');
      
      // Initialize database with optimization and sample data if needed
      if (!this.isDBInitialized) {
        try {
          // First detect the actual table name
          await this._detectTableName();
          
          // Then optimize the database
          await this._optimizeDatabase();
          
          // Create sample data if needed
          if (this._needsSampleData) {
            await this._createSampleData();
          }
          
          this.isDBInitialized = true;
        } catch (optimizeError) {
          console.error('Error during database initialization:', optimizeError);
          // Continue even if optimization fails
        }
      }
      
      return this.db;
    } catch (error) {
      console.error('Error opening database:', error);
      throw error;
    }
  }

  // Optimize database performance for large datasets
  private async _optimizeDatabase(): Promise<void> {
    if (!this.db) return;

    try {
      console.log('Starting database optimization...');

      // Enable WAL mode for better concurrent access
      try {
        await this.db.executeSql('PRAGMA journal_mode = WAL');
        console.log('WAL mode enabled');
      } catch (walError) {
        console.warn('Could not enable WAL mode:', walError);
      }

      // First, check if the table exists
      try {
        const tableCheck = await this.db.executeSql(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          [this.TABLE_NAME]
        );

        if (tableCheck[0].rows.length === 0) {
          console.log(`Table '${this.TABLE_NAME}' doesn't exist yet, will be created if needed`);
          return; // Exit early, table will be created later if needed
        } else {
          console.log(`Table '${this.TABLE_NAME}' exists`);
        }
      } catch (tableCheckError) {
        console.warn('Error checking for table existence:', tableCheckError);
        return; // Exit early, can't optimize what we can't check
      }

      // Check if index exists on name column
      try {
        const indexCheck = await this.db.executeSql(
          "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_records_name'"
        );

        if (indexCheck[0].rows.length === 0) {
          // Create index on name column for faster search
          console.log('Creating index on name column...');
          await this.db.executeSql(`CREATE INDEX IF NOT EXISTS idx_records_name ON ${this.TABLE_NAME}(name)`);
          this.hasIndexOnName = true;
          console.log('Index created successfully');
        } else {
          console.log('Index already exists');
          this.hasIndexOnName = true;
        }
      } catch (indexError) {
        console.warn('Error with index creation:', indexError);
      }

      // Get total count and cache it (we'll update this on modifications)
      try {
        const countResult = await this.db.executeSql(`SELECT COUNT(*) as count FROM ${this.TABLE_NAME}`);
        this.cachedTotalRecords = countResult[0].rows.item(0).count;
        console.log(`Cached total record count: ${this.cachedTotalRecords}`);
      } catch (countError) {
        console.warn('Error getting record count:', countError);
        this.cachedTotalRecords = 0; // Set to 0 if counting fails
      }

      console.log('Database optimization complete');
    } catch (error) {
      console.error('Error during database optimization:', error);
      // Continue even if optimization fails
    }
  }

  // Detect the actual table name in the database
  private async _detectTableName(): Promise<void> {
    if (!this.db) return;
    
    console.log('Detecting database table name...');
    
    try {
      // Get a list of all tables in the database
      const tablesResult = await this.db.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      
      if (tablesResult[0].rows.length === 0) {
        console.warn('No tables found in database');
        return; // We'll create one later
      }
      
      // Log all available tables
      console.log('Available tables:');
      const tableOptions = [];
      for (let i = 0; i < tablesResult[0].rows.length; i++) {
        const tableName = tablesResult[0].rows.item(i).name;
        tableOptions.push(tableName);
        console.log(`- ${tableName}`);
      }
      
      // Check if our default table name exists
      if (tableOptions.includes(this.TABLE_NAME)) {
        console.log(`Found expected table: ${this.TABLE_NAME}`);
        this.actualTableName = this.TABLE_NAME;
        return;
      }
      
      // Try to find a table that might contain our data
      // Common names for record tables
      const possibleTableNames = ['records', 'data', 'items', 'brand', 'entries', 'main'];
      
      for (const name of possibleTableNames) {
        if (tableOptions.includes(name)) {
          console.log(`Found potential data table: ${name}`);
          this.actualTableName = name;
          
          // Verify the table has the expected columns
          try {
            const columnsResult = await this.db.executeSql(`PRAGMA table_info(${name})`);
            const columns = [];
            for (let i = 0; i < columnsResult[0].rows.length; i++) {
              columns.push(columnsResult[0].rows.item(i).name);
            }
            console.log(`Columns in table ${name}:`, columns);
            
            // If the table has at least some of our expected columns, use it
            const expectedColumns = ['name', 'image', 'origin', 'regNum', 'regDate'];
            const hasRequiredColumns = expectedColumns.some(col => columns.includes(col));
            
            if (hasRequiredColumns) {
              console.log(`Table ${name} has required columns, will use it`);
              return;
            }
          } catch (columnError) {
            console.error(`Error checking columns for ${name}:`, columnError);
          }
        }
      }
      
      // If we reach here and didn't find a suitable table, use the first table
      if (tableOptions.length > 0) {
        console.log(`Using first available table: ${tableOptions[0]}`);
        this.actualTableName = tableOptions[0];
      } else {
        console.log('No suitable table found, will create one');
        this._needsSampleData = true;
      }
    } catch (error) {
      console.error('Error detecting table name:', error);
      // Keep the default table name
    }
  }

  // Create sample data for demo purposes
  private async _createSampleData(): Promise<void> {
    if (!this.db) return;
    
    console.log('Creating sample data for demo...');
    
    try {
      // Check if table exists
      const tableCheck = await this.db.executeSql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [this.TABLE_NAME]
      );
      
      // Create table if it doesn't exist
      if (tableCheck[0].rows.length === 0) {
        await this.db.executeSql(`
          CREATE TABLE IF NOT EXISTS ${this.TABLE_NAME} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            image TEXT,
            origin TEXT,
            regNum TEXT,
            regDate TEXT
          )
        `);
        console.log(`Created table: ${this.TABLE_NAME}`);
      }
      
      // Check if table is empty
      const countCheck = await this.db.executeSql(`SELECT COUNT(*) as count FROM ${this.TABLE_NAME}`);
      const recordCount = countCheck[0].rows.item(0).count;
      
      if (recordCount === 0) {
        console.log('Table is empty, inserting sample records...');
        
        // Begin transaction for faster inserts
        await this.db.executeSql('BEGIN TRANSACTION');
        
        // Insert at least 100 sample records
        const sampleSize = 200;
        
        // Available sample origins for more realistic data
        const origins = [
          'North America', 'Europe', 'Asia', 'South America', 
          'Africa', 'Australia', 'Antarctica'
        ];
        
        for (let i = 1; i <= sampleSize; i++) {
          const month = (i % 12) + 1;
          const day = (i % 28) + 1;
          const originIndex = i % origins.length;
          
          await this.db.executeSql(`
            INSERT INTO ${this.TABLE_NAME} (name, image, origin, regNum, regDate)
            VALUES (?, ?, ?, ?, ?)
          `, [
            `Sample Record ${i}`,
            '',  // No image for sample data
            origins[originIndex],
            `REG-${2023000 + i}`,
            `2023-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`
          ]);
        }
        
        // Commit transaction
        await this.db.executeSql('COMMIT');
        console.log(`Created ${sampleSize} sample records`);
        
        // Update cached count
        this.cachedTotalRecords = sampleSize;
      } else {
        console.log(`Table already contains ${recordCount} records, skipping sample data creation`);
      }
    } catch (error) {
      if (this.db) {
        // Rollback transaction if there was an error
        try {
          await this.db.executeSql('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError);
        }
      }
      
      console.error('Error creating sample data:', error);
      throw error;
    }
  }
  
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isDBInitialized = false;
    }
  }

  // Get total record count (using cached value for efficiency)
  async getTotalRecordCount(): Promise<number> {
    if (this.cachedTotalRecords > 0) {
      console.log(`Using cached record count: ${this.cachedTotalRecords}`);
      return this.cachedTotalRecords;
    }
    
    try {
      const db = await this.initDB();
      
      // First check if the table exists
      try {
        const tableCheck = await db.executeSql(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          [this.TABLE_NAME]
        );
        
        if (tableCheck[0].rows.length === 0) {
          console.warn(`Table ${this.TABLE_NAME} doesn't exist, returning count of 0`);
          return 0;
        }
      } catch (tableCheckError) {
        console.error('Error checking table existence during count:', tableCheckError);
        return 0;
      }
      
      console.log(`Counting records in ${this.TABLE_NAME} table...`);
      const countResult = await db.executeSql(`SELECT COUNT(*) as count FROM ${this.TABLE_NAME}`);
      this.cachedTotalRecords = countResult[0].rows.item(0).count;
      console.log(`Counted ${this.cachedTotalRecords} total records`);
      return this.cachedTotalRecords;
    } catch (error) {
      console.error('Error getting record count:', error);
      return 0; // Return 0 instead of throwing to improve resilience
    }
  }

  // Get records with pagination
  async getRecords(params: PaginationParams): Promise<QueryResult> {
    const { page = 1, pageSize = 20 } = params;
    const offset = (page - 1) * pageSize;
    
    try {
      const db = await this.initDB();
      console.time('DB_QUERY_PAGE');
      console.log(`Fetching records for page ${page}, pageSize ${pageSize}, offset ${offset}`);
      
      // Execute the paginated query using direct values in SQL
      const directQuery = `SELECT * FROM ${this.actualTableName} ORDER BY name LIMIT ${pageSize} OFFSET ${offset}`;
      console.log('Executing direct query:', directQuery);
      
      let queryResults;
      
      try {
        queryResults = await db.executeSql(directQuery, []);
        console.log(`Query executed successfully, returned ${queryResults[0].rows.length} rows`);
      } catch (directQueryError) {
        console.error('Direct query failed:', directQueryError);
        
        // Try alternative approaches
        try {
          console.log('Trying with "records" in quotes...');
          const quotedQuery = `SELECT * FROM "${this.actualTableName}" ORDER BY name LIMIT ${pageSize} OFFSET ${offset}`;
          queryResults = await db.executeSql(quotedQuery, []);
          console.log('Query with quotes worked!');
        } catch (quotedError) {
          console.error('Quoted query also failed:', quotedError);
          
          // If all else fails, try a simple query without sorting, limits or offsets
          try {
            console.log('Trying without ORDER/LIMIT/OFFSET as last resort...');
            const simpleQuery = `SELECT * FROM ${this.actualTableName}`;
            const simpleResults = await db.executeSql(simpleQuery, []);
            console.log('Simple query succeeded, manually filtering results...');
            
            // Since we couldn't use LIMIT/OFFSET in SQL, do it in code
            const clampedOffset = Math.min(offset, simpleResults[0].rows.length);
            const endIdx = Math.min(clampedOffset + pageSize, simpleResults[0].rows.length);
            
            // Create a modified results object with the paginated subset
            queryResults = [
              {
                rows: {
                  length: endIdx - clampedOffset,
                  item: (idx) => simpleResults[0].rows.item(clampedOffset + idx)
                }
              }
            ];
            
            console.log(`Manually paginated results: ${queryResults[0].rows.length} rows`);
          } catch (simpleError) {
            console.error('Even simple query failed:', simpleError);
            // Return empty result instead of throwing
            return {
              records: [],
              totalCount: 0,
              totalPages: 0,
              currentPage: page,
            };
          }
        }
      }
      
      // Get total count for pagination information
      const totalCount = await this.getTotalRecordCount();
      console.log(`Total records: ${totalCount}`);
      const totalPages = Math.ceil(totalCount / pageSize);
      
      // Parse the results
      const records: Record[] = [];
      const len = queryResults[0].rows.length;
      
      console.log(`Processing ${len} records from query result`);
      
      try {
        for (let i = 0; i < len; i++) {
          const row = queryResults[0].rows.item(i);
          records.push({
            id: row.id || i+1, // Fallback ID if none exists
            name: row.name || `Record ${i+1}`, // Fallback name
            image: row.image || '',
            origin: row.origin || '',
            regNum: row.regNum || '',
            regDate: row.regDate || '',
          });
        }
      } catch (rowProcessingError) {
        console.error('Error processing row data:', rowProcessingError);
      }
      
      console.log(`Processed ${records.length} records for current page ${page}`);
      console.timeEnd('DB_QUERY_PAGE');
      
      return {
        records,
        totalCount,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      console.error('Error fetching records:', error);
      // Return empty results instead of throwing, for better UX
      return {
        records: [],
        totalCount: 0, 
        totalPages: 0,
        currentPage: page,
      };
    }
  }

  // Search with pagination
  async searchRecordsByName(searchText: string, params: PaginationParams): Promise<QueryResult> {
    const { page = 1, pageSize = 20 } = params;
    const offset = (page - 1) * pageSize;
    const searchParam = `%${searchText}%`;
    
    try {
      const db = await this.initDB();
      console.time('DB_SEARCH');
      console.log(`Searching for: "${searchText}" with page=${page}, pageSize=${pageSize}`);
      
      // Make sure table exists before querying
      try {
        const tableCheck = await db.executeSql(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          [this.TABLE_NAME]
        );
        
        if (tableCheck[0].rows.length === 0) {
          console.warn(`Table ${this.TABLE_NAME} doesn't exist for search operation`);
          // Return empty result with correct structure
          return {
            records: [],
            totalCount: 0,
            totalPages: 0,
            currentPage: page,
          };
        }
      } catch (tableCheckError) {
        console.error('Error checking table existence during search:', tableCheckError);
      }
      
      // For performance reasons, use different query strategies based on search text length
      let query = '';
      let countQuery = '';
      
      // For very short search terms, we might want to use a starts-with approach
      if (searchText.length <= 2) {
        console.log('Using starts-with search strategy for short search term');
        query = `SELECT * FROM ${this.TABLE_NAME} WHERE name LIKE ? ORDER BY name LIMIT ? OFFSET ?`;
        countQuery = `SELECT COUNT(*) as count FROM ${this.TABLE_NAME} WHERE name LIKE ?`;
      } else {
        // For longer search terms, use full LIKE search
        console.log('Using contains search strategy for longer search term');
        query = `SELECT * FROM ${this.TABLE_NAME} WHERE name LIKE ? ORDER BY name LIMIT ? OFFSET ?`;
        countQuery = `SELECT COUNT(*) as count FROM ${this.TABLE_NAME} WHERE name LIKE ?`;
      }
      
      // Substitute parameters directly in the query for better compatibility
      const directQuery = `SELECT * FROM ${this.actualTableName} WHERE name LIKE '${searchParam}' ORDER BY name LIMIT ${pageSize} OFFSET ${offset}`;
      console.log('Executing direct search query:', directQuery);
      
      let results;
      
      try {
        results = await db.executeSql(directQuery, []);
        console.log(`Search query executed successfully, returned ${results[0].rows.length} rows`);
      } catch (directQueryError) {
        console.error('Direct search query failed:', directQueryError);
        
        // Try with quotes around the table name
        try {
          console.log('Trying with table name in quotes...');
          const quotedQuery = `SELECT * FROM "${this.actualTableName}" WHERE name LIKE '${searchParam}' ORDER BY name LIMIT ${pageSize} OFFSET ${offset}`;
          results = await db.executeSql(quotedQuery, []);
          console.log('Quoted search query worked!');
        } catch (quotedError) {
          console.error('Quoted search query also failed:', quotedError);
          
          // Last resort - try with a simpler query
          try {
            console.log('Trying simple search as last resort...');
            const simpleQuery = `SELECT * FROM ${this.actualTableName} WHERE name LIKE '${searchParam}'`;
            const simpleResults = await db.executeSql(simpleQuery, []);
            console.log('Simple search succeeded, manually filtering results...');
            
            // Manual pagination
            const clampedOffset = Math.min(offset, simpleResults[0].rows.length);
            const endIdx = Math.min(clampedOffset + pageSize, simpleResults[0].rows.length);
            
            // Create a modified results object
            results = [
              {
                rows: {
                  length: endIdx - clampedOffset,
                  item: (idx) => simpleResults[0].rows.item(clampedOffset + idx)
                }
              }
            ];
          } catch (simpleError) {
            console.error('Even simple search failed:', simpleError);
            return {
              records: [],
              totalCount: 0,
              totalPages: 0,
              currentPage: page
            };
          }
        }
      }
      
      // Get total count for search results pagination with direct SQL
      let totalCount = 0;
      try {
        console.log(`Executing direct count query: SELECT COUNT(*) as count FROM ${this.actualTableName} WHERE name LIKE '${searchParam}'`);
        const countResults = await db.executeSql(`SELECT COUNT(*) as count FROM ${this.actualTableName} WHERE name LIKE '${searchParam}'`, []);
        totalCount = countResults[0].rows.item(0).count;
      } catch (countError) {
        console.error('Count query failed:', countError);
        // Fallback to result length
        totalCount = results[0].rows.length;
      }
      
      const totalPages = Math.ceil(totalCount / pageSize);
      console.log(`Search found ${totalCount} total matches across ${totalPages} pages`);
      
      // Parse the results
      const records: Record[] = [];
      const len = results[0].rows.length;
      
      try {
        for (let i = 0; i < len; i++) {
          const row = results[0].rows.item(i);
          records.push({
            id: row.id || i+1, // Fallback ID
            name: row.name || `Result ${i+1}`, // Fallback name
            image: row.image || '',
            origin: row.origin || '',
            regNum: row.regNum || '',
            regDate: row.regDate || '',
          });
        }
      } catch (rowProcessingError) {
        console.error('Error processing search results:', rowProcessingError);
      }
      
      console.log(`Processed ${records.length} records for current page ${page}`);
      console.timeEnd('DB_SEARCH');
      
      return {
        records,
        totalCount,
        totalPages,
        currentPage: page,
      };
    } catch (error) {
      console.error('Error searching records:', error);
      // Return empty results instead of throwing, for better UX
      return {
        records: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: page,
      };
    }
  }
  
  // Performance optimized method to get just the data needed for initial display
  async getInitialData(pageSize: number = 20): Promise<QueryResult> {
    return this.getRecords({ page: 1, pageSize });
  }
}

export default new DatabaseService();