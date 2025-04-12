import { ColumnDef } from '@tanstack/react-table';
import {
  Track,
  Album,
  Genre,
  ArtistProfile,
  User,
  ArtistRequest,
  Label,
  Playlist,
} from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MoreVertical,
  Eye,
  EyeOff,
  Trash2,
  Music,
  Pencil,
  MoreHorizontal,
  Check,
  X,
  Ban,
  CheckCircle,
  Trash,
  Tags,
  Twitter,
  Facebook,
  Instagram,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import Link from 'next/link';
import React, { Fragment, useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { ArtistInfoModal } from './data-table-modals';
import { AddSimple, Edit, UserIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/badge';
import { format, formatDistance } from 'date-fns';
import { Verified } from '@/components/ui/Icons';

interface GetTrackColumnsOptions {
  theme?: 'light' | 'dark';
  onVisibilityChange?: (id: string, isActive: boolean) => Promise<void>;
  onDelete?: (id: string | string[]) => Promise<void>;
  onEdit?: (track: Track) => void;
  formatReleaseTime?: (date: string) => string;
  onViewDetails?: (track: Track) => void;
}

interface GetAlbumColumnsOptions {
  theme?: 'light' | 'dark';
  onVisibilityChange?: (id: string, isActive: boolean) => Promise<void>;
  onDelete?: (id: string | string[]) => Promise<void>;
  onEdit?: (album: Album) => void;
  formatReleaseTime?: (date: string) => string;
  onViewDetails?: (album: Album) => void;
}

interface GetUserColumnsOptions {
  theme?: 'light' | 'dark';
  onStatusChange?: (id: string, isActive: boolean) => Promise<void>;
  onDelete?: (id: string | string[]) => Promise<void>;
  onEdit?: (user: User) => void;
  onView?: (user: User) => void;
}

interface GetGenreColumnsOptions {
  theme?: 'light' | 'dark';
  onDelete?: (id: string | string[]) => Promise<void>;
  onEdit?: (genre: Genre) => void;
}

interface GetArtistColumnsOptions {
  theme?: 'light' | 'dark';
  onStatusChange?: (id: string, isActive: boolean) => Promise<void>;
  onDelete?: (id: string | string[]) => Promise<void>;
  loading?: boolean;
  actionLoading?: string | null;
}

interface GetLabelColumnsOptions {
  theme?: 'light' | 'dark';
  onDelete?: (id: string | string[]) => Promise<void>;
  onEdit?: (label: Label) => void;
}

interface GetSystemPlaylistColumnsOptions {
  theme?: 'light' | 'dark';
  onDelete?: (id: string | string[]) => Promise<void>;
  onEdit?: (playlist: Playlist) => void;
  formatUpdatedAt?: (date: string) => string;
}
const getUserRole = () => {
  const token = localStorage.getItem('userToken');
  if (!token) return 'USER'; // Mặc định là USER nếu không có token
  try {
    const decodedToken = JSON.parse(atob(token.split('.')[1])); // Giải mã JWT
    return decodedToken.role || 'USER';
  } catch (error) {
    console.error('Error decoding token:', error);
    return 'USER'; // Trả về mặc định nếu có lỗi
  }
};
export function getTrackColumns({
  theme = 'light',
  onVisibilityChange,
  onDelete,
  onEdit,
  formatReleaseTime,
  onViewDetails,
}: GetTrackColumnsOptions): ColumnDef<Track>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
          }}
          aria-label="Select row"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const track = row.original;
        return (
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onViewDetails?.(track)}
          >
            <div
              className={`w-8 h-8 rounded overflow-hidden ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                }`}
            >
              {track.coverUrl ? (
                <Image
                  src={track.coverUrl}
                  alt={track.title}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Music
                  className={`w-8 h-8 p-1.5 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                    }`}
                />
              )}
            </div>
            <div>
              <div
                className={`font-medium ${theme === 'dark' ? 'text-white' : ''
                  }`}
              >
                {track.title}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'album',
      header: 'Album',
      cell: ({ row }) => {
        const album = row.original.album;
        return album ? (
          <Link
            href={`/artist/albums/${album.id}`}
            className={`font-semibold text-[#A57865] hover:underline`}
          >
            {album.title}
          </Link>
        ) : (
          <span
            className={theme === 'dark' ? 'text-white/50' : 'text-gray-500'}
          >
            -
          </span>
        );
      },
    },
    {
      accessorKey: 'featuredArtists',
      header: 'Featured Artists',
      cell: ({ row }) => {
        const [selectedArtist, setSelectedArtist] = useState<any>(null);
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [isLoading, setIsLoading] = useState(false);
        const [loadingArtistId, setLoadingArtistId] = useState<string | null>(
          null
        );

        const featuredArtists = row.original.featuredArtists;

        const handleArtistClick = async (artistId: string) => {
          try {
            setLoadingArtistId(artistId);
            setIsLoading(true);
            const token = localStorage.getItem('userToken');
            if (!token) return;

            const artistData = await api.artists.getArtistById(artistId, token);
            setSelectedArtist(artistData);
            setIsModalOpen(true);
          } catch (error) {
            console.error('Failed to fetch artist details:', error);
          } finally {
            setIsLoading(false);
            setLoadingArtistId(null);
          }
        };

        return (
          <div className="relative">
            {featuredArtists && featuredArtists.length > 0 ? (
              <div className="space-y-1">
                {featuredArtists.map((fa, index) => (
                  <div key={fa.artistProfile.id} className="flex items-center">
                    <button
                      onClick={() => handleArtistClick(fa.artistProfile.id)}
                      className="text-[#A57865] font-medium hover:underline focus:outline-none relative"
                      disabled={isLoading}
                    >
                      {fa.artistProfile.artistName}
                      {isLoading && loadingArtistId === fa.artistProfile.id && (
                        <span className="ml-2 inline-block w-3 h-3 border-t-2 border-r-2 border-[#A57865] rounded-full animate-spin"></span>
                      )}
                    </button>
                    {index < featuredArtists.length - 1 && (
                      <span
                        className={
                          theme === 'dark' ? 'text-white/50' : 'text-gray-500'
                        }
                      >
                        ,&nbsp;
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span
                className={theme === 'dark' ? 'text-white/50' : 'text-gray-500'}
              >
                -
              </span>
            )}

            {selectedArtist && (
              <ArtistInfoModal
                artist={selectedArtist}
                isOpen={isModalOpen}
                onClose={() => {
                  setIsModalOpen(false);
                  setTimeout(() => setSelectedArtist(null), 300);
                }}
                theme={theme}
              />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'genres',
      header: 'Genres',
      cell: ({ row }) => {
        const genres = row.original.genres;
        return genres && genres.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {genres.map((g, index) => (
              <Fragment key={g.genre.id}>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${theme === 'dark'
                    ? 'bg-white/10 text-white/80'
                    : 'bg-gray-100 text-gray-700'
                    }`}
                >
                  {g.genre.name}
                </span>
                {index < genres.length - 1 && ' '}
              </Fragment>
            ))}
          </div>
        ) : (
          <span
            className={theme === 'dark' ? 'text-white/50' : 'text-gray-500'}
          >
            -
          </span>
        );
      },
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => {
        const duration = row.original.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return (
          <span className={theme === 'dark' ? 'text-white' : ''}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.isActive
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
            }`}
        >
          {row.original.isActive ? 'Active' : 'Hidden'}
        </span>
      ),
    },
    {
      accessorKey: 'releaseDate',
      header: 'Release Date',
      cell: ({ row }) => {
        const releaseDate = row.original.releaseDate;
        const [timeDisplay, setTimeDisplay] = useState<string>('');
        const track = row.original;

        useEffect(() => {
          // Tính toán và hiển thị thời gian đếm ngược
          const calculateTimeRemaining = () => {
            const now = new Date();
            const release = new Date(releaseDate);

            // Nếu đã phát hành, hiển thị ngày phát hành
            if (release <= now) {
              return new Date(releaseDate).toLocaleString();
            }

            // Tính toán thời gian còn lại
            const diff = release.getTime() - now.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
              (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            );
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (days > 0) {
              return `${days}d ${hours}h ${minutes}m ${seconds}s`;
            } else if (hours > 0) {
              return `${hours}h ${minutes}m ${seconds}s`;
            } else {
              return `${minutes}m ${seconds}s`;
            }
          };

          // Cập nhật ban đầu
          setTimeDisplay(calculateTimeRemaining());

          // Cập nhật mỗi giây
          const timer = setInterval(() => {
            const now = new Date();
            const release = new Date(releaseDate);

            // Kiểm tra nếu vừa đến thời điểm phát hành và track chưa active
           // if (release <= now && !track.isActive) {
              // Đơn giản nhất: reload trang
            //  window.location.reload();
           // }

            setTimeDisplay(calculateTimeRemaining());
          }, 1000);

          // Dọn dẹp khi component unmount
          return () => clearInterval(timer);
        }, [releaseDate, track.isActive]);

        return (
          <span className={theme === 'dark' ? 'text-white' : ''}>
            {timeDisplay}
          </span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const track = row.original;
        const userRole = getUserRole(); // Sử dụng hàm trong cùng file

        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit && onEdit(track)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Track
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onVisibilityChange &&
                  onVisibilityChange(track.id, track.isActive)
                }
              >
                {track.isActive ? (
                  <EyeOff className="w-4 h-4 mr-2" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {track.isActive ? 'Hide Track' : 'Show Track'}
              </DropdownMenuItem>
              {userRole === 'ADMIN' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete && onDelete(track.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Track
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function getAlbumColumns({
  theme = 'light',
  onVisibilityChange,
  onDelete,
  onEdit,
  onViewDetails,
}: GetAlbumColumnsOptions): ColumnDef<Album>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
          }}
          aria-label="Select row"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: 'Album',
      cell: ({ row }) => {
        const album = row.original;
        return (
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onViewDetails?.(album)}
          >
            <div
              className={`w-8 h-8 rounded overflow-hidden ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                }`}
            >
              {album.coverUrl ? (
                <Image
                  src={album.coverUrl}
                  alt={album.title}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Music
                  className={`w-8 h-8 p-1.5 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                    }`}
                />
              )}
            </div>
            <div>
              <div
                className={`font-medium ${theme === 'dark' ? 'text-white' : ''
                  }`}
              >
                {album.title}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.type === 'ALBUM'
            ? 'bg-blue-500/20 text-blue-400'
            : row.original.type === 'EP'
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-green-500/20 text-green-400'
            }`}
        >
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'totalTracks',
      header: 'Tracks',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {row.original.totalTracks}
        </span>
      ),
    },
    {
      accessorKey: 'genres',
      header: 'Genres',
      cell: ({ row }) => {
        const genres = row.original.genres;
        return genres && genres.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {genres.map((genreObj) => (
              <span
                key={genreObj.genre.id}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${theme === 'dark'
                  ? 'bg-white/10 text-white'
                  : 'bg-gray-100 text-gray-800'
                  }`}
              >
                {genreObj.genre.name}
              </span>
            ))}
          </div>
        ) : (
          <span
            className={theme === 'dark' ? 'text-white/50' : 'text-gray-500'}
          >
            -
          </span>
        );
      },
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {Math.floor(row.original.duration / 60)}:
          {(row.original.duration % 60).toString().padStart(2, '0')}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.isActive
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
            }`}
        >
          {row.original.isActive ? 'Active' : 'Hidden'}
        </span>
      ),
    },
    {
      accessorKey: 'releaseDate',
      header: 'Release Date',
      cell: ({ row }) => {
        const releaseDate = row.original.releaseDate;
        const [timeDisplay, setTimeDisplay] = useState<string>('');
        const album = row.original;

        useEffect(() => {
          // Tính toán và hiển thị thời gian đếm ngược
          const calculateTimeRemaining = () => {
            const now = new Date();
            const release = new Date(releaseDate);

            // Nếu đã phát hành, hiển thị ngày phát hành
            if (release <= now) {
              return new Date(releaseDate).toLocaleString();
            }

            // Tính toán thời gian còn lại
            const diff = release.getTime() - now.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
              (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            );
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (days > 0) {
              return `${days}d ${hours}h ${minutes}m ${seconds}s`;
            } else if (hours > 0) {
              return `${hours}h ${minutes}m ${seconds}s`;
            } else {
              return `${minutes}m ${seconds}s`;
            }
          };

          // Cập nhật ban đầu
          setTimeDisplay(calculateTimeRemaining());

          // Cập nhật mỗi giây
          const timer = setInterval(() => {
            const now = new Date();
            const release = new Date(releaseDate);

            // Kiểm tra nếu vừa đến thời điểm phát hành và album chưa active
          //  if (release <= now && !album.isActive) {
          //    // Đơn giản nhất: reload trang
          //    window.location.reload();
           // }

            setTimeDisplay(calculateTimeRemaining());
          }, 1000);

          // Dọn dẹp khi component unmount
          return () => clearInterval(timer);
        }, [releaseDate, album.isActive]);

        return (
          <span className={theme === 'dark' ? 'text-white' : ''}>
            {timeDisplay}
          </span>
        );
      },
    },

    {
      id: 'actions',
      cell: ({ row }) => {
        const album = row.original;
        const userRole = getUserRole(); // Lấy vai trò người dùng

        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Edit - Hiển thị cho cả ARTIST và ADMIN */}
              <DropdownMenuItem onClick={() => onEdit && onEdit(album)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Album
              </DropdownMenuItem>

              {/* Hide/Show - Hiển thị cho cả ARTIST và ADMIN */}
              <DropdownMenuItem
                onClick={() =>
                  onVisibilityChange &&
                  onVisibilityChange(album.id, album.isActive)
                }
              >
                {album.isActive ? (
                  <EyeOff className="w-4 h-4 mr-2" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {album.isActive ? 'Hide Album' : 'Show Album'}
              </DropdownMenuItem>

              {/* Delete - Chỉ hiển thị cho ADMIN */}
              {userRole === 'ADMIN' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete && onDelete(album.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Album
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function getUserColumns({
  theme = 'light',
  onEdit,
  onDelete,
  onView,
  onStatusChange,
}: GetUserColumnsOptions): ColumnDef<User>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className={theme === 'dark' ? 'border-white/50' : ''}
          onClick={(e) => e.stopPropagation()} // ngăn sự kiện click lan ra row
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onView && onView(user)}
          >
            <div
              className={`w-8 h-8 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                }`}
            >
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name || 'User avatar'}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <UserIcon
                  className={`w-8 h-8 p-1.5 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                    }`}
                />
              )}
            </div>
            <div>
              <div
                className={`font-medium ${theme === 'dark' ? 'text-white' : ''
                  }`}
              >
                {user.name || 'Anonymous'}
              </div>
              <div
                className={theme === 'dark' ? 'text-white/60' : 'text-gray-500'}
              >
                @{user.username}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div
          className="cursor-pointer"
          onClick={() => onView && onView(row.original)}
        >
          {row.original.email}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <div
          className="cursor-pointer"
          onClick={() => onView && onView(row.original)}
        >
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.isActive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
              }`}
          >
            {row.original.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        <div
          className={`cursor-pointer ${theme === 'dark' ? 'text-white' : ''}`}
          onClick={() => onView && onView(row.original)}
        >
          {new Date(row.original.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView && onView(user)}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit && onEdit(user)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit User
              </DropdownMenuItem>
              {onStatusChange && (
                <DropdownMenuItem
                  onClick={() => onStatusChange(user.id, !user.isActive)}
                >
                  {user.isActive ? (
                    <>
                      <Ban className="w-4 h-4 mr-2 text-orange-500" />
                      <span className="text-orange-500">Deactivate</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      <span className="text-green-500">Activate</span>
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete && onDelete(user.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function getGenreColumns({
  theme = 'light',
  onDelete,
  onEdit,
}: GetGenreColumnsOptions): ColumnDef<Genre>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {new Date(row.original.createdAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => (
        <div className="flex items-center justify-center">
          <button
            onClick={() => {
              window.dispatchEvent(new Event('openAddGenreModal'));
            }}
            className={`h-8 w-8 p-0 rounded-full flex items-center justify-center ${theme === 'dark'
              ? 'text-white hover:bg-white/10'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
            title="Add New Genre"
          >
            <AddSimple className="w-4 h-4" />
          </button>
        </div>
      ),
      cell: ({ row }) => {
        const genre = row.original;
        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(genre)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Genre
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(genre.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Genre
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function getArtistColumns({
  theme,
  onStatusChange,
  onDelete,
  loading,
  actionLoading,
}: GetArtistColumnsOptions): ColumnDef<ArtistProfile>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'artistName',
      header: 'Artist',
      cell: ({ row }) => {
        const artist = row.original;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                }`}
            >
              {artist.avatar ? (
                <Image
                  src={artist.avatar}
                  alt={artist.artistName}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <UserIcon
                  className={`w-8 h-8 p-1.5 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                    }`}
                />
              )}
            </div>
            <div>
              <Link
                href={`/admin/artists/${artist.id}`}
                className={`font-medium hover:underline ${theme === 'dark' ? 'text-white' : ''
                  }`}
              >
                {artist.artistName}
              </Link>
              <div
                className={theme === 'dark' ? 'text-white/60' : 'text-gray-500'}
              >
                {artist.user.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'monthlyListeners',
      header: 'Monthly Listeners',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {row.original.monthlyListeners.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'isVerified',
      header: 'Verification',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.isVerified
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-yellow-500/20 text-yellow-400'
            }`}
        >
          {row.original.isVerified ? 'Verified' : 'Unverified'}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.isActive
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
            }`}
        >
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const artist = row.original;
        const isLoading = actionLoading === artist.id;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={
                  theme === 'dark'
                    ? 'border-white/[0.1] bg-gray-950'
                    : 'bg-white'
                }
              >
                <DropdownMenuItem
                  onClick={() => {
                    window.location.href = `/admin/artists/${artist.id}`;
                  }}
                  className={
                    theme === 'dark' ? 'hover:bg-white/10 text-white' : ''
                  }
                >
                  <Eye className="mr-2 h-4 w-4" />
                  <span>View Details</span>
                </DropdownMenuItem>

                {onStatusChange && (
                  <DropdownMenuItem
                    onClick={() => onStatusChange(artist.id, artist.isActive)}
                    className={
                      theme === 'dark'
                        ? 'hover:bg-white/10 text-white'
                        : artist.isActive
                          ? 'text-orange-600 hover:text-orange-700'
                          : 'text-green-600 hover:text-green-700'
                    }
                  >
                    {artist.isActive ? (
                      <>
                        <Ban className="mr-2 h-4 w-4" />
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        <span>Activate</span>
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(artist.id)}
                    className={
                      theme === 'dark'
                        ? 'hover:bg-white/10 text-red-500'
                        : 'text-red-600 hover:text-red-700'
                    }
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function getArtistRequestColumns({
  theme,
  onApprove,
  onReject,
  onViewDetails,
}: {
  theme?: 'light' | 'dark';
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}): ColumnDef<ArtistRequest>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'artistName',
      header: 'Artist Name',
      cell: ({ row }) => {
        const request = row.original;
        return (
          <Link
            href={`/admin/artist-requests/${request.id}`}
            className={`font-medium text-sm hover:underline ${theme === 'dark' ? 'text-white' : ''
              }`}
          >
            {request.artistName}
          </Link>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'user.email',
      header: 'Email',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {row.original.user.email}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'verificationRequestedAt',
      header: 'Requested At',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {new Date(row.original.verificationRequestedAt).toLocaleDateString(
            'vi-VN',
            {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }
          )}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const request = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails?.(request.id)}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onApprove?.(request.id)}
                className="text-green-600"
              >
                <Check className="w-4 h-4 mr-2" />
                Approve Request
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onReject?.(request.id)}
                className="text-red-600"
              >
                <X className="w-4 h-4 mr-2" />
                Reject Request
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function getLabelColumns({
  theme = 'light',
  onDelete,
  onEdit,
}: GetLabelColumnsOptions): ColumnDef<Label>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const label = row.original;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                }`}
            >
              {label.logoUrl ? (
                <Image
                  src={label.logoUrl}
                  alt={label.name}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Tags
                  className={`w-8 h-8 p-1.5 ${theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                    }`}
                />
              )}
            </div>
            <div>
              <Link
                href={`/admin/labels/${label.id}`}
                className={`font-medium hover:underline ${theme === 'dark' ? 'text-white' : ''
                  }`}
              >
                {label.name}
              </Link>
              {label.description && (
                <div
                  className={
                    theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                  }
                >
                  {label.description.length > 50
                    ? `${label.description.substring(0, 50)}...`
                    : label.description}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'tracks',
      header: 'Tracks',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {row.original._count.tracks}
        </span>
      ),
    },
    {
      id: 'albums',
      header: 'Albums',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {row.original._count.albums}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {new Date(row.original.createdAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => (
        <div className="flex items-center justify-center">
          <button
            onClick={() => {
              window.dispatchEvent(new Event('openAddLabelModal'));
            }}
            className={`h-8 w-8 p-0 rounded-full flex items-center justify-center ${theme === 'dark'
              ? 'text-white hover:bg-white/10'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
            title="Add New Label"
          >
            <AddSimple className="w-4 h-4" />
          </button>
        </div>
      ),
      cell: ({ row }) => {
        const label = row.original;
        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(label)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Label
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(label.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Label
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function getSystemPlaylistColumns({
  theme = 'light',
  onDelete,
  onEdit,
  formatUpdatedAt = (date) => new Date(date).toLocaleString(),
}: GetSystemPlaylistColumnsOptions): ColumnDef<Playlist>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'coverUrl',
      header: 'Cover',
      cell: ({ row }) => (
        <div className="relative w-10 h-10 rounded overflow-hidden">
          <Image
            src={row.original.coverUrl || '/default-playlist-cover.png'}
            alt={row.original.name}
            width={40}
            height={40}
            className="object-cover"
          />
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.original.description || 'No description'}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <div className="capitalize">{row.original.type.toLowerCase()}</div>
      ),
    },
    {
      accessorKey: 'isAIGenerated',
      header: 'AI Generated',
      cell: ({ row }) => (
        <div>
          {row.original.isAIGenerated ? (
            <Badge variant={theme === 'dark' ? 'secondary' : 'default'}>
              Yes
            </Badge>
          ) : (
            <Badge variant="outline">No</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'totalTracks',
      header: 'Tracks',
      cell: ({ row }) => (
        <div className="text-center">{row.original.totalTracks}</div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last Updated',
      cell: ({ row }) => formatUpdatedAt(row.original.updatedAt),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const playlist = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Open menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={theme === 'dark' ? 'bg-[#1e1e1e] border-white/10' : ''}
            >
              {onEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(playlist)}
                  className={
                    theme === 'dark'
                      ? 'text-white focus:bg-white/10'
                      : 'cursor-pointer'
                  }
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
              )}

              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(playlist.id)}
                  className={
                    theme === 'dark'
                      ? 'text-red-400 focus:text-red-400 focus:bg-white/10'
                      : 'text-red-600 cursor-pointer'
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
