"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/utils/api";
import type { User, UserListeningStats } from "@/types";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSystemPlaylistsTab } from "@/components/admin/users/UserSystemPlaylistsTab";
import { UserListeningHistoryTab } from "@/components/admin/users/UserListeningHistoryTab";
import GeneratePlaylistParamsModal from "@/components/admin/users/GeneratePlaylistParamsModal";

export default function UserSystemPlaylistDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { theme } = useTheme();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  const [systemPlaylistRefreshTrigger, setSystemPlaylistRefreshTrigger] =
    useState(0);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);

  // State for page-level listening stats
  const [pageLevelListeningStats, setPageLevelListeningStats] =
    useState<UserListeningStats | null>(null);
  const [
    isLoadingPageLevelListeningStats,
    setIsLoadingPageLevelListeningStats,
  ] = useState(true);
  const [pageLevelListeningStatsError, setPageLevelListeningStatsError] =
    useState<string | null>(null);

  const initialFeatureAvailability: Record<string, boolean> = {
    tempo: false,
    mood: false,
    key: false,
    danceability: false,
    energy: false,
    genres: false,
    artist: false,
  };
  // This state will hold the feature availability calculated from pageLevelListeningStats
  const [modalFeatureAvailability, setModalFeatureAvailability] = useState<
    Record<string, boolean>
  >(initialFeatureAvailability);

  const fetchInitialData = useCallback(async () => {
    if (!userId) return;
    setLoadingUser(true);
    setUserError(null);
    setIsLoadingPageLevelListeningStats(true);
    setPageLevelListeningStatsError(null);

    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("No authentication token found");

      // Fetch user details and listening stats in parallel
      const [fetchedUser, statsResponse] = await Promise.all([
        api.admin.getUserById(userId, token),
        api.admin.getUserListeningStats(userId, token),
      ]);

      setUser(fetchedUser);

      if (statsResponse && statsResponse.success && statsResponse.data) {
        setPageLevelListeningStats(statsResponse.data);
      } else {
        const errorMessage =
          statsResponse?.message || "Failed to fetch listening stats.";
        setPageLevelListeningStatsError(errorMessage);
        // toast.error(errorMessage); // Consider if toast is needed here or handled by UserListeningHistoryTab
        setPageLevelListeningStats(null);
      }
    } catch (err: any) {
      console.error("Error fetching initial data (user/stats):", err);
      const errorMessage = err.message || "Could not load initial data";
      setUserError(errorMessage); // Set userError if any part fails
      setPageLevelListeningStatsError(errorMessage); // Also set stats error
      toast.error(errorMessage);
    } finally {
      setLoadingUser(false);
      setIsLoadingPageLevelListeningStats(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Effect to calculate modalFeatureAvailability when pageLevelListeningStats changes
  useEffect(() => {
    if (pageLevelListeningStats) {
      const availability: Record<string, boolean> = {
        tempo:
          pageLevelListeningStats.tempo?.average !== null &&
          pageLevelListeningStats.tempo?.average !== undefined &&
          (pageLevelListeningStats.tempo?.count ?? 0) >= 2,
        mood:
          pageLevelListeningStats.topMoods &&
          pageLevelListeningStats.topMoods.length >= 2,
        key:
          pageLevelListeningStats.topKeys &&
          pageLevelListeningStats.topKeys.length >= 2,
        danceability:
          pageLevelListeningStats.danceability?.average !== null &&
          pageLevelListeningStats.danceability?.average !== undefined &&
          (pageLevelListeningStats.danceability?.count ?? 0) >= 2,
        energy:
          pageLevelListeningStats.energy?.average !== null &&
          pageLevelListeningStats.energy?.average !== undefined &&
          (pageLevelListeningStats.energy?.count ?? 0) >= 2,
        genres:
          pageLevelListeningStats.topGenres &&
          pageLevelListeningStats.topGenres.length >= 2,
        artist:
          pageLevelListeningStats.topArtists &&
          pageLevelListeningStats.topArtists.length >= 2,
      };
      setModalFeatureAvailability(availability);
    } else {
      // If stats are null (e.g., due to error or no data), reset to initial all-false
      setModalFeatureAvailability(initialFeatureAvailability);
    }
  }, [pageLevelListeningStats]); // Removed initialFeatureAvailability from deps

  const handleGenerateWithParams = async (params: {
    focusOnFeatures: string[];
    requestedTrackCount: number;
    playlistName?: string;
    playlistDescription?: string;
  }) => {
    if (!userId) return;
    setIsGeneratingPlaylist(true);
    const toastId = toast.loading("Generating System Playlist...");
    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("No authentication token found");

      // Tạo payload với tên trường đúng như backend mong đợi
      const apiPayload = {
        name: params.playlistName,
        description: params.playlistDescription,
        focusOnFeatures: params.focusOnFeatures,
        requestedTrackCount: params.requestedTrackCount,
      };

      const result: any = await api.admin.generateSystemPlaylistForUserByAdmin(
        userId,
        apiPayload, // Sử dụng payload đã được ánh xạ
        token
      );

      if (result && result.success && result.data) {
        if (result.data.name) {
          toast.success(
            `System Playlist "${result.data.name}" generated successfully!`,
            { id: toastId }
          );
          setIsParamsModalOpen(false);
          setSystemPlaylistRefreshTrigger((prev) => prev + 1);
        } else {
          toast.error(
            result.message ||
              "Playlist generated, but data is incomplete (missing name).",
            { id: toastId }
          );
        }
      } else {
        const errorMessage =
          result?.message ||
          "Failed to generate System Playlist. Please try again.";
        toast.error(errorMessage, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.", { id: toastId });
    } finally {
      setIsGeneratingPlaylist(false);
    }
  };

  const handleOpenParamsModal = () => {
    setIsParamsModalOpen(true);
  };

  const handleCloseParamsModal = () => {
    setIsParamsModalOpen(false);
  };

  // Combined loading state for initial page render
  const isLoadingInitialPageData =
    loadingUser || isLoadingPageLevelListeningStats;

  if (isLoadingInitialPageData && !user && !pageLevelListeningStats) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Display error if user details failed or stats failed significantly
  if (userError && !user) {
    // If user fetching failed, that's critical
    return (
      <div className="text-red-500 bg-red-500/10 p-4 rounded-lg m-4">
        Error: {userError}
      </div>
    );
  }
  // If user is loaded but stats failed, we might still want to show the page.
  // The UserListeningHistoryTab will show its own error for stats.
  // The GeneratePlaylistParamsModal will show "insufficient data" if modalFeatureAvailability is all false.

  if (!user) {
    // Fallback if somehow user is still null after loading checks
    return (
      <div className="text-center p-4">
        User not found or critical error loading user data.
      </div>
    );
  }

  return (
    <div
      className={`container mx-auto space-y-6 p-6 mb-16 md:mb-0 theme-${theme}`}
    >
      <div className="flex items-center mb-4">
        <Button
          variant="outline"
          size="sm"
          className="mr-4 h-9"
          onClick={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
      </div>

      <Card className="rounded-xl shadow-lg">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <img
                src={user.avatar || "/images/default-avatar.jpg"}
                alt={user.name || user.username || "User avatar"}
                className="h-16 w-16 rounded-full object-cover border-2 border-primary/30 shadow"
              />
              <div>
                <CardTitle className="text-xl font-bold text-foreground">
                  {user.name || user.username || "User Details"}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              onClick={handleOpenParamsModal}
              disabled={
                isGeneratingPlaylist || isLoadingPageLevelListeningStats
              } // Disable if stats are still loading for the modal
              size="sm"
              className="h-9"
            >
              {isGeneratingPlaylist || isLoadingPageLevelListeningStats ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create System Playlist
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="system-playlists" className="w-full">
            <div className="px-6 border-b">
              <TabsList className="h-11 w-full grid grid-cols-2">
                <TabsTrigger value="system-playlists" className="text-sm">
                  System Playlists
                </TabsTrigger>
                <TabsTrigger value="history" className="text-sm">
                  Listening History
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="p-6">
              <TabsContent value="system-playlists" className="mt-0">
                <UserSystemPlaylistsTab
                  userId={userId}
                  refreshTrigger={systemPlaylistRefreshTrigger}
                />
              </TabsContent>
              <TabsContent value="history" className="mt-0">
                <UserListeningHistoryTab
                  userId={userId}
                  // Pass initial stats data to UserListeningHistoryTab
                  initialStats={pageLevelListeningStats}
                  initialLoading={isLoadingPageLevelListeningStats}
                  initialError={pageLevelListeningStatsError}
                  // onStatsAvailabilityChange will be removed from UserListeningHistoryTab
                  refreshTrigger={systemPlaylistRefreshTrigger} // You might want a separate trigger for stats if needed
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <GeneratePlaylistParamsModal
        isOpen={isParamsModalOpen}
        onClose={handleCloseParamsModal}
        onGenerate={handleGenerateWithParams}
        isLoading={isGeneratingPlaylist}
        featureAvailability={modalFeatureAvailability} // Use the state calculated from page-level stats
      />
    </div>
  );
}
