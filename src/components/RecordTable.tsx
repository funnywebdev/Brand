import React, { useCallback, useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Image, 
  FlatList, 
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  ListRenderItemInfo 
} from 'react-native';
import { 
  Text, 
  useTheme, 
  Card, 
  Divider,
  Button,
  IconButton
} from 'react-native-paper';
import { Record } from '../services/DatabaseService';
import { formatImagePath } from '../utils/ImageUtils';
import ImagePlaceholder from './ImagePlaceholder';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Component that displays an image with fixed height and calculated width based on original aspect ratio
const AspectRatioImage: React.FC<{uri: string, height: number}> = ({ uri, height }) => {
  const [aspectRatio, setAspectRatio] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    setIsLoading(true);
    setError(false);
    
    // Get the original dimensions to calculate aspect ratio
    Image.getSize(
      uri, 
      (width, height) => {
        const ratio = width / height;
        setAspectRatio(ratio);
        setIsLoading(false);
      },
      (error) => {
        console.error("Failed to get image size:", error);
        setIsLoading(false);
        setError(true);
      }
    );
  }, [uri]);
  
  if (isLoading) {
    return <ImagePlaceholder size={height} />;
  }
  
  if (error) {
    return <ImagePlaceholder size={height} />;
  }
  
  // Calculate width based on fixed height and original aspect ratio
  const calculatedWidth = height * aspectRatio;
  
  return (
    <Image 
      source={{ uri }}
      style={{ 
        width: calculatedWidth, 
        height: height,
        borderRadius: 4
      }}
      resizeMode="cover"
    />
  );
};

interface RecordDetailModalProps {
  visible: boolean;
  record: Record | null;
  onClose: () => void;
}

// Component to display the original sized image
const OriginalSizeImage: React.FC<{uri: string | null}> = ({ uri }) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    if (!uri) {
      setIsLoading(false);
      setError(true);
      return;
    }
    
    setIsLoading(true);
    setError(false);
    
    // Get the original dimensions of the image
    Image.getSize(
      uri, 
      (width, height) => {
        console.log(`Original image dimensions: ${width}x${height}`);
        
        // Calculate container width (90% of screen width to leave margins)
        const maxContainerWidth = SCREEN_WIDTH * 0.85;
        
        let finalWidth, finalHeight;
        
        // If image is wider than container, scale it down proportionally
        if (width > maxContainerWidth) {
          const ratio = maxContainerWidth / width;
          finalWidth = maxContainerWidth;
          finalHeight = height * ratio;
        } else {
          // Otherwise use original dimensions
          finalWidth = width;
          finalHeight = height;
        }
        
        setImageSize({ width: finalWidth, height: finalHeight });
        setIsLoading(false);
      },
      (error) => {
        console.error("Failed to get image size:", error);
        setIsLoading(false);
        setError(true);
      }
    );
  }, [uri]);
  
  if (!uri) {
    return <ImagePlaceholder size={200} fallbackText="No Image" />;
  }
  
  if (isLoading) {
    return (
      <View style={styles.originalImageLoadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading image...</Text>
      </View>
    );
  }
  
  if (error) {
    return <ImagePlaceholder size={200} fallbackText="Image Error" />;
  }
  
  return (
    <Image 
      source={{ uri }}
      style={{ 
        width: imageSize.width, 
        height: imageSize.height,
        borderRadius: 8
      }}
      resizeMode="contain"
    />
  );
};

