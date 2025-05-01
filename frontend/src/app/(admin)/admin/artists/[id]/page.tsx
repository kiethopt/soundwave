"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import type { ArtistProfile, Album, Track } from "@/types";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Facebook,
  Instagram,
} from "@/components/ui/Icons";
import { Button } from "@/components/ui/button";
import { EditTrackModal, ConfirmDeleteModal, EditAlbumModal, EditArtistModal } from "@/components/ui/admin-modals";
import toast from 'react-hot-toast';

export default function ArtistDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: artistId } = use(params);
  const router = useRouter();
  const { theme } = useTheme();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditArtistModalOpen, setIsEditArtistModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'albums' | 'tracks'>('albums');

  // State for modals
  const [isEditTrackModalOpen, setIsEditTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isEditAlbumModalOpen, setIsEditAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'album' | 'track' } | null>(null);

  const fetchArtist = useCallback(async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("userToken");
        if (!token) {
          throw new Error("Authentication token not found");
        }
        if (!artistId) {
          throw new Error("Artist ID is missing");
        }
        const data = await api.admin.getArtistById(artistId, token);
        setArtist(data);
      } catch (err) {
        console.error("Error fetching artist:", err);
      setError(err instanceof Error ? err.message : "Failed to load artist details");
      } finally {
        setLoading(false);
      }
  }, [artistId]);

  useEffect(() => {
    if (artistId) fetchArtist();
    else {
      setError("Artist ID not found in URL");
      setLoading(false);
    }
  }, [artistId, fetchArtist]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("vi-VN");
    } catch {
      return "Invalid Date";
    }
  };

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
      return "0:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Handler for submitting track edit
  const handleEditTrackSubmit = async (trackId: string, formData: FormData) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    try {
      await api.tracks.update(trackId, formData, token);
      toast.success('Track updated successfully!');
      setIsEditTrackModalOpen(false);
      setEditingTrack(null);
      fetchArtist();
    } catch (err: any) {
      console.error('Error updating track:', err);
      toast.error(err.message || 'Failed to update track.');
    }
  };

  // Handler for submitting album edit
  const handleEditAlbumSubmit = async (albumId: string, formData: FormData) => {
    const token = localStorage.getItem('userToken');
      if (!token) {
      toast.error('Authentication required.');
        return;
      }
    try {
      await api.albums.update(albumId, formData, token);
      toast.success('Album updated successfully!');
      setIsEditAlbumModalOpen(false);
      setEditingAlbum(null);
      fetchArtist();
    } catch (err: any) {
      console.error('Error updating album:', err);
      toast.error(err.message || 'Failed to update album.');
    }
  };

  // Handler for confirming deletion
  const handleDeleteConfirm = async (ids: string[]) => {
    if (!itemToDelete) return;

    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      return;
    }

    const { id, type, name } = itemToDelete;

    try {
      if (type === 'album') {
        await api.albums.delete(id, token);
        toast.success(`Album "${name}" deleted successfully.`);
      } else if (type === 'track') {
        await api.tracks.delete(id, token);
        toast.success(`Track "${name}" deleted successfully.`);
      }
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchArtist();
    } catch (err: any) {
      console.error(`Error deleting ${type}:`, err);
      toast.error(err.message || `Failed to delete ${type}.`);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // Handler for submitting artist edit
  const handleEditArtistSubmit = async (artistId: string, formData: FormData) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    try {
      await api.admin.updateArtist(artistId, formData, token);
      toast.success('Artist updated successfully!');
      setIsEditArtistModalOpen(false);
      fetchArtist(); // Refetch artist data
    } catch (err: any) {
      console.error('Error updating artist:', err);
      toast.error(err.message || 'Failed to update artist.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error || "Artist not found"}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 pb-20">
      {/* Back Button */}
      <div className="w-fit mb-2">
        <button
          onClick={() => router.back()}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            theme === "light"
              ? "bg-gray-100 hover:bg-gray-200 text-black"
              : "bg-white/10 hover:bg-white/15 text-white"
          }`}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1" />
          <span>Back</span>
        </button>
      </div>

      {/* Artist Info Card */}
          <div
        className={`rounded-lg shadow-md p-6 mb-6 ${
              theme === "light" ? "bg-white" : "bg-gray-800"
        }`}
          >
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="w-full md:w-1/4 flex-shrink-0">
            <div className="relative aspect-square rounded-lg overflow-hidden shadow-md">
              <Image
                src={artist.avatar || "/placeholder.svg?height=300&width=300"}
                alt={artist.artistName}
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="w-full md:w-3/4">
            <div className="flex justify-between items-center mb-4">
              <h2
                className={`text-3xl font-bold ${
                  theme === "light" ? "text-gray-900" : "text-gray-100"
                }`}
              >
                {artist.artistName}
              </h2>
              <Button
                  variant="ghost"
                  size="icon"
                  className={`text-blue-600 hover:bg-blue-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-blue-500/20' : 'hover:bg-blue-100'}`}
                  onClick={() => setIsEditArtistModalOpen(true)}
                  aria-label={`Edit artist ${artist.artistName}`}
                  disabled={loading}
                >
                  <Edit className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 mb-4">
              {/* User Name */}
              {artist.user?.name && (
                <div>
                  <span className={`text-sm font-medium ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                    User Name
                  </span>
                  <p className={`${theme === "light" ? "text-gray-900" : "text-gray-100"}`}>
                    {artist.user.name}
                  </p>
                </div>
              )}

              {/* Email */}
              {artist.user?.email && (
                <div>
                  <span className={`text-sm font-medium ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                    Email
                  </span>
                  <p className={`${theme === "light" ? "text-gray-900" : "text-gray-100"}`}>
                    {artist.user.email}
                  </p>
                </div>
              )}

              {/* Monthly Listeners */}
              {artist.monthlyListeners > 0 && (
                <div>
                  <span className={`text-sm font-medium ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                    Monthly Listeners
                  </span>
                  <p className={`${theme === "light" ? "text-gray-900" : "text-gray-100"}`}>
                    {artist.monthlyListeners.toLocaleString()}
                  </p>
                </div>
              )}

              {/* Active Status */}
              {artist.isActive !== undefined && (
                <div>
                  <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    Account Status
                  </span>
                  <p className={artist.isActive ? 'text-green-500' : 'text-red-500'}>
                    {artist.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              )}
               
               {/* Created At */}
               {artist.createdAt && (
                <div>
                  <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    Joined
                  </span>
                  <p className={`${theme === 'light' ? 'text-gray-900' : 'text-gray-100'}`}>
                    {formatDate(artist.createdAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Bio */}
            {artist.bio && (
              <div className="mb-4">
                <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Bio
                </span>
                <p className={`mt-1 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {artist.bio}
                </p>
              </div>
            )}

            {/* Social Media  */}
            {artist.socialMediaLinks && (artist.socialMediaLinks.facebook || artist.socialMediaLinks.instagram) && (
              <div className="mb-4">
                <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Social Media
                </span>
                <div className="flex flex-col space-y-1 mt-1">
                  {artist.socialMediaLinks.facebook && (
                    <div className="flex items-center gap-2">
                      <Facebook className={`w-4 h-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} />
                      <a 
                        href={artist.socialMediaLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm hover:underline ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}
                      >
                        {artist.socialMediaLinks.facebook.replace(/^(https?:\/\/)?(www\.)?(facebook\.com|instagram\.com)\//, '')}
                      </a>
                    </div>
                  )}
                  {artist.socialMediaLinks.instagram && (
                    <div className="flex items-center gap-2">
                      <Instagram className={`w-4 h-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} />
                      <a 
                        href={artist.socialMediaLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm hover:underline ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}
                      >
                        {artist.socialMediaLinks.instagram.replace(/^(https?:\/\/)?(www\.)?(facebook\.com|instagram\.com)\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Genres */}
            {artist.genres && artist.genres.length > 0 && (
              <div>
                <span className={`text-sm font-medium ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}>
                  Genres
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {artist.genres.map((genreItem) => (
                    <span
                      key={genreItem.genre.id}
                      className={`px-2 py-1 rounded-full text-xs ${
                        theme === "light"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-gray-700 text-gray-200"
                      }`}
                    >
                      {genreItem.genre.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
              </div>
            </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-4 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'albums'
              ? `border-b-2 border-blue-500 ${theme === 'light' ? 'text-black' : 'text-white'}`
              : `${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`
          }`}
          onClick={() => setActiveTab('albums')}
        >
          Albums ({artist.albums?.length || 0})
        </button>
                  <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'tracks'
              ? `border-b-2 border-blue-500 ${theme === 'light' ? 'text-black' : 'text-white'}`
              : `${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`
          }`}
          onClick={() => setActiveTab('tracks')}
        >
          Tracks ({artist.tracks?.length || 0})
                  </button>
              </div>

      {/* Albums Table */}
      {activeTab === 'albums' && (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
          <table className={`w-full text-sm text-left ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <thead className={`text-xs uppercase ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
              <tr>
                <th scope="col" className="py-3 px-6">Title</th>
                <th scope="col" className="py-3 px-6">Release Date</th>
                <th scope="col" className="py-3 px-6">Type</th>
                <th scope="col" className="py-3 px-6">Tracks</th>
                <th scope="col" className="py-3 px-6">Duration</th>
                <th scope="col" className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {artist.albums && artist.albums.length > 0 ? (
                artist.albums.map((album) => (
                  <tr 
                    key={album.id}
                    className={`border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                  >
                    <td className={`py-4 px-6 font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center gap-3">
                        <img
                          src={album.coverUrl || "/placeholder.svg"}
                          alt={album.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                            {album.title}
                      </div>
                    </td>
                    <td className="py-4 px-6">{formatDate(album.releaseDate)}</td>
                    <td className="py-4 px-6">{album.type}</td>
                    <td className="py-4 px-6">{album.totalTracks}</td>
                    <td className="py-4 px-6">{formatDuration(album.duration)}</td>
                    <td className="py-4 px-6 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`text-blue-600 hover:bg-blue-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-blue-500/20' : 'hover:bg-blue-100'}`}
                        aria-label={`Edit album ${album.title}`}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingAlbum(album);
                            setIsEditAlbumModalOpen(true);
                        }}
                        disabled={loading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ml-1 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                        aria-label={`Delete album ${album.title}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete({ id: album.id, name: album.title, type: 'album' });
                            setIsDeleteModalOpen(true);
                        }}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 px-6 text-center">No albums found for this artist.</td>
                </tr>
              )}
            </tbody>
          </table>
                    </div>
      )}
      
      {/* Tracks Table */}
      {activeTab === 'tracks' && (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
          <table className={`w-full text-sm text-left ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <thead className={`text-xs uppercase ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
              <tr>
                <th scope="col" className="py-3 px-6">Title</th>
                <th scope="col" className="py-3 px-6">Album</th>
                <th scope="col" className="py-3 px-6">Release Date</th>
                <th scope="col" className="py-3 px-6">Duration</th>
                <th scope="col" className="py-3 px-6">Plays</th>
                <th scope="col" className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {artist.tracks && artist.tracks.length > 0 ? (
                artist.tracks.map((track) => (
                  <tr 
                    key={track.id}
                    className={`border-b ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                  >
                    <td className={`py-4 px-6 font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center gap-3">
                        <img
                          src={track.coverUrl || "/placeholder.svg"}
                          alt={track.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                            {track.title}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {track.album ? track.album.title : "Single"}
                    </td>
                    <td className="py-4 px-6">{formatDate(track.releaseDate)}</td>
                    <td className="py-4 px-6">{formatDuration(track.duration)}</td>
                    <td className="py-4 px-6">{track.playCount.toLocaleString()}</td>
                    <td className="py-4 px-6 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`text-blue-600 hover:bg-blue-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-blue-500/20' : 'hover:bg-blue-100'}`}
                        aria-label={`Edit track ${track.title}`}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingTrack(track); 
                          setIsEditTrackModalOpen(true); 
                        }}
                        disabled={loading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ml-1 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                        aria-label={`Delete track ${track.title}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete({ id: track.id, name: track.title, type: 'track' });
                            setIsDeleteModalOpen(true);
                        }}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 px-6 text-center">No tracks found for this artist.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {isEditArtistModalOpen && (
        <EditArtistModal
          artist={artist}
          isOpen={isEditArtistModalOpen}
          onClose={() => setIsEditArtistModalOpen(false)}
          onSubmit={handleEditArtistSubmit}
          theme={theme}
        />
      )}

      {/* Edit Track Modal */}
      {isEditTrackModalOpen && editingTrack && (
        <EditTrackModal
          track={editingTrack}
          isOpen={isEditTrackModalOpen}
          onClose={() => {
            setIsEditTrackModalOpen(false);
            setEditingTrack(null);
          }}
          onSubmit={handleEditTrackSubmit}
          theme={theme}
        />
      )}

      {/* Edit Album Modal */}
      {isEditAlbumModalOpen && editingAlbum && (
          <EditAlbumModal
            album={editingAlbum}
            isOpen={isEditAlbumModalOpen}
            onClose={() => {
                setIsEditAlbumModalOpen(false);
                setEditingAlbum(null);
            }}
            onSubmit={handleEditAlbumSubmit}
        theme={theme}
      />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && itemToDelete && (
        <ConfirmDeleteModal
          item={{
            id: itemToDelete.id,
            name: itemToDelete.name,
            // ConfirmDeleteModal might not need email, adjust as necessary
            email: '', // Provide a dummy or adjust modal if email not relevant
          }}
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
          }}
          onConfirm={() => handleDeleteConfirm([itemToDelete.id])} // Pass ID in array if modal expects array
          theme={theme}
          entityType={itemToDelete.type} // Pass the type (album/track)
        />
      )}
    </div>
  );
}
