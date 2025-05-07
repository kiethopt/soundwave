"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { History, Track, ArtistProfile, Album } from "@/types"; // Adjust types as needed
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
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ArrowUpDown,
  Search,
  RefreshCw,
  Info,
  Sparkles,
} from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { formatDistanceToNow, format } from "date-fns";
import Image from "next/image"; // Use Next.js Image for optimization
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackDetailsModal } from "./TrackDetailsModal"; // Import the modal
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // Use Dialog components
import { Progress } from "@/components/ui/progress"; // Import Progress component
import { cn } from "@/lib/utils"; // <--- ADD THIS IMPORT
// import { DateRangePicker } from "@/components/ui/DateRangePicker"; // Assuming a DateRangePicker component exists

// Define the structure of the history data we expect, ensuring Track has audio features
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
}: UserListeningHistoryTabProps) => {
  const { theme } = useTheme();
  const [historyItems, setHistoryItems] = useState<HistoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false); // State for confirm dialog
  const [bulkReanalyzeProgress, setBulkReanalyzeProgress] = useState(0); // State for progress

  const limit = 15;

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

  // --- Get list of tracks needing re-analysis (memoized) ---
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

  // --- Bulk Re-analyze Logic ---
  const startBulkReanalyze = useCallback(async () => {
    setIsConfirmDialogOpen(false); // Close confirm dialog if open
    setIsBulkReanalyzing(true);
    setBulkReanalyzeError(null);
    setBulkReanalyzeProgress(0);
    let toastId: string | undefined = undefined; // Initialize toastId

    const trackIds = tracksToReanalyzeIds; // Use memoized list

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

    // Initial Toast (no progress needed)
    toastId = toast.custom(
      <ReanalysisProgressToast message="Starting bulk re-analysis..." />,
      { duration: Infinity }
    );

    for (let i = 0; i < trackIds.length; i++) {
      const trackId = trackIds[i];
      const progressMessage = `Re-analyzing track ${i + 1} of ${
        trackIds.length
      }...`;

      // Update the custom toast (no progress needed)
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

    // Final summary toast
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
    setLocalRefreshTrigger((prev) => prev + 1); // Refresh the table data
  }, [tracksToReanalyzeIds]); // Dependency on the calculated list

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

        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (sort.key) {
          params.append("sortBy", sort.key);
          params.append("sortOrder", sort.direction);
        }

        const response: ApiResponse = await api.admin.getUserListeningHistory(
          userId,
          token,
          params.toString()
        );

        setHistoryItems(response.data || []);
        const newTotalItems = response.pagination?.totalItems ?? 0;
        setPagination((prev) => ({
          currentPage: response.pagination?.currentPage ?? 1,
          totalPages: response.pagination?.totalPages ?? 1,
          totalItems: newTotalItems,
          hasNextPage: response.pagination?.hasNextPage ?? false,
          hasPrevPage: response.pagination?.hasPrevPage ?? false,
        }));

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
    [userId, limit, onTotalItemsChange]
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
      <ArrowUpDown className="ml-2 h-4 w-4" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4" />
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

  if (loading && historyItems.length === 0) {
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
        <p className="text-lg">Không tìm thấy lịch sử nghe</p>
        <p>Người dùng này chưa có lịch sử nghe nhạc nào.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-xl sm:text-2xl">
            Listening History ({pagination.totalItems} plays)
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Button to trigger confirmation dialog */}
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
                    className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-400"
                  >
                    {isBulkReanalyzing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Re-analyze Missing Features ({tracksToReanalyzeIds.length})
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className={cn("sm:max-w-md", theme === "dark" ? "dark" : "")}
                >
                  <DialogHeader>
                    <DialogTitle>Confirm Bulk Re-analysis</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to re-analyze the{" "}
                      {tracksToReanalyzeIds.length} tracks on this page that are
                      missing audio features? This process might take a while
                      and consume server resources.
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
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
        {/* Error message display */}
        {bulkReanalyzeError && (
          <p className="text-xs text-red-600 dark:text-red-500 mt-1">
            {bulkReanalyzeError}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {error && historyItems.length > 0 && (
          <div className="mx-4 my-2 p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm sm:mx-6">
            <p>
              Could not fully refresh data. Displaying last known records.
              Error: {error}
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] pl-4 sm:pl-6">{null}</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Album</TableHead>
                <TableHead className="text-right pr-4 sm:pr-6">
                  Played At
                </TableHead>
                <TableHead className="w-[80px] text-center pr-4 sm:pr-6">
                  Details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && historyItems.length > 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              )}
              {historyItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="pl-4 sm:pl-6">
                    {item.track?.coverUrl ? (
                      <Image
                        src={item.track.coverUrl}
                        alt={item.track.title ?? "Track cover"}
                        width={56}
                        height={56}
                        className="rounded object-cover aspect-square"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded bg-muted flex items-center justify-center text-xs">
                        ?
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.track?.title || "Unknown Track"}
                  </TableCell>
                  <TableCell>
                    {item.track?.artist ? (
                      <Link
                        href={`/admin/artists/${item.track.artist.id}`}
                        className="hover:underline"
                      >
                        {item.track.artist.artistName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        Unknown Artist
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.track?.album ? (
                      <span title={item.track.album.title}>
                        {item.track.album.title.length > 30
                          ? `${item.track.album.title.substring(0, 30)}...`
                          : item.track.album.title}
                      </span>
                    ) : (
                      // Potential Link: <Link href={`/admin/albums/${item.track.album.id}`} className="hover:underline">...</Link>
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground pr-4 sm:pr-6">
                    <span title={format(new Date(item.createdAt), "Pp")}>
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    <br />
                    <span className="text-xs opacity-70">
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
                  <TableCell className="text-center py-2 align-middle pr-4 sm:pr-6">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {!loading && pagination.totalPages > 1 && (
        <div className="px-4 py-3 sm:px-6 border-t">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            hasNextPage={pagination.currentPage < pagination.totalPages}
            hasPrevPage={pagination.currentPage > 1}
          />
        </div>
      )}
      {selectedTrackForDetails && (
        <TrackDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
          track={selectedTrackForDetails as any}
          onSuccessfulReanalyze={handleSuccessfulReanalyze}
        />
      )}
    </Card>
  );
};
