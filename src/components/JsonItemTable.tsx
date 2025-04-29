import React, { useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ListRenderItemInfo,
  Image
} from 'react-native';
import { 
  Text, 
  useTheme, 
  Card, 
  Divider,
  Button,
  Badge
} from 'react-native-paper';
import { JsonItem } from '../services/JsonFileService';
import { formatImagePath } from '../utils/ImageUtils';

interface JsonItemTableProps {
  items: JsonItem[];
  onItemPress?: (item: JsonItem) => void;
  isLoading: boolean;
  onRetry?: () => void;
}

const JsonItemTable: React.FC<JsonItemTableProps> = ({ 
  items, 
  onItemPress,
  isLoading,
  onRetry
}) => {
  const theme = useTheme();
  
  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<JsonItem>) => {
    // Just store the count for badge display
    const registerCount = item.mainRegisters ? item.mainRegisters.length : 0;
    
    return (
      <TouchableOpacity onPress={() => onItemPress && onItemPress(item)}>
        <View style={styles.itemCard}>
          <View style={styles.cardHeader}>
            <View style={styles.idContainer}>
              <Text style={styles.idText}>ID: {item.id}</Text>
            </View>
            <View style={styles.companyContainer}>
              <Text style={styles.companyText}>{item.objCompany || 'Unknown Company'}</Text>
            </View>
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>
                {item.updatedDt || item.censoredDt || 'No Date'}
              </Text>
            </View>
          </View>
          
          <Divider />
          
          <View style={styles.cardBody}>
            <View style={styles.invoiceContainer}>
              <Text style={styles.invoiceLabel}>Invoice:</Text>
              <Text style={styles.invoiceValue}>{item.fullInvoiceName || 'N/A'}</Text>
            </View>
            
            {/* Display register count badge */}
            {registerCount > 0 && (
              <View style={styles.registersCountContainer}>
                <Badge size={24} style={styles.itemCountBadge}>
                  {registerCount}
                </Badge>
                <Text style={styles.registerCountText}>
                  {registerCount === 1 ? 'register item' : 'register items'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Divider />
      </TouchableOpacity>
    );
  }, [onItemPress]);
  
  const keyExtractor = useCallback((item: JsonItem) => 
    `jsonitem-${item.id}`, []);
  
  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Scanning JSON files...</Text>
      </View>
    );
  }
  
  if (items.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Card.Content>
          <Text style={styles.emptyText}>No JSON items found</Text>
          {onRetry && (
            <Button 
              mode="contained" 
              onPress={onRetry} 
              style={styles.retryButton}
            >
              Retry
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  }
  
  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={styles.flatList}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  idContainer: {
    flex: 1,
  },
  idText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  companyContainer: {
    flex: 2,
    alignItems: 'center',
  },
  companyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  cardBody: {
    marginTop: 8,
  },
  invoiceContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  invoiceValue: {
    fontSize: 14,
  },
  registersContainer: {
    marginTop: 8,
  },
  firstRegisterRow: {
    flexDirection: 'row',
  },
  registersCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  registerCountText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  itemCountBadge: {
    backgroundColor: '#2196F3',
    marginRight: 8,
  },
  moreItemsText: {
    fontSize: 12,
    color: '#666',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyCard: {
    marginVertical: 20,
    marginHorizontal: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 10,
    alignSelf: 'center',
  },
});

export default JsonItemTable;