// Modal component to display record details
const RecordDetailModal: React.FC<RecordDetailModalProps> = ({ visible, record, onClose }) => {
  const imagePath = record?.image ? formatImagePath(record.image) : null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{record?.name || 'Record Details'}</Text>
            <IconButton icon="close" size={24} onPress={onClose} />
          </View>
          
          <ScrollView style={styles.modalBody}>
            {/* Image at original size */}
            <View style={styles.imageContainer}>
              <OriginalSizeImage uri={imagePath} />
            </View>
            
            {/* Record details */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{record?.name || 'N/A'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Origin:</Text>
                <Text style={styles.detailValue}>{record?.origin || 'N/A'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Registration Number:</Text>
                <Text style={styles.detailValue}>{record?.regNum || 'N/A'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Registration Date:</Text>
                <Text style={styles.detailValue}>{record?.regDate || 'N/A'}</Text>
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button mode="contained" onPress={onClose}>
              Close
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface RecordTableProps {
  records: Record[];
  onSearch: (query: string) => void;
  searchQuery: string;
  onLoadMore: () => void;
  hasMoreData: boolean;
  isLoadingMore: boolean;
}

const RecordTable: React.FC<RecordTableProps> = ({ 
  records, 
  onSearch, 
  searchQuery,
  onLoadMore,
  hasMoreData,
  isLoadingMore
}) => {
  const theme = useTheme();
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const handleRowPress = useCallback((record: Record) => {
    setSelectedRecord(record);
    setModalVisible(true);
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
  }, []);
  
  // Render item for FlatList
  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<Record>) => (
    <TouchableOpacity onPress={() => handleRowPress(item)}>
      <View>
        <View style={styles.tableRow}>
          <Text style={styles.nameColumn} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <View style={styles.imageColumn}>
            {item.image ? (
              <AspectRatioImage 
                uri={formatImagePath(item.image) || ''} 
                height={40}
              />
            ) : (
              <ImagePlaceholder />
            )}
          </View>
          <Text style={styles.originColumn} numberOfLines={1} ellipsizeMode="tail">
            {item.origin}
          </Text>
          <Text style={styles.regNumColumn} numberOfLines={1} ellipsizeMode="tail">
            {item.regNum}
          </Text>
          <Text style={styles.regDateColumn} numberOfLines={1} ellipsizeMode="tail">
            {item.regDate}
          </Text>
        </View>
        <Divider />
      </View>
    </TouchableOpacity>
  ), [handleRowPress]);
  
  // Render footer with loading indicator or load more button
  const renderFooter = useCallback(() => {
    if (!hasMoreData) {
      return records.length > 0 ? (
        <Text style={styles.endOfListText}>
          End of list
        </Text>
      ) : null;
    }
    
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      );
    }
    
    return (
      <Button 
        mode="contained" 
        style={styles.loadMoreButton}
        onPress={onLoadMore}
      >
        Load More
      </Button>
    );
  }, [hasMoreData, isLoadingMore, onLoadMore, records.length, theme.colors.primary]);
  
  // Extract a unique key for each item
  const keyExtractor = useCallback((item: Record, index: number) => 
    item.id ? item.id.toString() : `record-${index}`, []);
  
  // Handle when the end of the list is reached
  const handleEndReached = useCallback(() => {
    if (hasMoreData && !isLoadingMore) {
      onLoadMore();
    }
  }, [hasMoreData, isLoadingMore, onLoadMore]);
  
  // Render list header with column titles
  const renderListHeader = useCallback(() => {
    if (records.length === 0) return null;
    
    return (
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.nameColumn]}>Name</Text>
        <Text style={[styles.headerText, styles.imageColumn]}>Image</Text>
        <Text style={[styles.headerText, styles.originColumn]}>Origin</Text>
        <Text style={[styles.headerText, styles.regNumColumn]}>Reg Number</Text>
        <Text style={[styles.headerText, styles.regDateColumn]}>Reg Date</Text>
      </View>
    );
  }, [records.length]);
  console.log("records", records)
  return (
    <View style={styles.container}>
      {records.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No records found</Text>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          style={styles.flatList}
          contentContainerStyle={styles.tableContainer}
        />
      )}
      
      {/* Record Detail Modal */}
      <RecordDetailModal 
        visible={modalVisible}
        record={selectedRecord}
        onClose={handleCloseModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
  flatList: {
    flex: 1,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  nameColumn: {
    flex: 2,
    padding: 4,
  },
  imageColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  originColumn: {
    flex: 2,
    padding: 4,
  },
  regNumColumn: {
    flex: 1.5,
    padding: 4,
  },
  regDateColumn: {
    flex: 1.5,
    padding: 4,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginVertical: 16,
  },
  endOfListText: {
    textAlign: 'center',
    padding: 16,
    color: '#757575',
    fontStyle: 'italic',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
    maxHeight: '70%',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  originalImageLoadingContainer: {
    width: SCREEN_WIDTH * 0.85,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
  },
  detailsContainer: {
    marginTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  detailLabel: {
    flex: 1,
    fontWeight: 'bold',
    color: '#555',
  },
  detailValue: {
    flex: 2,
    color: '#333',
  }
});

export default RecordTable;