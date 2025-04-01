import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Label, Album, Track } from '@/types';

interface LabelOverviewProps {
  label: Label;
  theme: 'light' | 'dark';
  topArtists: Label['artists'];
  latestAlbums: Label['albums'];
  popularTracks: Label['tracks'];
  formatDate: (dateString: string) => string;
  formatDuration: (seconds: number) => string;
  handleAlbumClick: (albumId: string) => void;
  handleTrackClick: (trackId: string) => void;
}

export function LabelOverview({
  theme,
  topArtists,
  latestAlbums,
  popularTracks,
  formatDate,
  formatDuration,
  handleAlbumClick,
  handleTrackClick,
}: LabelOverviewProps) {
  const router = useRouter();

  return (
    <div
      className={`${
        theme === 'light' ? 'bg-white' : 'bg-gray-800'
      } rounded-lg shadow-md p-6 space-y-6`}
    >
      <h2
        className={`text-xl font-bold ${
          theme === 'light' ? 'text-gray-900' : 'text-white'
        }`}
      >
        Overview
      </h2>

      {/* Top Artists */}
      {topArtists && topArtists.length > 0 && (
        <div className="space-y-3">
          <h3
            className={`text-lg font-semibold ${
              theme === 'light' ? 'text-gray-800' : 'text-gray-200'
            }`}
          >
            Top Artists
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {topArtists.map((artist) => (
              <div
                key={artist.id}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => router.push(`/admin/artists/${artist.id}`)}
              >
                <div className="w-20 h-20 rounded-full overflow-hidden mb-2 bg-gray-100 dark:bg-gray-700">
                  {artist.avatar ? (
                    <Image
                      src={artist.avatar}
                      alt={artist.artistName}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                      <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                        {artist.artistName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p
                    className={`font-medium ${
                      theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    {artist.artistName}
                  </p>
                  <p
                    className={`text-xs ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {artist.albumCount}{' '}
                    {artist.albumCount === 1 ? 'Album' : 'Albums'},{' '}
                    {artist.trackCount}{' '}
                    {artist.trackCount === 1 ? 'Track' : 'Tracks'}
                  </p>
                  {artist.isVerified && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 mt-1">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Albums */}
      {latestAlbums && latestAlbums.length > 0 && (
        <div className="space-y-3">
          <h3
            className={`text-lg font-semibold ${
              theme === 'light' ? 'text-gray-800' : 'text-gray-200'
            }`}
          >
            Latest Releases
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {latestAlbums.map((album) => (
              <div
                key={album.id}
                className="flex flex-col cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleAlbumClick(album.id)}
              >
                <div className="w-full aspect-square rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 mb-2">
                  {album.coverUrl ? (
                    <Image
                      src={album.coverUrl}
                      alt={album.title}
                      width={200}
                      height={200}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xl font-bold text-gray-400 dark:text-gray-500">
                        {album.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p
                    className={`font-medium truncate ${
                      theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    {album.title}
                  </p>
                  <p
                    className={`text-sm truncate ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {album.artist.artistName}
                  </p>
                  <p
                    className={`text-xs ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {formatDate(album.releaseDate)} • {album.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Tracks */}
      {popularTracks && popularTracks.length > 0 && (
        <div className="space-y-3">
          <h3
            className={`text-lg font-semibold ${
              theme === 'light' ? 'text-gray-800' : 'text-gray-200'
            }`}
          >
            Popular Tracks
          </h3>
          <div className="space-y-2">
            {popularTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => handleTrackClick(track.id)}
                className={`flex items-center p-3 rounded-md cursor-pointer ${
                  theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
                }`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 mr-3">
                  {track.coverUrl ? (
                    <Image
                      src={track.coverUrl}
                      alt={track.title}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                        {track.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p
                    className={`font-medium truncate ${
                      theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    {track.title}
                  </p>
                  <p
                    className={`text-sm truncate ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {track.artist.artistName}{' '}
                    {track.album && `• ${track.album.title}`}
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end ml-3">
                  <span
                    className={`text-sm ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                    }`}
                  >
                    {formatDuration(track.duration)}
                  </span>
                  <span
                    className={`text-xs ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {track.playCount.toLocaleString()} plays
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
