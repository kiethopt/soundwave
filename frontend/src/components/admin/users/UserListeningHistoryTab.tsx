"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  History,
  ArtistProfile,
  Album,
  UserListeningStats,
  AudioFeatureStat,
  NumericFeatureStat,
} from "@/types";
import { api } from "@/utils/api";
import toast from "react-hot-toast";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowUpDown,
  RefreshCw,
  Info,
  Sparkles,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Music2,
  Mic2,
  KeyRound,
  Zap,
  Gauge,
  Shuffle,
} from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { formatDistanceToNow, format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackDetailsModal } from "./TrackDetailsModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface HistoryWithDetails extends Omit<History, "track" | "user"> {
  track: {
    id: string;
    title: string;
    coverUrl: string;
    duration: number;
    artist: Pick<ArtistProfile, "id" | "artistName"> | null;
    album: Pick<Album, "id" | "title"> | null;
    tempo?: number | null;
    mood?: string | null;
    key?: string | null;
    scale?: string | null;
    danceability?: number | null;
    energy?: number | null;
  } | null;
  // User details might not be needed here if we only show history for one user
}

interface ApiResponse {
  data: HistoryWithDetails[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface SortConfig {
  key:
    | keyof History
    | "track.title"
    | "track.artist.artistName"
    | "track.album.title"
    | null; // Allow sorting by nested fields
  direction: "asc" | "desc";
}

interface UserListeningHistoryTabProps {
  userId: string;
  refreshTrigger?: number;
  onTotalItemsChange?: (totalItems: number) => void;
  initialStats: UserListeningStats | null;
  initialLoading: boolean;
  initialError: string | null;
}

// --- Custom Toast Component ---
const ReanalysisProgressToast = ({ message }: { message: string }) => (
  <div className="flex items-center bg-background text-foreground p-3 rounded-md shadow-lg border max-w-sm w-full">
    <Loader2 className="h-5 w-5 animate-spin text-primary mr-3 shrink-0" />
    <div className="flex-grow min-w-0">
      <p className="text-sm font-medium truncate">{message}</p>
    </div>
  </div>
);

export const UserListeningHistoryTab = ({
  userId,
  refreshTrigger,
  onTotalItemsChange,
  initialStats,
  initialLoading,
  initialError,
}: UserListeningHistoryTabProps) => {
  const { theme } = useTheme();
  const [historyItems, setHistoryItems] = useState<HistoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(initialLoading);
  const [listeningStats, setListeningStats] =
    useState<UserListeningStats | null>(initialStats);
  const [statsError, setStatsError] = useState<string | null>(initialError);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "createdAt",
    direction: "desc",
  });
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  const [selectedTrackForDetails, setSelectedTrackForDetails] = useState<
    HistoryWithDetails["track"] | null
  >(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isBulkReanalyzing, setIsBulkReanalyzing] = useState(false);
  const [bulkReanalyzeError, setBulkReanalyzeError] = useState<string | null>(
    null
  );
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [bulkReanalyzeProgress, setBulkReanalyzeProgress] = useState(0);

  const limit = 15;

  useEffect(() => {
    setListeningStats(initialStats);
    setLoadingStats(initialLoading);
    setStatsError(initialError);
  }, [initialStats, initialLoading, initialError]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        throw new Error("No authentication token found for fetching stats.");
      }
      const response: {
        success: boolean;
        data: UserListeningStats;
        message?: string;
      } = await api.admin.getUserListeningStats(userId, token);
      if (response && response.success && response.data) {
        setListeningStats(response.data);
      } else {
        const errorMessage =
          response?.message ||
          "Failed to fetch listening stats or data is missing.";
        setStatsError(errorMessage);
        toast.error(errorMessage);
        setListeningStats(null);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Could not load listening statistics";
      setStatsError(errorMessage);
      toast.error(errorMessage);
      setListeningStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [userId]);

