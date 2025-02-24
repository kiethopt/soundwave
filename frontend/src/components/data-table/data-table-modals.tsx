import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { Track } from '@/types';

interface EditTrackModalProps {
  track: Track | null;
  onClose: () => void;
  onSubmit: (trackId: string, formData: FormData) => Promise<void>;
  availableArtists: Array<{ id: string; name: string }>;
  selectedFeaturedArtists: string[];
  setSelectedFeaturedArtists: (artists: string[]) => void;
  availableGenres: Array<{ id: string; name: string }>;
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  theme?: 'light' | 'dark';
}

export function EditTrackModal({
  track,
  onClose,
  onSubmit,
  availableArtists,
  selectedFeaturedArtists,
  setSelectedFeaturedArtists,
  availableGenres,
  selectedGenres,
  setSelectedGenres,
  theme = 'light',
}: EditTrackModalProps) {
  if (!track) return null;

  return (
    <Dialog open={!!track} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === 'dark' ? 'bg-[#2a2a2a] border-[#404040]' : 'bg-white'
        } p-6 rounded-lg shadow-lg`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Edit Track
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            onSubmit(track.id, formData);
          }}
          className="space-y-6 mt-4"
        >
          {/* Title */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Title
            </span>
            <Input
              id="title"
              name="title"
              defaultValue={track.title}
              required
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white placeholder-gray-400 focus:border-white/50'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400'
              } transition-colors focus:outline-none`}
              placeholder="Enter track title"
            />
          </div>

          {/* Release Date */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Release Date
            </span>
            <Input
              id="releaseDate"
              name="releaseDate"
              type="datetime-local"
              defaultValue={(() => {
                const date = new Date(track.releaseDate);
                return date
                  .toLocaleString('sv', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: undefined,
                  })
                  .replace(' ', 'T');
              })()}
              required
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-[#3a3a3a] border-[#505050] text-white focus:border-white/50'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400'
              } transition-colors focus:outline-none`}
            />
          </div>

          {/* Featured Artists */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Featured Artists
            </span>
            <SearchableSelect
              options={availableArtists}
              value={selectedFeaturedArtists}
              onChange={setSelectedFeaturedArtists}
              placeholder="Select featured artists..."
              multiple={true}
              required={false}
            />
          </div>

          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
            >
              Genres
            </span>
            <SearchableSelect
              options={availableGenres}
              value={selectedGenres}
              onChange={setSelectedGenres}
              placeholder="Select genres..."
              multiple={true}
              required={false}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={
                theme === 'dark'
                  ? 'border-white/50 text-white hover:bg-white/10'
                  : ''
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={
                theme === 'dark' ? 'bg-white text-black hover:bg-white/90' : ''
              }
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
