import React, {useCallback, useState} from 'react';
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
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {JsonItem, MainRegisterItem} from '../services/JsonFileService';
import {formatImagePath} from '../utils/ImageUtils';
import ImagePlaceholder from '../components/ImagePlaceholder';

interface RegisterDetailsScreenProps {
  item: JsonItem;
  onBack: () => void;
}

// Component to display a single register item in the list
const RegisterListItem: React.FC<{
  register: MainRegisterItem;
  onPress: (register: MainRegisterItem) => void;
}> = ({register, onPress}) => {
  console.log(register);
  return (
    <TouchableOpacity
      style={styles.registerItem}
      onPress={() => onPress(register)}>
      <View style={styles.registerContent}>
        <View style={styles.registerTextContent}>
          <Text style={styles.registerName}>{register.name}</Text>
          <Text style={styles.registerBrand}>
            Brand: <Text style={styles.brandText}>{register.brand}</Text>
          </Text>
          <Text style={styles.registerSpace}>
            Space: {register.totalSpace?.toLocaleString()} units
          </Text>
          <Text style={styles.flagText}>Flag: {register.flag}</Text>
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
      <Divider />
    </TouchableOpacity>
  );
};

const RegisterDetailsScreen: React.FC<RegisterDetailsScreenProps> = ({
  item,
  onBack,
}) => {
  const theme = useTheme();
  const [selectedRegister, setSelectedRegister] =
    useState<MainRegisterItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

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

  // Render a register item in the list
  const renderRegisterItem = useCallback(
    ({item: register}: ListRenderItemInfo<MainRegisterItem>) => (
      <RegisterListItem register={register} onPress={handleRegisterPress} />
    ),
    [handleRegisterPress],
  );

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
                  <Text style={styles.detailValue}>
                    {selectedRegister.brand || 'N/A'}
                  </Text>
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
                    <Text style={styles.detailValue}>
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

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title="Register Details" />
      </Appbar.Header>

      <Surface style={styles.content}>
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
        <Text style={styles.sectionTitle}>Register Items</Text>

        {item.mainRegisters && item.mainRegisters.length > 0 ? (
          <FlatList
            data={item.mainRegisters}
            renderItem={renderRegisterItem}
            keyExtractor={keyExtractor}
            style={styles.registerList}
            contentContainerStyle={styles.registerListContent}
          />
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No register items found</Text>
            </Card.Content>
          </Card>
        )}
      </Surface>

      {renderRegisterDetailModal()}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
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
  registerBrand: {
    fontSize: 14,
    marginBottom: 4,
  },
  brandText: {
    fontWeight: '500',
    color: '#0066cc',
  },
  registerSpace: {
    fontSize: 14,
    color: '#666',
  },
  flagText: {
    fontSize: 14,
    color: '#d32f2f',
    marginTop: 4,
  },
  registerImageContainer: {
    width: 50,
    justifyContent: 'center',
  },
  registerThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
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
