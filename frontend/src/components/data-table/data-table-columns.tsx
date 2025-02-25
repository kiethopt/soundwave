import { ColumnDef } from '@tanstack/react-table';
import { Track, Album } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreVertical, Eye, EyeOff, Trash2, Music, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { api } from '@/utils/api';
import { ArtistInfoModal } from './data-table-modals';

interface GetTrackColumnsOptions {
  theme?: 'light' | 'dark';
  onVisibilityChange?: (id: string, isActive: boolean) => Promise<void>;
  onDelete?: (id: string | string[]) => Promise<void>;
  onEdit?: (track: Track) => void;
  formatReleaseTime?: (date: string) => string;
}

interface GetAlbumColumnsOptions {
  theme?: 'light' | 'dark';
  onVisibilityChange?: (id: string, isActive: boolean) => Promise<void>;
  onDelete?: (id: string | string[]) => Promise<void>;
  onEdit?: (album: Album) => void;
  formatReleaseTime?: (date: string) => string;
}

export function getTrackColumns({
  theme = 'light',
  onVisibilityChange,
  onDelete,
  onEdit,
  formatReleaseTime,
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
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded overflow-hidden ${
                theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
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
                  className={`w-8 h-8 p-1.5 ${
                    theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                  }`}
                />
              )}
            </div>
            <div>
              <Link
                href={`/artist/tracks/${track.id}`}
                className={`font-medium hover:underline ${
                  theme === 'dark' ? 'text-white' : ''
                }`}
              >
                {track.title}
              </Link>
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
        const [selectedArtist, setSelectedArtist] = React.useState<any>(null);
        const [isModalOpen, setIsModalOpen] = React.useState(false);
        const [isLoading, setIsLoading] = React.useState(false);
        const [loadingArtistId, setLoadingArtistId] = React.useState<
          string | null
        >(null);

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
              <React.Fragment key={g.genre.id}>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    theme === 'dark'
                      ? 'bg-white/10 text-white/80'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {g.genre.name}
                </span>
                {index < genres.length - 1 && ' '}
              </React.Fragment>
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
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.original.isActive
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
        const [timeDisplay, setTimeDisplay] = React.useState<string>('');
        const track = row.original;

        React.useEffect(() => {
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
            if (release <= now && !track.isActive) {
              // Đơn giản nhất: reload trang
              window.location.reload();
            }

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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete && onDelete(track.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Track
              </DropdownMenuItem>
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
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded overflow-hidden ${
                theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
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
                  className={`w-8 h-8 p-1.5 ${
                    theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                  }`}
                />
              )}
            </div>
            <div>
              <Link
                href={`/artist/albums/${album.id}`}
                className={`font-medium hover:underline ${
                  theme === 'dark' ? 'text-white' : ''
                }`}
              >
                {album.title}
              </Link>
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
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.original.type === 'ALBUM'
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
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  theme === 'dark'
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
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.original.isActive
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
        const [timeDisplay, setTimeDisplay] = React.useState<string>('');
        const album = row.original;

        React.useEffect(() => {
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
            if (release <= now && !album.isActive) {
              // Đơn giản nhất: reload trang
              window.location.reload();
            }

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
        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit && onEdit(album)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Album
              </DropdownMenuItem>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete && onDelete(album.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Album
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
