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
import { useState, useEffect } from 'react';

interface GetColumnsOptions {
  theme?: 'light' | 'dark';
  onVisibilityChange?: (id: string, isActive: boolean) => Promise<void>;
  onDelete?: (id: string | string[]) => Promise<void>;
  onEdit?: (item: Track) => void;
  formatReleaseTime?: (date: string) => string;
}

export function getTrackColumns({
  theme = 'light',
  onVisibilityChange,
  onDelete,
  onEdit,
  formatReleaseTime,
}: GetColumnsOptions): ColumnDef<Track>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
          }}
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
      header: 'Track',
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
              {track.album && (
                <div
                  className={
                    theme === 'dark' ? 'text-white/60' : 'text-gray-500'
                  }
                >
                  {track.album.title}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'featuredArtists',
      header: 'Featured Artists',
      cell: ({ row }) => {
        const track = row.original;
        if (!track.featuredArtists?.length) {
          return (
            <span
              className={theme === 'dark' ? 'text-white/60' : 'text-gray-500'}
            ></span>
          );
        }

        return (
          <div className="flex flex-wrap gap-1">
            {track.featuredArtists.map((fa, index) => (
              <span key={fa.artistProfile.id}>
                <span className={`${theme === 'dark' ? 'text-white' : ''}`}>
                  {fa.artistProfile.artistName}
                </span>
                {index < track.featuredArtists.length - 1 && ', '}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => {
        const minutes = Math.floor(row.original.duration / 60);
        const seconds = row.original.duration % 60;
        return (
          <span className={theme === 'dark' ? 'text-white' : ''}>
            {`${minutes}:${seconds.toString().padStart(2, '0')}`}
          </span>
        );
      },
    },
    {
      accessorKey: 'playCount',
      header: 'Plays',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {row.original.playCount.toLocaleString()}
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
        const [countdown, setCountdown] = useState(
          formatReleaseTime ? formatReleaseTime(row.original.releaseDate) : ''
        );

        useEffect(() => {
          const release = new Date(row.original.releaseDate);
          const now = new Date();

          if (release <= now) {
            return;
          }

          const timer = setInterval(() => {
            const currentTime = new Date();
            if (release <= currentTime) {
              clearInterval(timer);
            } else {
              setCountdown(
                formatReleaseTime
                  ? formatReleaseTime(row.original.releaseDate)
                  : ''
              );
            }
          }, 1000);

          return () => clearInterval(timer);
        }, [row.original.releaseDate]);

        return (
          <span className={theme === 'dark' ? 'text-white' : ''}>
            {countdown}
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
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Track
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show Track
                  </>
                )}
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
}: GetColumnsOptions): ColumnDef<Album>[] {
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
      accessorKey: 'title',
      header: 'Album',
      cell: ({ row }) => {
        const album = row.original;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-md overflow-hidden ${
                theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
              }`}
            >
              {album.coverUrl ? (
                <Image
                  src={album.coverUrl}
                  alt={album.title}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Music
                  className={`w-12 h-12 p-2.5 ${
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
              <div
                className={theme === 'dark' ? 'text-white/60' : 'text-gray-500'}
              >
                {album.type}
              </div>
            </div>
          </div>
        );
      },
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
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {new Date(row.original.releaseDate).toLocaleDateString()}
        </span>
      ),
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
