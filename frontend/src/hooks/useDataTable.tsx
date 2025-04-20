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
  loggedInAdminLevel?: number | null;
}

export function useDataTable<T>({
  fetchData,
  limit = 10,
  paramKeyPrefix = '',
  loggedInAdminLevel,
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
  const [verifiedFilter, setVerifiedFilter] = useState<string[]>(
    safeGetAllParams(getKey('isVerified')) // New state for verification filter
  );
  const [roleFilter, setRoleFilter] = useState<string[]>(safeGetAllParams(getKey('role')));
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
    startDate: safeGetParam(getKey('startDate')), 
    endDate: safeGetParam(getKey('endDate')), 
    verifiedFilter: safeGetAllParams(getKey('isVerified')), // Track previous verified filter
    roleFilter: safeGetAllParams(getKey('role')), // Track previous role filter
  });

  // --- Fetching Logic --- //

  const fetchDataInternal = useCallback(
    async (
      pageToFetch: number,
      paramsToFetch: URLSearchParams,
      showLoading: boolean = true
    ) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const paramsForApi = new URLSearchParams();

        // 1. Set standard pagination from pageToFetch and limit
        paramsForApi.set('page', String(Math.max(1, pageToFetch)));
        paramsForApi.set('limit', String(limit));

        // 2. Set search parameter from the prefixed URL key in paramsToFetch
        const currentSearchValue = paramsToFetch.get(getKey('q'));
        if (currentSearchValue) {
          paramsForApi.set('search', currentSearchValue); // Use 'search' for API
        }

        // 3. Set filter parameters from the prefixed URL keys in paramsToFetch
        const currentStatusValues = paramsToFetch.getAll(getKey('status'));
        if (currentStatusValues.length > 0) {
          currentStatusValues.forEach((s) => paramsForApi.append('status', s));
        }
        const currentGenreValues = paramsToFetch.getAll(getKey('genres'));
        if (currentGenreValues.length > 0) {
          currentGenreValues.forEach((g) => paramsForApi.append('genres', g));
        }
        const currentVerifiedValues = paramsToFetch.getAll(getKey('isVerified')); // Read verified filter
        if (currentVerifiedValues.length > 0) {
          currentVerifiedValues.forEach((v) => paramsForApi.append('isVerified', v)); // Append to API params
        }
        const currentRoleValues = paramsToFetch.getAll(getKey('role')); // Read role filter
        if (currentRoleValues.length > 0) {
          currentRoleValues.forEach((r) => paramsForApi.append('role', r)); // Append role to API params (non-prefixed)
        }

        // 4. Set sorting parameters from the prefixed URL keys in paramsToFetch
        const currentSortBy = paramsToFetch.get(getKey('sortBy'));
        const currentSortOrder = paramsToFetch.get(getKey('sortOrder'));
        if (currentSortBy) {
          paramsForApi.set('sortBy', currentSortBy);
          if (currentSortOrder) {
            paramsForApi.set('sortOrder', currentSortOrder);
          }
        }

        // 5. Set date range parameters from the prefixed URL keys in paramsToFetch
        const currentStartDate = paramsToFetch.get(getKey('startDate'));
        const currentEndDate = paramsToFetch.get(getKey('endDate'));
        if (currentStartDate) {
          paramsForApi.set('startDate', currentStartDate);
        }
        if (currentEndDate) {
          paramsForApi.set('endDate', currentEndDate);
        }
        const response = await fetchData(pageToFetch, paramsForApi);

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
          setData([]);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Fetch data error:', error);
        toast.error((error as Error)?.message ?? 'Failed to fetch data');
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [fetchData, limit, getKey]
  );

  const debouncedFetch = useRef(
    debounce((page: number, params: URLSearchParams) => {
      fetchDataInternal(page, params);
    }, 300)
  ).current;

  const updateUrlParams = useCallback(
    (
      updates: Record<string, string | number | string[] | null>,
      replace: boolean = false 
    ) => {
      const newParams = new URLSearchParams(safeParamsToString());
      let changed = false;

      Object.entries(updates).forEach(([key, value]) => {
        const prefixedKey = getKey(key);
        const currentValueInNew = newParams.getAll(prefixedKey);

        newParams.delete(prefixedKey);

        if (key === 'page' && (value === 1 || value === '1')) {
          if (currentValueInNew.length > 0) changed = true;
          return;
        }

        if (key === 'page') {
          value = Math.max(1, Number(value) || 1);
        }

        let valueChanged = false;

        if (Array.isArray(value)) {
          if (value.length > 0) {
            value.forEach((v) => newParams.append(prefixedKey, v.toString()));
            if (
              JSON.stringify(value.slice().sort()) !==
              JSON.stringify(currentValueInNew.slice().sort())
            ) {
              valueChanged = true;
            }
          } else {
            if (currentValueInNew.length > 0) {
              valueChanged = true;
            }
          }
        } else {
          if (value !== null && value !== '' && value !== undefined) {
            const stringValue = value.toString();
            newParams.set(prefixedKey, stringValue);
            if (
              currentValueInNew.length !== 1 ||
              currentValueInNew[0] !== stringValue
            ) {
              valueChanged = true;
            }
          } else {
            // Value is null/empty string/undefined, meaning remove the parameter
            if (currentValueInNew.length > 0) {
              valueChanged = true; // It changed if it existed before
            }
          }
        }
        if (valueChanged) {
          changed = true;
        }
      });

      // Only push/replace URL if changes occurred
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
    [router, searchParams, pathname, getKey, safeParamsToString] // Removed paramKeyPrefix dependency
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
    const newPage = Math.max(1, Number(safeGetParam(getKey('page'))) || 1); // Start with current URL page

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
      updates.status = statusFilter.length > 0 ? statusFilter : null; // Pass null if empty
      stateChanged = true;
      resetPage = true;
    }
    if (
      JSON.stringify(genreFilter) !==
      JSON.stringify(prevDeps.current.genreFilter)
    ) {
      updates.genres = genreFilter.length > 0 ? genreFilter : null; // Pass null if empty
      stateChanged = true;
      resetPage = true;
    }
    if (
      JSON.stringify(verifiedFilter) !== // Check if verified filter changed
      JSON.stringify(prevDeps.current.verifiedFilter)
    ) {
      updates.isVerified = verifiedFilter.length > 0 ? verifiedFilter : null; // Pass null if empty
      stateChanged = true;
      resetPage = true;
    }
    if (
      JSON.stringify(roleFilter) !== // Check if role filter changed
      JSON.stringify(prevDeps.current.roleFilter)
    ) {
      updates.role = roleFilter.length > 0 ? roleFilter : null; // Pass null if empty
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
    } else {
      // If only page changed (e.g. pagination click), ensure page update is included
      if (currentPage !== prevDeps.current.currentPage) {
        updates.page = currentPage;
        // No need to set stateChanged = true here, URL change (Effect 2) handles page-only changes
      }
    }

    // If state relevant to this hook instance changed (search, filter, sort)
    if (stateChanged) {
      // Update URL (use push for user-driven changes)
      updateUrlParams(updates, false);

      // Construct the full set of parameters for the *next URL state*
      const paramsForFetch = new URLSearchParams(safeParamsToString()); // Start with existing URL params

      // Apply the changes from 'updates' to build the final parameter set
      Object.entries(updates).forEach(([key, value]) => {
          const prefixedKey = getKey(key);
          paramsForFetch.delete(prefixedKey); // Remove existing before potentially adding new

          if (key === 'page' && (value === 1 || value === '1')) {
              // Already deleted, do nothing more
          } else if (Array.isArray(value)) {
              if (value.length > 0) {
                  value.forEach((v) => paramsForFetch.append(prefixedKey, v.toString()));
              }
          } else if (value !== null && value !== '' && value !== undefined) {
              paramsForFetch.set(prefixedKey, value.toString());
          }
      });


      // Trigger debounced fetch using the complete, intended URL parameters
      debouncedFetch(updates.page || newPage, paramsForFetch);


      // Update previous dependencies ref *after* logic
      prevDeps.current = {
        currentPage: updates.page || prevDeps.current.currentPage, // Update page if it was reset
        searchInput,
        statusFilter,
        genreFilter,
        sorting,
        startDate: safeGetParam(getKey('startDate')), // Update previous startDate
        endDate: safeGetParam(getKey('endDate')), // Update previous endDate
        verifiedFilter, // Update previous verified filter
        roleFilter, // Update previous role filter
      };
    }
  }, [
    searchInput,
    statusFilter,
    genreFilter,
    verifiedFilter,
    sorting,
    roleFilter,
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
    const urlVerified = safeGetAllParams(getKey('isVerified')); // Read verified from URL
    const urlRoleParams = safeGetAllParams(getKey('role')); // Read role from URL
    const urlSortBy = safeGetParam(getKey('sortBy'));
    const urlSortOrder = safeGetParam(getKey('sortOrder'));
    const urlSorting = urlSortBy
      ? [{ id: urlSortBy, desc: urlSortOrder === 'desc' }]
      : [];
    const urlStartDate = safeGetParam(getKey('startDate')); // Read startDate from URL
    const urlEndDate = safeGetParam(getKey('endDate')); // Read endDate from URL

    // ** Check for invalid role param first **
    if (loggedInAdminLevel !== 1 && urlRoleParams.length > 0) {
      // Invalid state: Non-level-1 admin has role param in URL.
      // console.log(`Admin Level ${loggedInAdminLevel} detected with role param. Removing...`);
      updateUrlParams({ role: null }, true); // Remove param and replace URL history state.
      // Don't proceed with state sync or fetch for this invalid URL state.
      return;
    }

    // Check if URL state differs from *current tracked state (prevDeps)*
    const urlStateDiffers =
      urlPage !== prevDeps.current.currentPage ||
      urlSearch !== prevDeps.current.searchInput ||
      JSON.stringify(urlStatus) !==
        JSON.stringify(prevDeps.current.statusFilter) ||
      JSON.stringify(urlGenres) !==
        JSON.stringify(prevDeps.current.genreFilter) ||
      JSON.stringify(urlSorting) !== JSON.stringify(prevDeps.current.sorting) ||
      urlStartDate !== prevDeps.current.startDate || // Compare startDate
      urlEndDate !== prevDeps.current.endDate || // Compare endDate
      JSON.stringify(urlVerified) !== JSON.stringify(prevDeps.current.verifiedFilter) || // Compare verified filter
      JSON.stringify(safeGetAllParams(getKey('role'))) !== JSON.stringify(prevDeps.current.roleFilter); // Compare role filter

    // console.log(`Effect 2: Initial Load: ${initialLoad.current}, URL State Differs: ${urlStateDiffers}`);

    // If initial load OR URL state has changed from tracked state
    if (initialLoad.current || urlStateDiffers) {
      // console.log(`Effect 2: Syncing state and fetching...`);

      // Sync state with URL values for this instance
      setSearchInput(urlSearch);
      setStatusFilter(urlStatus);
      setGenreFilter(urlGenres);
      setSorting(urlSorting);
      setVerifiedFilter(urlVerified); // Sync verified filter state
      setRoleFilter(safeGetAllParams(getKey('role'))); // Sync role filter state
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
        startDate: urlStartDate, // Update previous startDate
        endDate: urlEndDate, // Update previous endDate
        verifiedFilter: urlVerified, // Update previous verified filter
        roleFilter: safeGetAllParams(getKey('role')), // Update previous role filter
      };

      if (initialLoad.current) {
        initialLoad.current = false;
      }
    }
    // searchParams is the sole dependency, representing the URL state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loggedInAdminLevel, updateUrlParams, fetchDataInternal, getKey, safeParamsToString]); // Add dependencies

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
    verifiedFilter, // Expose state
    setVerifiedFilter, // Expose setter
    roleFilter, // Expose role filter state
    setRoleFilter, // Expose role filter setter
    selectedRows,
    setSelectedRows,
    sorting, // Expose state
    setSorting, // Expose setter
    updateQueryParam: updateUrlParams, // Expose URL update function
    refreshData, // Expose refresh function
  };
}
