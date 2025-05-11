"use client";

import { useParams } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/utils/api";
import type { User } from "@/types";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSystemPlaylistsTab } from "@/components/admin/users/UserAiPlaylistsTab";
import { UserListeningHistoryTab } from "@/components/admin/users/UserListeningHistoryTab";
import GeneratePlaylistParamsModal from "@/components/admin/users/GeneratePlaylistParamsModal";

export default function UserSystemPlaylistDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const { theme } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  const [systemPlaylistRefreshTrigger, setSystemPlaylistRefreshTrigger] =
    useState(0);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);

  const fetchUserDetails = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("No authentication token found");
      const fetchedUser = await api.admin.getUserById(userId, token);
      setUser(fetchedUser);
    } catch (err: any) {
      console.error("Error fetching user details:", err);
      setError(err.message || "Could not load user details");
      toast.error(err.message || "Could not load user details");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const handleGenerateWithParams = async (params: {
    customPromptKeywords: string;
    requestedTrackCount: number;
  }) => {
    if (!userId) return;
    setIsGeneratingPlaylist(true);
    const toastId = toast.loading("Generating System Playlist...");
    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("No authentication token found");

      const result = await api.admin.generateSystemPlaylist(
        userId,
        params,
        token
      );

      toast.success(
        `Successfully generated playlist: ${result.playlist.name}`,
        { id: toastId }
      );
      setSystemPlaylistRefreshTrigger((prev) => prev + 1);
      setIsParamsModalOpen(false);
    } catch (err: any) {
      console.error("Error generating system playlist:", err);
      let errorMessage = "Failed to generate system playlist.";
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      toast.error(errorMessage, { id: toastId });
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 bg-red-500/10 p-4 rounded-lg m-4">
        Error: {error}
      </div>
    );
  }

  if (!user) {
    return <div className="text-center p-4">User not found.</div>;
  }

  return (
    <div
      className={`container mx-auto space-y-6 p-6 mb-16 md:mb-0 theme-${theme}`}
    >
      <Card className="rounded-xl shadow-lg">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-foreground">
                {user.name || user.username || "User Details"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            </div>
            <Button
              onClick={handleOpenParamsModal}
              disabled={isGeneratingPlaylist}
              size="sm"
              className="h-9"
            >
              {isGeneratingPlaylist ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Generate AI Playlist
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="ai-playlists" className="w-full">
            <div className="px-6 border-b">
              <TabsList className="h-11 w-full grid grid-cols-2">
                <TabsTrigger value="ai-playlists" className="text-sm">
                  AI Playlists
                </TabsTrigger>
                <TabsTrigger value="history" className="text-sm">
                  Listening History
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="p-6">
              <TabsContent value="ai-playlists" className="mt-0">
                <UserSystemPlaylistsTab
                  userId={userId}
                  refreshTrigger={systemPlaylistRefreshTrigger}
                />
              </TabsContent>
              <TabsContent value="history" className="mt-0">
                <UserListeningHistoryTab userId={userId} />
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
      />
    </div>
  );
}
