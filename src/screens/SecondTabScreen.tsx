import React, {useState, useEffect, useCallback} from 'react';
import {StyleSheet, View, ToastAndroid, Platform} from 'react-native';
import {Text, Surface, Button, Card, Searchbar} from 'react-native-paper';
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

        // Load items
        loadItems();
      } catch (err) {
        console.error('Error initializing:', err);
        setError(`Failed to initialize: ${err.message || 'Unknown error'}`);
      }
    };

    initialize();
  }, []);

  // Load items from JSON files
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Scan for JSON items
      const jsonItems = await JsonFileService.scanJsonItems({
        companyFilter: searchQuery,
      });

      setItems(jsonItems);

      // Show toast with count
      if (Platform.OS === 'android') {
        const mainRegisterCount =
          JsonFileService.countTotalMainRegisters(jsonItems);
        ToastAndroid.show(
          `Found ${jsonItems.length} items with ${mainRegisterCount} registers`,
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

  // If showing details screen, render that instead of the list
  if (showDetails && selectedItem) {
    return (
      <RegisterDetailsScreen
        item={selectedItem}
        onBack={handleBackFromDetails}
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

          <Button
            mode="contained"
            onPress={loadItems}
            disabled={loading}
            icon="refresh"
            style={styles.scanButton}>
            Scan Files
          </Button>
        </View>

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
