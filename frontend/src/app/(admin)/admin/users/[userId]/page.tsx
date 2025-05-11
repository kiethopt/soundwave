"use client";

import { useParams } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
// Shadcn UI imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/utils/api";
import type { User } from "@/types";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

// Import the newly created tab component
import { UserSystemPlaylistsTab } from "@/components/admin/users/UserSystemPlaylistsTab";
// Import the new history tab component
import { UserListeningHistoryTab } from "@/components/admin/users/UserListeningHistoryTab";

// Placeholder for Listening History Tab (to be moved/implemented)
// const UserListeningHistoryTab = ({ userId }: { userId: string }) => {
//   return (
//     <div className="p-4 mt-4 border rounded-lg">
//       <h3 className="font-semibold mb-4">Listening History</h3>
//       <p className="text-sm text-muted-foreground">
//         Placeholder content for Listening History (User ID: {userId}). Table
//         with history entries will go here.
//       </p>
//     </div>
//   );
// };

export default function UserDetailPageAdmin() {
  const params = useParams();
  const userId = params.userId as string;
  const { theme } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  const [playlistRefreshTrigger, setPlaylistRefreshTrigger] = useState(0);
  const [listeningHistoryTotalItems, setListeningHistoryTotalItems] = useState<
    number | null
  >(null);

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

  const handleGeneratePlaylist = async () => {
    if (!userId) return;
    setIsGeneratingPlaylist(true);
    const toastId = toast.loading("Generating System Playlist...");
    try {
      // Token is handled by fetchWithAuth internally by api.ts
      const result = await api.admin.generateSystemPlaylist(userId, undefined);

      toast.success(
        `Successfully generated playlist: ${result.playlist.name}`,
        { id: toastId }
      );
      setPlaylistRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error generating playlist:", err);
      if (
        err.response &&
        err.response.status === 400 &&
        err.response.data &&
        err.response.data.message
      ) {
        toast.error(err.response.data.message, { id: toastId, duration: 6000 });
      } else if (err.message) {
        toast.error(err.message, { id: toastId });
      } else {
        toast.error("Failed to generate playlist. An unknown error occurred.", {
          id: toastId,
        });
      }
    } finally {
      setIsGeneratingPlaylist(false);
    }
  };

  const handleHistoryTotalItemsChange = useCallback((total: number) => {
    setListeningHistoryTotalItems(total);
  }, []);

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
      className={`container mx-auto space-y-6 p-4 mb-16 md:mb-0 theme-${theme}`}
    >
      {/* User Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            {user.name || user.username || "User Details"}
          </h1>
          <p className="text-sm text-secondary">{user.email}</p>
          {/* You can add more user details here like Role, Status, Joined Date etc. */}
          {/* Example: <p className="text-xs text-muted-foreground">Role: {user.role} | Status: {user.isActive ? 'Active' : 'Inactive'}</p> */}
        </div>
        <div>
          <Button
            onClick={handleGeneratePlaylist}
            disabled={isGeneratingPlaylist}
          >
            {isGeneratingPlaylist ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Generate System Playlist
          </Button>
          {/* Consider adding an "Edit User" button here linking to an edit modal/page */}
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="system-playlists" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system-playlists">System Playlists</TabsTrigger>
          <TabsTrigger value="history">
            Lịch sử nghe
            {listeningHistoryTotalItems !== null &&
              ` (${listeningHistoryTotalItems})`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="system-playlists" className="mt-4">
          <UserSystemPlaylistsTab
            userId={userId}
            refreshTrigger={playlistRefreshTrigger}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <UserListeningHistoryTab
            userId={userId}
            onTotalItemsChange={handleHistoryTotalItemsChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
