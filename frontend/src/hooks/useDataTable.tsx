import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';
import type { SortingState } from '@tanstack/react-table';

interface FetchDataResponse<T> {
  // Ensure this matches the type in types/index.ts
  data: T[];
  pagination: { totalPages: number };
}

interface UseDataTableOptions<T> {
  fetchData: (
    page: number,
    params: URLSearchParams
  ) => Promise<FetchDataResponse<T>>; // Use the defined interface
  limit?: number;
  paramKeyPrefix?: string; // Optional prefix for URL params (e.g., 'album_', 'track_')
}

export function useDataTable<T>({
  fetchData,
  limit = 10,
  paramKeyPrefix = '', // Default to no prefix
}: UseDataTableOptions<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper functions to safely access searchParams
  const safeGetParam = (key: string): string => {
    return searchParams?.get(key) || '';
  };

  const safeGetAllParams = (key: string): string[] => {
    return searchParams?.getAll(key) || [];
  };

  const safeParamsToString = (): string => {
    return searchParams?.toString() || '';
  };

  // Helper to get prefixed param key
  const getKey = (key: string) => `${paramKeyPrefix}${key}`;

  // Basic states
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  // Filter states - initialize from URL params using prefixed keys
  const [searchInput, setSearchInput] = useState(safeGetParam(getKey('q')));
  const [statusFilter, setStatusFilter] = useState<string[]>(
    safeGetAllParams(getKey('status'))
  );
  const [genreFilter, setGenreFilter] = useState<string[]>(
    safeGetAllParams(getKey('genres'))
  );
  const [sorting, setSorting] = useState<SortingState>(() => {
    const sortBy = safeGetParam(getKey('sortBy'));
    const sortOrder = safeGetParam(getKey('sortOrder'));
    if (sortBy) {
      return [{ id: sortBy, desc: sortOrder === 'desc' }];
    }
    return [];
  });

  // Get currentPage from URL, default to 1
  const currentPage = Math.max(1, Number(safeGetParam(getKey('page'))) || 1);

  // Ref to track initial load & previous state for change detection
  const initialLoad = useRef(true);
  const prevDeps = useRef({
    currentPage,
    searchInput,
    statusFilter,
    genreFilter,
    sorting,
  });

  // --- Fetching Logic --- //

  const fetchDataInternal = useCallback(
    async (
      pageToFetch: number,
      // paramsToFetch represents the state *intended* for the URL
      paramsToFetch: URLSearchParams,
      showLoading: boolean = true
    ) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        // **Create clean params for the API call**
        const paramsForApi = new URLSearchParams();

        // 1. Set standard pagination
        paramsForApi.set('page', String(Math.max(1, pageToFetch)));
        paramsForApi.set('limit', String(limit));

        // 2. Set standard search parameter from the prefixed URL key
        const currentSearchValue = paramsToFetch.get(getKey('q'));
        if (currentSearchValue) {
          paramsForApi.set('search', currentSearchValue);
        }

        // 3. Set standard filter parameters from current state
        if (statusFilter.length > 0)
          statusFilter.forEach((s) => paramsForApi.append('status', s));
        if (genreFilter.length > 0)
          genreFilter.forEach((g) => paramsForApi.append('genres', g));

        // 4. Set standard sorting parameters from current state
        if (sorting.length > 0) {
          paramsForApi.set('sortBy', sorting[0].id);
          paramsForApi.set('sortOrder', sorting[0].desc ? 'desc' : 'asc');
        }

        // console.log(`Fetching data with API params: ${paramsForApi.toString()}`);

        // Call the provided fetchData function with the clean API params
        const response = await fetchData(pageToFetch, paramsForApi);

        // Validate response structure
        if (
          response &&
          Array.isArray(response.data) &&
          response.pagination &&
          typeof response.pagination.totalPages === 'number'
        ) {
          setData(response.data);
          setTotalPages(response.pagination.totalPages);
        } else {
          console.error(
            'Invalid data structure received from fetchData:',
            response
          );
          toast.error('Received invalid data structure from server.');
          // Reset data to avoid inconsistent state
          setData([]);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Fetch data error:', error);
        toast.error((error as Error)?.message ?? 'Failed to fetch data');
        // Optionally reset state on error
        // setData([]);
        // setTotalPages(1);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    // Dependencies now include state variables used to build API params
    [fetchData, limit, getKey, statusFilter, genreFilter, sorting]
  );

  const debouncedFetch = useRef(
    debounce((page: number, params: URLSearchParams) => {
      // The params passed here are intended for the URL,
      // fetchDataInternal will extract the necessary info for the API call.
      fetchDataInternal(page, params);
    }, 300) // Adjust debounce timing if needed
  ).current;

  // --- URL Update Logic --- //

  const updateUrlParams = useCallback(
    (
      updates: Record<string, string | number | string[] | null>,
      replace: boolean = false // Use replace for non-user-initiated changes
    ) => {
      // **Start with a clean slate for the new URL parameters**
      const newParams = new URLSearchParams();
      let changed = false;

      // Get current URL parameters to selectively keep parameters from other tabs
      const currentParams = new URLSearchParams(safeParamsToString());
      currentParams.forEach((value, key) => {
        // Keep parameters that DO NOT start with the current instance's prefix
        if (!key.startsWith(paramKeyPrefix)) {
          newParams.append(key, value);
        }
      });

      // Apply updates relevant to this instance
      Object.entries(updates).forEach(([key, value]) => {
        const prefixedKey = getKey(key);

        // Special handling for page parameter when it's 1 (default)
        if (key === 'page' && (value === 1 || value === '1')) {
          // Remove the page parameter if it exists in newParams
          if (newParams.has(prefixedKey)) {
            newParams.delete(prefixedKey);
            changed = true;
          }

          // Mark as changed if the parameter exists in current URL
          // This ensures we update the URL even when just removing a parameter
          if (currentParams.has(prefixedKey)) {
            changed = true;
          }
          return;
        }

        if (key === 'page') {
          value = Math.max(1, Number(value) || 1);
        }

        // Compare with current value in the newParams
        const currentValueInNew = newParams.getAll(prefixedKey);

        if (Array.isArray(value)) {
          // Handle array values (e.g., filters)
          newParams.delete(prefixedKey); // Remove existing before adding new
          if (value.length > 0) {
            value.forEach((v) => newParams.append(prefixedKey, v.toString()));
            if (
              JSON.stringify(value.sort()) !==
              JSON.stringify(currentValueInNew.sort())
            ) {
              changed = true;
            }
          } else if (currentValueInNew.length > 0) {
            // If new value is empty array and old one wasn't
            changed = true;
          }
        } else {
          // Handle single values (e.g., search, page, sort)
          // CRITICAL FIX: Properly handle null, empty strings and undefined
          if (value === null || value === '' || value === undefined) {
            // Check if the parameter exists in either newParams or currentParams
            if (newParams.has(prefixedKey) || currentParams.has(prefixedKey)) {
              newParams.delete(prefixedKey);
              changed = true;
            }
          } else {
            const stringValue = value.toString();
            const currentSingleValueInNew = newParams.get(prefixedKey);

            if (stringValue !== currentSingleValueInNew) {
              newParams.set(prefixedKey, stringValue);
              changed = true;
            }
          }
        }
      });

      // Only push/replace URL if changes occurred for this instance
      if (changed) {
        const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
        const targetUrl = pathname + queryStr;
        // console.log(`Updating URL (${replace ? 'replace' : 'push'}): ${targetUrl}`);
        if (replace) {
          router.replace(targetUrl, { scroll: false });
        } else {
          router.push(targetUrl, { scroll: false });
        }
      }
    },
    // updateUrlParams depends on searchParams to read other tabs' params
    [router, searchParams, pathname, getKey, paramKeyPrefix, safeParamsToString]
  );

  // --- Effects for State and URL Synchronization --- //

  // Effect 1: Handle direct user input changes (search, filters, sorting)
  // Updates URL (push) and triggers debounced fetch.
  useEffect(() => {
    // Skip initial load synchronization - Effect 2 handles initial load
    if (initialLoad.current) {
      return;
    }
    // console.log("Effect 1 Triggered (User Input Change)");

    const updates: Record<string, any> = {};
    let stateChanged = false;
    let resetPage = false;

    // Check if search changed
    if (searchInput !== prevDeps.current.searchInput) {
      // CRITICAL FIX: Always ensure empty string is converted to null
      // This will cause the parameter to be removed from the URL
      updates.q = searchInput === '' ? null : searchInput;
      stateChanged = true;
      resetPage = true;
    }
    // Check if filters changed
    if (
      JSON.stringify(statusFilter) !==
      JSON.stringify(prevDeps.current.statusFilter)
    ) {
      updates.status = statusFilter; // Pass array directly
      stateChanged = true;
      resetPage = true;
    }
    if (
      JSON.stringify(genreFilter) !==
      JSON.stringify(prevDeps.current.genreFilter)
    ) {
      updates.genres = genreFilter; // Pass array directly
      stateChanged = true;
      resetPage = true;
    }
    // Check if sorting changed
    if (JSON.stringify(sorting) !== JSON.stringify(prevDeps.current.sorting)) {
      if (sorting.length > 0) {
        updates.sortBy = sorting[0].id;
        updates.sortOrder = sorting[0].desc ? 'desc' : 'asc';
      } else {
        updates.sortBy = null; // Explicitly remove sorting params
        updates.sortOrder = null;
      }
      stateChanged = true;
      resetPage = true;
    }

    if (resetPage) {
      updates.page = 1; // Reset page if search, filter or sort changed
    }

    // If state relevant to this hook instance changed
    if (stateChanged) {
      // Update URL (use push for user-driven changes)
      updateUrlParams(updates, false);

      // Trigger debounced fetch using parameters intended for the *URL*
      // fetchDataInternal will correctly extract/map for the API call
      const paramsForFetch = new URLSearchParams();
      Object.entries(updates).forEach(([key, value]) => {
        const prefixedKey = getKey(key);
        if (Array.isArray(value)) {
          if (value.length > 0)
            value.forEach((v) =>
              paramsForFetch.append(prefixedKey, v.toString())
            );
        } else if (value !== null && value !== '') {
          paramsForFetch.set(prefixedKey, value.toString());
        }
      });
      // Use the (potentially reset) page number
      debouncedFetch(updates.page || currentPage, paramsForFetch);

      // Update previous dependencies ref *after* logic
      prevDeps.current = {
        ...prevDeps.current, // Keep previous page if only search/filter/sort changed
        currentPage: updates.page || prevDeps.current.currentPage, // Update page if it was reset
        searchInput,
        statusFilter,
        genreFilter,
        sorting,
      };
    }
  }, [
    searchInput,
    statusFilter,
    genreFilter,
    sorting,
    updateUrlParams,
    debouncedFetch,
    currentPage,
    getKey,
  ]);

  // Effect 2: Handle URL changes (e.g., browser back/forward, direct URL edit, page changes)
  // Updates *state* based on URL and triggers *immediate* fetch if necessary.
  useEffect(() => {
    // console.log("Effect 2 Triggered (URL Change Check)");
    const urlPage = Math.max(1, Number(safeGetParam(getKey('page'))) || 1);
    const urlSearch = safeGetParam(getKey('q'));
    const urlStatus = safeGetAllParams(getKey('status'));
    const urlGenres = safeGetAllParams(getKey('genres'));
    const urlSortBy = safeGetParam(getKey('sortBy'));
    const urlSortOrder = safeGetParam(getKey('sortOrder'));
    const urlSorting = urlSortBy
      ? [{ id: urlSortBy, desc: urlSortOrder === 'desc' }]
      : [];

    // Check if URL state differs from *current tracked state (prevDeps)*
    const urlStateDiffers =
      urlPage !== prevDeps.current.currentPage ||
      urlSearch !== prevDeps.current.searchInput ||
      JSON.stringify(urlStatus) !==
        JSON.stringify(prevDeps.current.statusFilter) ||
      JSON.stringify(urlGenres) !==
        JSON.stringify(prevDeps.current.genreFilter) ||
      JSON.stringify(urlSorting) !== JSON.stringify(prevDeps.current.sorting);

    // console.log(`Effect 2: Initial Load: ${initialLoad.current}, URL State Differs: ${urlStateDiffers}`);

    // If initial load OR URL state has changed from tracked state
    if (initialLoad.current || urlStateDiffers) {
      // console.log(`Effect 2: Syncing state and fetching...`);

      // Sync state with URL values for this instance
      setSearchInput(urlSearch);
      setStatusFilter(urlStatus);
      setGenreFilter(urlGenres);
      setSorting(urlSorting);
      // Note: currentPage is derived directly from searchParams, so no separate state update needed

      // Fetch data immediately based on URL state
      // Pass the current searchParams (representing the URL) to fetchDataInternal
      const paramsFromUrl = new URLSearchParams(safeParamsToString());
      fetchDataInternal(urlPage, paramsFromUrl, initialLoad.current); // Show loading only on initial load

      // Update previous dependencies ref *after* logic
      prevDeps.current = {
        currentPage: urlPage,
        searchInput: urlSearch,
        statusFilter: urlStatus,
        genreFilter: urlGenres,
        sorting: urlSorting,
      };

      if (initialLoad.current) {
        initialLoad.current = false;
      }
    }
    // searchParams is the sole dependency, representing the URL state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Refresh data function (refetches based on current URL state)
  const refreshData = useCallback(async () => {
    // console.log("Refreshing data based on current URL");
    const params = new URLSearchParams(safeParamsToString());
    const pageToRefresh = Math.max(1, Number(params.get(getKey('page'))) || 1);
    // Pass the current URL params; fetchDataInternal knows how to map them for the API
    await fetchDataInternal(pageToRefresh, params);
  }, [searchParams, fetchDataInternal, getKey, safeParamsToString]);

  return {
    data,
    setData, // Allow external data manipulation if needed
    loading,
    totalPages,
    currentPage, // This is now always derived directly from URL state
    actionLoading,
    setActionLoading,
    searchInput, // Expose state
    setSearchInput, // Expose setter
    statusFilter, // Expose state
    setStatusFilter, // Expose setter
    genreFilter, // Expose state
    setGenreFilter, // Expose setter
    selectedRows,
    setSelectedRows,
    sorting, // Expose state
    setSorting, // Expose setter
    updateQueryParam: updateUrlParams, // Expose URL update function
    refreshData, // Expose refresh function
  };
}
