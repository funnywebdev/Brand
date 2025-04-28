import React, { useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Image, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl, 
  ListRenderItemInfo 
} from 'react-native';
import { 
  Text, 
  useTheme, 
  Card, 
  Divider,
  Button 
} from 'react-native-paper';
import { Record } from '../services/DatabaseService';
import { formatImagePath } from '../utils/ImageUtils';
import ImagePlaceholder from './ImagePlaceholder';

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
  
  // Render item for FlatList
  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<Record>) => (
    <View>
      <View style={styles.tableRow}>
        <Text style={styles.nameColumn} numberOfLines={1} ellipsizeMode="tail">
          {item.name}
        </Text>
        <View style={styles.imageColumn}>
          {item.image ? (
            <Image 
              source={{ uri: formatImagePath(item.image) || '' }}
              style={styles.thumbnail}
              onError={() => console.warn(`Failed to load image: ${item.image}`)}
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
  ), []);
  
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
});

export default RecordTable;