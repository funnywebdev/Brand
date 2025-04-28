import React, {useEffect, useState, useCallback} from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  FlatList,
} from 'react-native';
import {
  Text,
  useTheme,
  Appbar,
  Surface,
  Button,
  Banner,
  Divider,
  Chip,
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
import {requestPermissions} from '../utils/PermissionsManager';

// Default pagination parameters
const DEFAULT_PAGE_SIZE = 25;

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const [records, setRecords] = useState<Record[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  // Search state
  const [isSearching, setIsSearching] = useState(false);

  // Load initial data with pagination
  const loadData = useCallback(
    async (resetPagination = true) => {
      console.log('Starting to load data...');
      try {
        setError(null);
        setLoading(true);

        const pageSize = pagination.pageSize;
        console.log(`Loading initial data with page size: ${pageSize}`);

        // Initialize with first page of data
        const result = await DatabaseService.getInitialData(pageSize);
        console.log(
          `Data loaded. Records: ${result.records.length}, Total: ${result.totalCount}`,
        );

        if (result.records.length === 0) {
          // Show banner if no records found
          console.log('No records found, showing banner');
          setShowBanner(true);
        } else {
          console.log(`Setting ${result.records.length} records to state`);
          setShowBanner(false);
        }

        // Update the records state
        setRecords(result.records);

        // Update pagination information
        setPagination({
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalCount: result.totalCount,
          pageSize: pageSize,
        });

        // Show success toast with count information
        if (result.records.length > 0) {
          ToastAndroid.show(
            `Loaded ${result.records.length} of ${result.totalCount} records`,
            ToastAndroid.SHORT,
          );
        }
      } catch (err) {
        console.error('Error loading records:', err);
        setError(
          `Failed to load data from database: ${
            err.message || 'Unknown error'
          }`,
        );
        setShowBanner(true);
      } finally {
        console.log('Finished loading data, setting loading state to false');
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pagination.pageSize],
  );

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSearchQuery('');
    setIsSearching(false);
    await loadData(true);
  }, [loadData]);

  // Load next page of data
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

      let result: QueryResult;

      if (isSearching && searchQuery.trim()) {
        result = await DatabaseService.searchRecordsByName(
          searchQuery,
          paginationParams,
        );
      } else {
        result = await DatabaseService.getRecords(paginationParams);
      }

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
  }, [pagination, loadingMore, isSearching, searchQuery]);

  useEffect(() => {
    const init = async () => {
      // Request permissions for accessing storage (images)
      if (Platform.OS === 'android') {
        const permissionsGranted = await requestPermissions();
        if (!permissionsGranted) {
          setError(
            'Storage permission denied. Some images may not display correctly.',
          );
          ToastAndroid.show(
            'Permission denied for accessing images',
            ToastAndroid.LONG,
          );
        }
      }

      // Load initial data from database
      loadData();
    };

    init();

    // Clean up database connection when the component unmounts
    return () => {
      DatabaseService.closeDatabase();
    };
  }, [loadData]);

  // Handle search with pagination
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setError(null);

    if (query.trim() === '') {
      setIsSearching(false);
      loadData(true); // Reset to first page of all data
      return;
    }

    try {
      setLoading(true);
      setIsSearching(true);

      // Search with first page
      const searchParams: PaginationParams = {
        page: 1,
        pageSize: pagination.pageSize,
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
        pageSize: pagination.pageSize,
      });

      // Show info toast about search results
      ToastAndroid.show(
        `Found ${result.totalCount} ${
          result.totalCount === 1 ? 'result' : 'results'
        }`,
        ToastAndroid.SHORT,
      );
    } catch (err) {
      console.error('Error searching records:', err);
      setError('Failed to search data');
    } finally {
      setLoading(false);
    }
  };

  // Handle retry on error
  const handleRetry = () => {
    loadData();
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
        <Appbar.Content title="Brand censor" />
        <Appbar.Action icon="refresh" onPress={onRefresh} disabled={loading} />
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
        Database is empty or not properly configured. Make sure output.sqlite is
        in the correct location.
      </Banner>

      <Surface style={styles.content}>
        {/* Search Bar */}
        <Searchbar
          placeholder="Search by name"
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          loading={isSearching && loading}
        />

        {/* Pagination Info */}
        {renderPaginationInfo()}

        {loading && !refreshing && !loadingMore ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading data...</Text>
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

export default HomeScreen;