  useEffect(() => {
    if (localRefreshTrigger > 0 || (refreshTrigger && refreshTrigger > 0)) {
      console.log(
        "[UserListeningHistoryTab] Refresh trigger activated, fetching stats."
      );
      fetchStats();
    }
  }, [userId, localRefreshTrigger, refreshTrigger, fetchStats]);

  const hasAnyMissingFeatures = useMemo(() => {
    return historyItems.some(
      (item) =>
        item.track &&
        (item.track.tempo === null ||
          item.track.tempo === undefined ||
          item.track.mood === null ||
          item.track.mood === undefined ||
          item.track.mood === "" ||
          item.track.key === null ||
          item.track.key === undefined ||
          item.track.key === "" ||
          item.track.scale === null ||
          item.track.scale === undefined ||
          item.track.scale === "" ||
          item.track.danceability === null ||
          item.track.danceability === undefined ||
          item.track.energy === null ||
          item.track.energy === undefined)
    );
  }, [historyItems]);

  const tracksToReanalyzeIds = useMemo(() => {
    return historyItems
      .filter(
        (item) =>
          item.track &&
          (item.track.tempo === null ||
            item.track.tempo === undefined ||
            item.track.mood === null ||
            item.track.mood === undefined ||
            item.track.mood === "" ||
            item.track.key === null ||
            item.track.key === undefined ||
            item.track.key === "" ||
            item.track.scale === null ||
            item.track.scale === undefined ||
            item.track.scale === "" ||
            item.track.danceability === null ||
            item.track.danceability === undefined ||
            item.track.energy === null ||
            item.track.energy === undefined)
      )
      .map((item) => item.track!.id);
  }, [historyItems]);

  const handleSuccessfulReanalyze = useCallback((trackId: string) => {
    console.log(
      `[UserListeningHistoryTab] Re-analysis successful for track ${trackId}. Refreshing history...`
    );
    setLocalRefreshTrigger((prev) => prev + 1);
  }, []);

