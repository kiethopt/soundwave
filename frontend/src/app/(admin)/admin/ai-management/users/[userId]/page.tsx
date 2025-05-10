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

import { UserAiPlaylistsTab } from "@/components/admin/users/UserAiPlaylistsTab";
import { UserListeningHistoryTab } from "@/components/admin/users/UserListeningHistoryTab";

export default function UserDetailPageAiManagement() {
  // Renamed component
  const params = useParams();
  const userId = params.userId as string;
  const { theme } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPlaylist, setGeneratingPlaylist] = useState(false);
  const [playlistRefreshTrigger, setPlaylistRefreshTrigger] = useState(0); // State to trigger refresh

  // Wrap fetchUserDetails in useCallback
  const fetchUserDetails = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("No authentication token found");
      // Assuming api.admin.getUserById exists and is configured in @/utils/api
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
  }, [fetchUserDetails]); // Use fetchUserDetails directly

  const handleGeneratePlaylist = async () => {
    if (!userId) return;
    setGeneratingPlaylist(true);
    const toastId = toast.loading("Generating AI Playlist...");
    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("No authentication token found");
      // Assuming api.admin.generateUserAiPlaylist exists in @/utils/api
      const result = await api.admin.generateUserAiPlaylist(userId, token);
      toast.success(
        `Successfully generated AI playlist: ${result.playlist.name}`,
        { id: toastId }
      );
      // Trigger refresh for the playlist tab
      setPlaylistRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error generating AI playlist:", err);
      toast.error(err.message || "Failed to generate AI playlist.", {
        id: toastId,
      });
    } finally {
      setGeneratingPlaylist(false);
    }
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
    <div className={`container mx-auto space-y-6 p-6 mb-16 md:mb-0 theme-${theme}`}>
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
              onClick={handleGeneratePlaylist}
              disabled={generatingPlaylist}
              size="sm"
              className="h-9"
            >
              {generatingPlaylist ? (
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
                <TabsTrigger value="ai-playlists" className="text-sm">AI Playlists</TabsTrigger>
                <TabsTrigger value="history" className="text-sm">Listening History</TabsTrigger>
              </TabsList>
            </div>
            <div className="p-6">
              <TabsContent value="ai-playlists" className="mt-0">
                <UserAiPlaylistsTab
                  userId={userId}
                  refreshTrigger={playlistRefreshTrigger}
                />
              </TabsContent>
              <TabsContent value="history" className="mt-0">
                <UserListeningHistoryTab userId={userId} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
