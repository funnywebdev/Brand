import React, {useCallback, useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import {
  Text,
  Card,
  Divider,
  Surface,
  Appbar,
  useTheme,
  Button,
  Portal,
  Modal,
  Searchbar,
  TextInput,
  IconButton,
  Badge,
  Banner,
  Menu,
  Dialog,
  Chip,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {JsonItem, MainRegisterItem} from '../services/JsonFileService';
import {formatImagePath} from '../utils/ImageUtils';
import ImagePlaceholder from '../components/ImagePlaceholder';
import BrandSearchScreen from './BrandSearchScreen';
import JsonFileService from '../services/JsonFileService';
import { Platform, ToastAndroid } from 'react-native';

interface RegisterDetailsScreenProps {
  item: JsonItem;
  onBack: () => void;
  onItemUpdated?: (updatedItem: JsonItem) => void;
}

// Function to get flag color based on flag value
const getFlagColor = (flag?: number): string => {
  if (flag === undefined) return '#999999'; // Default gray
  
  switch (flag) {
    case 0:
      return '#607D8B'; // Blue Gray
    case 1:
      return '#4CAF50'; // Green
    case 2:
      return '#2196F3'; // Blue
    case 3:
      return '#FF9800'; // Orange
    case 4:
      return '#F44336'; // Red
    case 5:
      return '#9C27B0'; // Purple
    default:
      return '#999999'; // Gray for unknown values
  }
};

// Component to display a single register item in the list
const RegisterListItem: React.FC<{
  register: MainRegisterItem;
  onPress: (register: MainRegisterItem) => void;
  onBrandPress: (brand: string) => void;
  onAmountChange: (register: MainRegisterItem, amount: number | undefined) => void;
  index: number;
}> = ({register, onPress, onBrandPress, onAmountChange, index}) => {
  const flagColor = getFlagColor(register.flag);
  const [amount, setAmount] = useState<string>(
    register.currentAmount !== undefined ? register.currentAmount.toString() : ''
  );
  
  // Handle text input changes
  const handleAmountChange = (text: string) => {
    setAmount(text);
    // Only update if valid number or empty
    if (text === '') {
      onAmountChange(register, undefined);
    } else {
      const numericValue = parseFloat(text);
      if (!isNaN(numericValue)) {
        onAmountChange(register, numericValue);
      }
    }
  };
  
  return (
    <View style={styles.registerItem}>
      <TouchableOpacity
        style={styles.registerContent}
        onPress={() => onPress(register)}>
        <View style={styles.registerTextContent}>
          <Text style={styles.registerName}>{register.name}</Text>
          <View style={styles.brandContainer}>
            <Text style={styles.registerBrand}>Brand: </Text>
            <TouchableOpacity 
              onPress={() => onBrandPress(register.brand)}
              activeOpacity={0.6}
            >
              <Text style={[styles.brandText, styles.brandLink]}>
                {register.brand}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.registerSpace}>
            Space: {register.totalSpace?.toLocaleString()} units
          </Text>
          {register.flag !== undefined && (
            <Text>
              Flag: <Text style={[styles.flagText, { color: flagColor }]}>{register.flag}</Text>
            </Text>
          )}
        </View>

        <View style={styles.registerRightSection}>
          {/* Input for current amount */}
          <View style={styles.amountContainer}>
            <TextInput
              label="Current"
              value={amount}
              onChangeText={handleAmountChange}
              mode="outlined"
              keyboardType="numeric"
              style={styles.amountInput}
              dense
              right={
                <TextInput.Affix text="units" />
              }
            />
          </View>
          
          <View style={styles.registerImageContainer}>
            {register.image ? (
              <Image
                source={{
                  uri: formatImagePath(`brand/invoices/${register.image}`) || '',
                }}
                style={styles.registerThumbnail}
                resizeMode="cover"
              />
            ) : (
              <ImagePlaceholder size={50} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      <Divider />
    </View>
  );
};

const RegisterDetailsScreen: React.FC<RegisterDetailsScreenProps> = ({
  item,
  onBack,
  onItemUpdated,
}) => {
  const theme = useTheme();
  const [selectedRegister, setSelectedRegister] = useState<MainRegisterItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [showBrandSearch, setShowBrandSearch] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [registerSearchQuery, setRegisterSearchQuery] = useState('');
  const [filteredRegisters, setFilteredRegisters] = useState<MainRegisterItem[]>(item.mainRegisters || []);
  
  // Edit state
  const [currentItem, setCurrentItem] = useState<JsonItem>(item);
  const [isChanged, setIsChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean | null>(null);

  // Handle register item press
  const handleRegisterPress = useCallback((register: MainRegisterItem) => {
    setSelectedRegister(register);
    setDetailModalVisible(true);
  }, []);

  // Close detail modal
  const handleCloseModal = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedRegister(null);
  }, []);
  
  // Handle brand press to navigate to brand search
  const handleBrandPress = useCallback((brand: string) => {
    setSelectedBrand(brand);
    setShowBrandSearch(true);
    // Close detail modal if it's open
    if (detailModalVisible) {
      setDetailModalVisible(false);
    }
  }, [detailModalVisible]);
  
  // Handle back from brand search
  const handleBackFromBrandSearch = useCallback(() => {
    setShowBrandSearch(false);
    setSelectedBrand('');
  }, []);
  
  // Handle amount change for a register
  const handleAmountChange = useCallback((register: MainRegisterItem, amount: number | undefined) => {
    // Update the register in the currentItem
    const updatedRegisters = currentItem.mainRegisters.map(r => {
      if (r.name === register.name && r.brand === register.brand) {
        return { ...r, currentAmount: amount };
      }
      return r;
    });
    
    // Update the current item
    const newItem = {
      ...currentItem,
      mainRegisters: updatedRegisters
    };
    setCurrentItem(newItem);
    setIsChanged(true);
  }, [currentItem]);
  
  // Save changes
  const handleSave = useCallback(async () => {
    if (!isChanged) return;
    
    try {
      setIsSaving(true);
      setSaveSuccess(null);
      
      // Save the edited item
      const updatedItem = await JsonFileService.saveEditedItem(currentItem);
      
      // Update our state
      setCurrentItem(updatedItem);
      setIsChanged(false);
      setSaveSuccess(true);
      
      // Notify the parent component
      if (onItemUpdated) {
        onItemUpdated(updatedItem);
      }
      
      // Show toast if on Android
      if (Platform.OS === 'android') {
        ToastAndroid.show('Changes saved successfully', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      setSaveSuccess(false);
      
      // Show toast if on Android
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to save changes', ToastAndroid.LONG);
      }
    } finally {
      setIsSaving(false);
    }
  }, [currentItem, isChanged, onItemUpdated]);
  
  // Export to JSON
  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      setExportSuccess(null);
      
      // Make sure changes are saved first
      if (isChanged) {
        await handleSave();
      }
      
      // Export the item
      const updatedItem = await JsonFileService.exportEditedItem(currentItem);
      
      // Update our state
      setCurrentItem(updatedItem);
      setExportSuccess(true);
      
      // Notify the parent component
      if (onItemUpdated) {
        onItemUpdated(updatedItem);
      }
      
      // Show toast with export path if on Android
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `Exported to ${updatedItem.editStatus?.exportPath || 'export directory'}`,
          ToastAndroid.LONG
        );
      }
    } catch (error) {
      console.error('Error exporting item:', error);
      setExportSuccess(false);
      
      // Show toast if on Android
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to export item', ToastAndroid.LONG);
      }
    } finally {
      setIsExporting(false);
    }
  }, [currentItem, handleSave, isChanged, onItemUpdated]);
  
  // Discard changes
  const handleDiscard = useCallback(async () => {
    try {
      // Delete the saved item
      await JsonFileService.deleteSavedItem(item.id);
      
      // Reset to original item
      setCurrentItem({...item});
      setIsChanged(false);
      
      // Reset filtered registers
      setFilteredRegisters(item.mainRegisters || []);
      
      // Reset save/export status
      setSaveSuccess(null);
      setExportSuccess(null);
      
      // Close the dialog
      setShowDiscardDialog(false);
      
      // Show toast if on Android
      if (Platform.OS === 'android') {
        ToastAndroid.show('Changes discarded', ToastAndroid.SHORT);
      }
      
      // Notify parent
      if (onItemUpdated) {
        onItemUpdated(item);
      }
    } catch (error) {
      console.error('Error discarding changes:', error);
      
      // Show toast if on Android
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to discard changes', ToastAndroid.LONG);
      }
    }
  }, [item, onItemUpdated]);
  
  // Handle register item search
  const handleRegisterSearch = useCallback(
    (query: string) => {
      setRegisterSearchQuery(query);
      
      if (!query.trim()) {
        // If search is empty, show all registers
        setFilteredRegisters(item.mainRegisters || []);
        return;
      }
      
      // Filter registers by name or brand
      const normalizedQuery = query.toLowerCase().trim();
      const filtered = (item.mainRegisters || []).filter(
        register => 
          register.name.toLowerCase().includes(normalizedQuery) || 
          register.brand.toLowerCase().includes(normalizedQuery)
      );
      
      setFilteredRegisters(filtered);
    },
    [item.mainRegisters]
  );
  
  // Initialize filtered registers when item changes
  useEffect(() => {
    // Initialize filtered registers from current item
    setFilteredRegisters(currentItem.mainRegisters || []);
    setRegisterSearchQuery('');
  }, [currentItem.mainRegisters]);
  
  // Initialize data when the component mounts
  useEffect(() => {
    setCurrentItem(item);
    setFilteredRegisters(item.mainRegisters || []);
  }, [item]);

  // Render a register item in the list
  const renderRegisterItem = useCallback(
    ({item: register, index}: ListRenderItemInfo<MainRegisterItem>) => (
      <RegisterListItem 
        register={register} 
        onPress={handleRegisterPress}
        onBrandPress={handleBrandPress}
        onAmountChange={handleAmountChange}
        index={index}
      />
    ),
    [handleRegisterPress, handleBrandPress, handleAmountChange],
  );
  
  // Render the actions menu
  const renderActionsMenu = useCallback(() => {
    const hasEditStatus = currentItem.editStatus !== undefined;
    
    return (
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
          icon="content-save"
          title="Save Changes"
          disabled={!isChanged || isSaving}
          onPress={() => {
            setMenuVisible(false);
            handleSave();
          }}
        />
        <Menu.Item
          icon="export"
          title="Export to JSON"
          disabled={isExporting}
          onPress={() => {
            setMenuVisible(false);
            handleExport();
          }}
        />
        {hasEditStatus && (
          <Menu.Item
            icon="delete"
            title="Discard Changes"
            onPress={() => {
              setMenuVisible(false);
              setShowDiscardDialog(true);
            }}
          />
        )}
      </Menu>
    );
  }, [menuVisible, isChanged, isSaving, isExporting, handleSave, handleExport, currentItem.editStatus]);

  // Extract key for list item
  const keyExtractor = useCallback(
    (register: MainRegisterItem, index: number) =>
      `register-${register.name}-${register.brand}-${index}`,
    [],
  );

  // Render register detail modal
  const renderRegisterDetailModal = () => {
    if (!selectedRegister) return null;

    return (
      <Portal>
        <Modal
          visible={detailModalVisible}
          onDismiss={handleCloseModal}
          contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedRegister.name}</Text>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Image */}
            <View style={styles.modalImageContainer}>
              {selectedRegister.image ? (
                <Image
                  source={{
                    uri:
                      formatImagePath(
                        `brand/invoices/${selectedRegister.image}`,
                      ) || '',
                  }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : (
                <ImagePlaceholder size={200} />
              )}
            </View>

            {/* Details */}
            <Card style={styles.modalDetailsCard}>
              <Card.Content>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Brand:</Text>
                  <TouchableOpacity onPress={() => handleBrandPress(selectedRegister.brand)}>
                    <Text style={[styles.detailValue, styles.brandLink]}>
                      {selectedRegister.brand || 'N/A'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Space:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRegister.totalSpace?.toLocaleString() || 'N/A'}{' '}
                    units
                  </Text>
                </View>

                {selectedRegister.flag !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Flag:</Text>
                    <Text style={[styles.detailValue, { color: getFlagColor(selectedRegister.flag) }]}>
                      {selectedRegister.flag}
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              mode="contained"
              onPress={handleCloseModal}
              style={styles.closeButton}>
              Close
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Render discard confirmation dialog
  const renderDiscardDialog = useCallback(() => {
    return (
      <Dialog
        visible={showDiscardDialog}
        onDismiss={() => setShowDiscardDialog(false)}
      >
        <Dialog.Title>Discard Changes?</Dialog.Title>
        <Dialog.Content>
          <Text>
            Are you sure you want to discard all changes to this item? This action cannot be undone.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowDiscardDialog(false)}>Cancel</Button>
          <Button onPress={handleDiscard} mode="contained">Discard</Button>
        </Dialog.Actions>
      </Dialog>
    );
  }, [showDiscardDialog, handleDiscard]);

  // If showing brand search, render the brand search screen
  if (showBrandSearch) {
    return (
      <BrandSearchScreen
        initialBrand={selectedBrand}
        onBack={handleBackFromBrandSearch}
      />
    );
  }

  // Otherwise render the register details screen
  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title="Register Details" />
        {renderActionsMenu()}
      </Appbar.Header>

      <Surface style={styles.content}>
        {/* Status Banner for save/export status */}
        {(saveSuccess !== null || exportSuccess !== null) && (
          <Banner
            visible={saveSuccess !== null || exportSuccess !== null}
            actions={[
              {
                label: 'OK',
                onPress: () => {
                  setSaveSuccess(null);
                  setExportSuccess(null);
                },
              },
            ]}
            icon={saveSuccess === false || exportSuccess === false ? 'alert-circle' : 'check-circle'}
            style={[
              styles.statusBanner,
              saveSuccess === false || exportSuccess === false
                ? styles.errorBanner
                : styles.successBanner
            ]}
          >
            {saveSuccess === true && 'Changes saved successfully.'}
            {saveSuccess === false && 'Failed to save changes.'}
            {exportSuccess === true && 'Item exported successfully to JSON file.'}
            {exportSuccess === false && 'Failed to export item to JSON file.'}
          </Banner>
        )}
        
        {/* Edit Status Chips */}
        {currentItem.editStatus && (
          <View style={styles.editStatusContainer}>
            {currentItem.editStatus.saved && (
              <Chip 
                icon="content-save" 
                mode="outlined" 
                style={styles.savedChip}
              >
                Saved {currentItem.editStatus.lastSaved 
                  ? new Date(currentItem.editStatus.lastSaved).toLocaleString() 
                  : ''}
              </Chip>
            )}
            
            {currentItem.editStatus.exported && (
              <Chip 
                icon="export" 
                mode="outlined" 
                style={styles.exportedChip}
              >
                Exported {currentItem.editStatus.lastExported 
                  ? new Date(currentItem.editStatus.lastExported).toLocaleString() 
                  : ''}
              </Chip>
            )}
          </View>
        )}
        {/* Item Header Information */}
        <Card style={styles.itemCard}>
          <Card.Content>
            <Text style={styles.itemId}>ID: {item.id}</Text>
            <Text style={styles.itemCompany}>
              {item.objCompany || 'Unknown Company'}
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice:</Text>
              <Text style={styles.detailValue}>
                {item.fullInvoiceName || 'N/A'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {item.updatedDt || item.censoredDt || 'N/A'}
              </Text>
            </View>

            <Text style={styles.registerCountText}>
              {item.mainRegisters?.length || 0} Register Items
            </Text>
          </Card.Content>
        </Card>

        {/* Register List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Register Items</Text>
          <Text style={styles.itemCount}>
            {filteredRegisters.length} of {currentItem.mainRegisters?.length || 0} items
          </Text>
        </View>

        {/* Register Search */}
        <Searchbar
          placeholder="Search by name or brand"
          onChangeText={handleRegisterSearch}
          value={registerSearchQuery}
          style={styles.registerSearchBar}
        />

        {currentItem.mainRegisters && currentItem.mainRegisters.length > 0 ? (
          <>
            {filteredRegisters.length > 0 ? (
              <FlatList
                data={filteredRegisters}
                renderItem={renderRegisterItem}
                keyExtractor={keyExtractor}
                style={styles.registerList}
                contentContainerStyle={styles.registerListContent}
              />
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>
                    No matches found for "{registerSearchQuery}"
                  </Text>
                  <Button 
                    mode="text" 
                    onPress={() => handleRegisterSearch('')}
                    style={styles.clearSearchButton}
                  >
                    Clear Search
                  </Button>
                </Card.Content>
              </Card>
            )}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No register items found</Text>
            </Card.Content>
          </Card>
        )}
      </Surface>

      {renderRegisterDetailModal()}
      {renderDiscardDialog()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  itemCard: {
    marginBottom: 16,
  },
  itemId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemCompany: {
    fontSize: 18,
    marginBottom: 12,
    color: '#0066cc',
  },
  detailRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  detailLabel: {
    fontWeight: 'bold',
    width: 80,
  },
  detailValue: {
    flex: 1,
  },
  registerCountText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  registerSearchBar: {
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
    elevation: 1,
  },
  clearSearchButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  registerList: {
    flex: 1,
  },
  registerListContent: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  registerItem: {
    backgroundColor: 'white',
  },
  registerContent: {
    flexDirection: 'row',
    padding: 12,
  },
  registerTextContent: {
    flex: 1,
    marginRight: 12,
  },
  registerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  brandContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  registerBrand: {
    fontSize: 14,
  },
  brandText: {
    fontWeight: '500',
    color: '#0066cc',
  },
  brandLink: {
    textDecorationLine: 'underline',
  },
  registerSpace: {
    fontSize: 14,
    color: '#666',
  },
  flagText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  registerRightSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerImageContainer: {
    width: 50,
    justifyContent: 'center',
    marginTop: 8,
  },
  registerThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  amountContainer: {
    width: 100,
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: '#f5f5f5',
    fontSize: 14,
  },
  editStatusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  savedChip: {
    backgroundColor: '#e8f5e9',
  },
  exportedChip: {
    backgroundColor: '#e3f2fd',
  },
  statusBanner: {
    marginBottom: 8,
  },
  successBanner: {
    backgroundColor: '#e8f5e9',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
  },
  emptyCard: {
    marginTop: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    color: '#999',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
    paddingBottom: 16,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  modalDetailsCard: {
    marginBottom: 16,
  },
  modalFooter: {
    paddingHorizontal: 16,
  },
  closeButton: {
    marginTop: 8,
  },
});

export default RegisterDetailsScreen;
