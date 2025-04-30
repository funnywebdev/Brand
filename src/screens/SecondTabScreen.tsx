import React, {useState, useEffect, useCallback} from 'react';
import {StyleSheet, View, ToastAndroid, Platform} from 'react-native';
import {
  Text, 
  Surface, 
  Button, 
  Card, 
  Searchbar, 
  Menu, 
  IconButton,
  Portal,
  Dialog
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import JsonFileService, {JsonItem} from '../services/JsonFileService';
import JsonItemTable from '../components/JsonItemTable';
import {requestPermissions} from '../utils/PermissionsManager';
import RegisterDetailsScreen from './RegisterDetailsScreen';

const SecondTabScreen: React.FC = () => {
  const [items, setItems] = useState<JsonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<JsonItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Initialize and load items
  useEffect(() => {
    const initialize = async () => {
      try {
        // Request permissions
        if (Platform.OS === 'android') {
          const permissionsGranted = await requestPermissions();
          if (!permissionsGranted) {
            setError('Storage permission denied. Cannot scan JSON files.');
            ToastAndroid.show(
              'Permission denied for accessing files',
              ToastAndroid.LONG,
            );
            return;
          }
        }

        // Ensure the invoices directory exists
        await JsonFileService.ensureInvoicesDirectoryExists();
        
        // Ensure the exports directory exists
        await JsonFileService.ensureExportsDirectoryExists();

        // Load items
        loadItems();
      } catch (err) {
        console.error('Error initializing:', err);
        setError(`Failed to initialize: ${err.message || 'Unknown error'}`);
      }
    };

    initialize();
  }, []);

  // Load items from JSON files and merge with saved edited items
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all saved edited items
      const savedItemsMap = await JsonFileService.loadAllEditedItems();
      console.log(`Loaded ${savedItemsMap.size} saved edited items`);

      // Scan for JSON items
      const jsonItems = await JsonFileService.scanJsonItems({
        companyFilter: searchQuery,
      });

      // Merge saved items with fetched items
      const mergedItems = jsonItems.map(item => {
        const savedItem = savedItemsMap.get(item.id);
        if (savedItem) {
          // Use the saved item data, but keep the mainRegisters from original if not in saved
          return {
            ...item,
            mainRegisters: savedItem.mainRegisters || item.mainRegisters,
            editStatus: savedItem.editStatus,
          };
        }
        return item;
      });

      setItems(mergedItems);

      // Show toast with count
      if (Platform.OS === 'android') {
        const mainRegisterCount = JsonFileService.countTotalMainRegisters(mergedItems);
        const savedCount = savedItemsMap.size;
        
        ToastAndroid.show(
          `Found ${mergedItems.length} items with ${mainRegisterCount} registers${
            savedCount > 0 ? ` (${savedCount} with saved edits)` : ''
          }`,
          ToastAndroid.SHORT,
        );
      }
    } catch (err) {
      console.error('Error loading items:', err);
      setError(`Failed to load items: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Handle item press - navigate to details screen
  const handleItemPress = useCallback((item: JsonItem) => {
    setSelectedItem(item);
    setShowDetails(true);
  }, []);

  // Handle back from details screen
  const handleBackFromDetails = useCallback(() => {
    setShowDetails(false);
    setSelectedItem(null);
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
  
  // Handle reset all items
  const handleResetAllItems = useCallback(async () => {
    try {
      setLoading(true);
      
      // Reset all saved items
      const success = await JsonFileService.resetAllSavedItems();
      
      if (success) {
        // Reload items to reflect the reset
        await loadItems();
        
        // Show success toast
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            'All item statuses have been reset successfully',
            ToastAndroid.SHORT
          );
        }
      } else {
        // Show error toast
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            'Failed to reset all item statuses',
            ToastAndroid.LONG
          );
        }
      }
    } catch (error) {
      console.error('Error resetting all items:', error);
      
      // Show error toast
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          'An error occurred while resetting item statuses',
          ToastAndroid.LONG
        );
      }
    } finally {
      setLoading(false);
      setShowResetDialog(false);
    }
  }, [loadItems]);
  
  // Update item if it was changed in details screen
  const handleItemUpdated = useCallback((updatedItem: JsonItem) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      )
    );
  }, []);
  
  // Render reset all confirmation dialog
  const renderResetDialog = useCallback(() => {
    return (
      <Portal>
        <Dialog
          visible={showResetDialog}
          onDismiss={() => setShowResetDialog(false)}
        >
          <Dialog.Title>Reset All Items?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to reset all saved and exported items? This will clear all current amount values and status information across all items.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowResetDialog(false)}>Cancel</Button>
            <Button onPress={handleResetAllItems} mode="contained">Reset All</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  }, [showResetDialog, handleResetAllItems]);
  
  // If showing details screen, render that instead of the list
  if (showDetails && selectedItem) {
    return (
      <RegisterDetailsScreen
        item={selectedItem}
        onBack={handleBackFromDetails}
        onItemUpdated={handleItemUpdated}
      />
    );
  }

  // Otherwise show the main list screen
  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.content}>
        <View style={styles.controlsContainer}>
          <Searchbar
            placeholder="Search by company name"
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
          />

          <View style={styles.buttonsRow}>
            <Button
              mode="contained"
              onPress={loadItems}
              disabled={loading}
              icon="refresh"
              style={styles.scanButton}>
              Scan Files
            </Button>
            
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item
                icon="refresh"
                title="Reset All Items"
                onPress={() => {
                  setMenuVisible(false);
                  setShowResetDialog(true);
                }}
              />
            </Menu>
          </View>
        </View>
        
        {/* Render reset dialog */}
        {renderResetDialog()}

        <JsonItemTable
          items={items}
          onItemPress={handleItemPress}
          isLoading={loading}
          onRetry={loadItems}
        />
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
    paddingBottom: 8,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  scanButton: {
    alignSelf: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalScrollView: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  registerCard: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    width: 80,
  },
  detailValue: {
    flex: 1,
  },
  noRegistersText: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
    color: '#666',
  },
  closeButton: {
    marginTop: 16,
    marginBottom: 24,
  },
});

export default SecondTabScreen;