  const startBulkReanalyze = useCallback(async () => {
    setIsConfirmDialogOpen(false);
    setIsBulkReanalyzing(true);
    setBulkReanalyzeError(null);
    setBulkReanalyzeProgress(0);
    let toastId: string | undefined = undefined;

    const trackIds = tracksToReanalyzeIds;

    if (trackIds.length === 0) {
      toast("No tracks found requiring re-analysis on this page.");
      setIsBulkReanalyzing(false);
      return;
    }

    const token = localStorage.getItem("userToken");
    if (!token) {
      toast.error("Authentication token not found.");
      setIsBulkReanalyzing(false);
      setBulkReanalyzeError("Authentication token not found.");
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: { trackId: string; message: string }[] = [];

    toastId = toast.custom(
      <ReanalysisProgressToast message="Starting bulk re-analysis..." />,
      { duration: Infinity }
    );

    for (let i = 0; i < trackIds.length; i++) {
      const trackId = trackIds[i];
      const progressMessage = `Re-analyzing track ${i + 1} of ${
        trackIds.length
      }...`;
      toast.custom(<ReanalysisProgressToast message={progressMessage} />, {
        id: toastId,
      });

      try {
        await api.admin.reanalyzeTrack(trackId, token);
        successCount++;
      } catch (err: any) {
        console.error(`Error re-analyzing track ${trackId}:`, err);
        errorCount++;
        errors.push({ trackId, message: err.message || "Unknown error" });
      }
    }

    if (toastId) toast.dismiss(toastId);

    if (errorCount === 0) {
      toast.success(
        `Bulk re-analysis complete. ${successCount} tracks re-analyzed successfully.`,
        { duration: 4000 }
      );
    } else {
      toast.error(
        `Bulk re-analysis finished. ${successCount} succeeded, ${errorCount} failed.`,
        { duration: 6000 }
      );
      setBulkReanalyzeError(
        `${errorCount} tracks failed to re-analyze. Check console for details.`
      );
      console.error("Bulk re-analysis errors:", errors);
    }

    setIsBulkReanalyzing(false);
    setLocalRefreshTrigger((prev) => prev + 1);
  }, [tracksToReanalyzeIds]);

  const fetchHistory = useCallback(
    async (page: number, sort: SortConfig) => {
      console.log(
        `[UserListeningHistoryTab DEBUG] fetchHistory CALLED with Page: ${page}, Sort Key: ${sort.key}`
      );
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("userToken");
        if (!token) throw new Error("No authentication token found");

        const queryParams: { [key: string]: string | number } = {
          page: page.toString(),
          limit: limit.toString(),
        };

        if (sort.key) {
          queryParams["sortBy"] = sort.key;
          queryParams["sortOrder"] = sort.direction;
        }
        if (activeSearchTerm) {
          queryParams["search"] = activeSearchTerm;
        }

        const response: ApiResponse = await api.admin.getUserListeningHistory(
          userId,
          token,
          queryParams
        );

        // Add this log to debug pagination
        console.log(
          "[UserListeningHistoryTab] Pagination data:",
          response.pagination
        );

        setHistoryItems(response.data || []);
        const newTotalItems = response.pagination?.totalItems ?? 0;
        setPagination({
          currentPage: response.pagination?.currentPage ?? 1,
          totalPages: response.pagination?.totalPages ?? 1,
          totalItems: newTotalItems,
          hasNextPage: response.pagination?.hasNextPage ?? false,
          hasPrevPage: response.pagination?.hasPrevPage ?? false,
        });

        if (onTotalItemsChange) {
          onTotalItemsChange(newTotalItems);
        }
      } catch (err: any) {
        console.error("Error fetching listening history:", err);
        const errorMessage = err.message || "Could not load listening history";
        setError(errorMessage);
        if (error !== errorMessage) {
          toast.error(errorMessage);
        }
        setHistoryItems([]);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false,
        });
        if (onTotalItemsChange) {
          onTotalItemsChange(0);
        }
      } finally {
        setLoading(false);
      }
    },
    [userId, limit, onTotalItemsChange, activeSearchTerm]
  );

  const refreshData = useCallback(() => {
    fetchHistory(pagination.currentPage, sortConfig);
  }, [fetchHistory, pagination.currentPage, sortConfig]);

  useEffect(() => {
    const currentPageForFetch = pagination.currentPage;
    const sortKeyForFetch = sortConfig.key;
    const sortDirectionForFetch = sortConfig.direction;
    console.log(
      `[UserListeningHistoryTab DEBUG] useEffect RUNNING. Fetching with Page: ${currentPageForFetch}, Sort Key: ${sortKeyForFetch}, Sort Dir: ${sortDirectionForFetch}, LocalRefresh: ${localRefreshTrigger}, ParentRefresh: ${refreshTrigger}`
    );
    fetchHistory(currentPageForFetch, {
      key: sortKeyForFetch,
      direction: sortDirectionForFetch,
    });
  }, [
    fetchHistory,
    pagination.currentPage,
    sortConfig.key,
    sortConfig.direction,
    localRefreshTrigger,
    refreshTrigger,
  ]);

  const handleSort = (key: SortConfig["key"]) => {
    if (!key) return;
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    setSortConfig({ key, direction });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
  };

  const formatTrackDuration = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const renderSortIcon = (key: SortConfig["key"]) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4 text-primary" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    );
  };

  const handleOpenDetailsModal = (track: HistoryWithDetails["track"]) => {
    setSelectedTrackForDetails(track);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedTrackForDetails(null);
  };

  // Helper function to render a single stat card, moved for better organization
  const StatCard: React.FC<{
    title: string;
    icon: React.ElementType;
    data: AudioFeatureStat[] | NumericFeatureStat | string | null | undefined;
    isLoading: boolean;
    error?: string | null;
    statType: "list" | "numeric" | "message";
    unit?: string;
  }> = ({ title, icon: Icon, data, isLoading, error, statType, unit }) => {
    if (isLoading) {
      return (
        <Card className="w-full shadow-sm hover:shadow-md transition-shadow bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-10 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className="w-full shadow-sm hover:shadow-md transition-shadow bg-destructive/10 border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              {title}
            </CardTitle>
            <Icon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-destructive truncate pt-2">
              Error loading
            </p>
          </CardContent>
        </Card>
      );
    }

    if (!data && statType !== "message") {
      return (
        <Card className="w-full shadow-sm hover:shadow-md transition-shadow bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground pt-2">No data</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="w-full shadow-sm hover:shadow-md transition-shadow bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {statType === "list" && Array.isArray(data) && data.length > 0 && (
            <ul className="text-sm text-foreground space-y-1">
              {(data as AudioFeatureStat[]).slice(0, 3).map((item, index) => (
                <li key={index} className="truncate">
                  {item.name} ({item.count})
                </li>
              ))}
              {data.length === 0 && (
                <li className="text-muted-foreground">N/A</li>
              )}
            </ul>
          )}
          {statType === "list" && Array.isArray(data) && data.length === 0 && (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
          {statType === "numeric" &&
            data &&
            typeof data === "object" &&
            (data as NumericFeatureStat).average !== null && (
              <p className="text-xl font-bold text-primary">
                {(data as NumericFeatureStat).average?.toFixed(
                  unit === "bpm" ? 0 : 2
                )}
                {unit && <span className="text-xs font-normal"> {unit}</span>}
              </p>
            )}
          {statType === "numeric" &&
            data &&
            typeof data === "object" &&
            (data as NumericFeatureStat).average === null && (
              <p className="text-sm text-muted-foreground">N/A</p>
            )}
          {statType === "message" && typeof data === "string" && (
            <p className="text-sm text-foreground">{data}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading && historyItems.length === 0 && loadingStats && !initialStats) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error && historyItems.length === 0) {
    // Only show full error if no data is present
    return (
      <div className="text-red-500 bg-red-500/10 p-4 rounded-lg">
        Error loading history: {error}
      </div>
    );
  }

  if (!loading && !error && historyItems.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p className="text-lg">No Listening History Found</p>
        <p>This user does not have any listening history yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Listening Stats Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">
          Listening Statistics Overview
        </h3>
        {loadingStats && !listeningStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <StatCard
                key={i}
                title="Loading..."
                icon={Loader2}
                data={null}
                isLoading={true}
                statType="message"
              />
            ))}
          </div>
        )}
        {statsError && !listeningStats && (
          <div
            className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 text-center"
            role="alert"
          >
            <span className="font-medium">Error:</span> {statsError}
          </div>
        )}
        {listeningStats && !loadingStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <StatCard
              title="Top Moods"
              icon={Sparkles}
              data={listeningStats.topMoods}
              isLoading={loadingStats}
              error={statsError}
              statType="list"
            />
            <StatCard
              title="Top Genres"
              icon={Music2}
              data={listeningStats.topGenres}
              isLoading={loadingStats}
              error={statsError}
              statType="list"
            />
            <StatCard
              title="Top Artists"
              icon={Mic2}
              data={listeningStats.topArtists}
              isLoading={loadingStats}
              error={statsError}
              statType="list"
            />
            <StatCard
              title="Top Keys"
              icon={KeyRound}
              data={listeningStats.topKeys}
              isLoading={loadingStats}
              error={statsError}
              statType="list"
            />
            <StatCard
              title="Avg Tempo"
              icon={Gauge}
              data={listeningStats.tempo}
              isLoading={loadingStats}
              error={statsError}
              statType="numeric"
              unit="bpm"
            />
            <StatCard
              title="Avg Energy"
              icon={Zap}
              data={listeningStats.energy}
              isLoading={loadingStats}
              error={statsError}
              statType="numeric"
            />
            <StatCard
              title="Avg Danceability"
              icon={Shuffle}
              data={listeningStats.danceability}
              isLoading={loadingStats}
              error={statsError}
              statType="numeric"
            />
            <StatCard
              title="Items Analyzed"
              icon={TrendingUp}
              data={
                listeningStats.totalHistoryItemsAnalyzed !== undefined
                  ? `${listeningStats.totalHistoryItemsAnalyzed} tracks`
                  : "0 tracks"
              }
              isLoading={loadingStats}
              error={statsError}
              statType="message"
            />
          </div>
        )}
        {listeningStats?.message && !loadingStats && !statsError && (
          <div
            className="mt-4 p-3 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400"
            role="alert"
          >
            <span className="font-medium">Info:</span> {listeningStats.message}
          </div>
        )}
      </div>

      <Card className="rounded-xl shadow-lg">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl font-bold text-foreground">
              Listening History ({historyItems.length || 0})
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasAnyMissingFeatures && (
                <Dialog
                  open={isConfirmDialogOpen}
                  onOpenChange={setIsConfirmDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBulkReanalyzing || loading}
                      className="h-9 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400"
                    >
                      {isBulkReanalyzing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Re-analyze ({tracksToReanalyzeIds.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className={cn(
                      "sm:max-w-md",
                      theme === "dark" ? "dark" : ""
                    )}
                  >
                    <DialogHeader>
                      <DialogTitle>Confirm Bulk Re-analysis</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to re-analyze the{" "}
                        {tracksToReanalyzeIds.length} tracks on this page that
                        are missing audio features? This process might take a
                        while and consume server resources.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 sm:justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsConfirmDialogOpen(false)}
                        disabled={isBulkReanalyzing}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={startBulkReanalyze}
                        disabled={isBulkReanalyzing}
                        // Apply appropriate variant, e.g., default or a custom one
                      >
                        {isBulkReanalyzing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          "Confirm & Start"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocalRefreshTrigger((prev) => prev + 1)}
                disabled={loading || isBulkReanalyzing}
                className="h-9"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
          {bulkReanalyzeError && (
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              {bulkReanalyzeError}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {error && historyItems.length > 0 && (
            <div className="mx-6 my-2 p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm">
              <p>
                Could not fully refresh data. Displaying last known records.
                Error: {error}
              </p>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[60px] px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    {null}
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Track
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Artist
                  </TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">
                    Album
                  </TableHead>
                  <TableHead
                    className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center justify-center">
                      Played At {renderSortIcon("createdAt")}
                    </div>
                  </TableHead>
                  <TableHead className="w-[80px] px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && historyItems.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                )}
                {historyItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="px-6 py-4">
                      {item.track?.coverUrl ? (
                        <div className="flex justify-center">
                          <div className="h-12 w-12 relative">
                            <Image
                              src={item.track.coverUrl}
                              alt={item.track.title ?? "Track cover"}
                              fill
                              sizes="48px"
                              className="rounded-full object-cover border-2 border-primary/30 shadow"
                              priority={false}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <div className="h-12 w-12 rounded-full border-2 border-primary/30 bg-muted flex items-center justify-center text-xs shadow">
                            ?
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="font-medium text-sm">
                        {item.track?.title || "Unknown Track"}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {item.track?.artist ? (
                        <Link
                          href={`/admin/artists/${item.track.artist.id}`}
                          className="hover:underline text-primary text-sm"
                        >
                          {item.track.artist.artistName}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Unknown Artist
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {item.track?.album ? (
                        <span
                          className="text-sm"
                          title={item.track.album.title}
                        >
                          {item.track.album.title.length > 30
                            ? `${item.track.album.title.substring(0, 30)}...`
                            : item.track.album.title}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          N/A
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <span
                        title={format(new Date(item.createdAt), "Pp")}
                        className="text-sm"
                      >
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour12: false,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        {item.track && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDetailsModal(item.track)}
                            title="View Audio Features"
                            className="h-8 w-8"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t">
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              hasNextPage={pagination.currentPage < pagination.totalPages}
              hasPrevPage={pagination.currentPage > 1}
            />
          </div>
        )}
      </Card>
      {selectedTrackForDetails && (
        <TrackDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
          track={selectedTrackForDetails as any}
          onSuccessfulReanalyze={handleSuccessfulReanalyze}
        />
      )}
    </>
  );
};
