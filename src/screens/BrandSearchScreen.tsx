import React, {useEffect, useState, useCallback} from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  ToastAndroid,
  Platform,
} from 'react-native';
import {
  Text,
  useTheme,
  Appbar,
  Surface,
  Button,
  Banner,
  Divider,
  Searchbar,
  ProgressBar,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import RecordTable from '../components/RecordTable';
import DatabaseService, {
  Record,
  PaginationParams,
  QueryResult,
} from '../services/DatabaseService';

// Default pagination parameters
const DEFAULT_PAGE_SIZE = 25;

interface BrandSearchScreenProps {
  initialBrand?: string;
  onBack: () => void;
}

const BrandSearchScreen: React.FC<BrandSearchScreenProps> = ({
  initialBrand = '',
  onBack,
}) => {
  const theme = useTheme();
  const [records, setRecords] = useState<Record[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialBrand);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState<{
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
  }>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  // Handle search with pagination - will be called when component mounts with initialBrand
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      setError(null);

      if (query.trim() === '') {
        // Show empty state for no query
        setRecords([]);
        setPagination({
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          pageSize: DEFAULT_PAGE_SIZE,
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Search with first page
        const searchParams: PaginationParams = {
          page: 1,
          pageSize: DEFAULT_PAGE_SIZE,
        };

        const result = await DatabaseService.searchRecordsByName(
          query,
          searchParams,
        );

        setRecords(result.records);

        // Update pagination for search results
        setPagination({
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalCount: result.totalCount,
          pageSize: DEFAULT_PAGE_SIZE,
        });

        // Show info toast about search results
        ToastAndroid.show(
          `Found ${result.totalCount} ${
            result.totalCount === 1 ? 'result' : 'results'
          } for "${query}"`,
          ToastAndroid.SHORT,
        );

        // Show banner if no results
        if (result.records.length === 0) {
          setShowBanner(true);
        } else {
          setShowBanner(false);
        }
      } catch (err) {
        console.error('Error searching records:', err);
        setError('Failed to search brand data');
        setShowBanner(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Load next page of data for pagination
  const loadMoreData = useCallback(async () => {
    // Don't load more if we're already at the last page
    if (pagination.currentPage >= pagination.totalPages || loadingMore) {
      return;
    }

    try {
      setLoadingMore(true);

      const nextPage = pagination.currentPage + 1;
      const paginationParams: PaginationParams = {
        page: nextPage,
        pageSize: pagination.pageSize,
      };

      // Always search since this screen is for brand search
      const result = await DatabaseService.searchRecordsByName(
        searchQuery,
        paginationParams,
      );

      // Append new records to existing ones
      setRecords(prevRecords => [...prevRecords, ...result.records]);

      // Update pagination information
      setPagination(prev => ({
        ...prev,
        currentPage: nextPage,
      }));

      // Show toast indicating more items loaded
      ToastAndroid.show(
        `Loaded ${result.records.length} more records`,
        ToastAndroid.SHORT,
      );
    } catch (err) {
      console.error('Error loading more records:', err);
      ToastAndroid.show('Failed to load more data', ToastAndroid.SHORT);
    } finally {
      setLoadingMore(false);
    }
  }, [pagination, loadingMore, searchQuery]);

  // Initial search when component mounts or initialBrand changes
  useEffect(() => {
    if (initialBrand) {
      handleSearch(initialBrand);
    }
  }, [initialBrand, handleSearch]);

  // Handle retry on error
  const handleRetry = () => {
    if (searchQuery) {
      handleSearch(searchQuery);
    }
  };

  // Render pagination info
  const renderPaginationInfo = () => {
    if (loading || pagination.totalCount === 0) return null;

    const startRange = (pagination.currentPage - 1) * pagination.pageSize + 1;
    const endRange = Math.min(
      pagination.currentPage * pagination.pageSize,
      pagination.totalCount,
    );

    return (
      <View style={styles.paginationInfo}>
        <Text style={styles.paginationText}>
          Showing {startRange}-{endRange} of {pagination.totalCount}
        </Text>
        {loadingMore && (
          <ProgressBar indeterminate style={styles.loadMoreProgress} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title={`Brand Search: ${initialBrand}`} />
      </Appbar.Header>

      <Banner
        visible={showBanner}
        actions={[
          {
            label: 'OK',
            onPress: () => setShowBanner(false),
          },
        ]}
        icon="information">
        {records.length === 0
          ? `No records found for "${searchQuery}"`
          : 'Error searching for brand records'}
      </Banner>

      <Surface style={styles.content}>
        {/* Search Bar - Pre-filled with initialBrand */}
        <Searchbar
          placeholder="Search by brand"
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          loading={loading && !loadingMore}
        />

        {/* Pagination Info */}
        {renderPaginationInfo()}

        {loading && !loadingMore ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Searching for "{searchQuery}"...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              mode="contained"
              onPress={handleRetry}
              style={styles.retryButton}>
              Retry
            </Button>
          </View>
        ) : (
          <RecordTable
            records={records}
            onSearch={handleSearch}
            searchQuery={searchQuery}
            onLoadMore={loadMoreData}
            hasMoreData={pagination.currentPage < pagination.totalPages}
            isLoadingMore={loadingMore}
          />
        )}
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
    paddingHorizontal: 8,
    paddingBottom: 8,
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
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 10,
  },
  searchBar: {
    marginHorizontal: 8,
    marginVertical: 12,
    elevation: 2,
  },
  paginationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
  },
  loadMoreProgress: {
    height: 3,
    width: 100,
    marginLeft: 10,
  },
});

export default BrandSearchScreen;