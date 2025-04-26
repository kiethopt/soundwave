import { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Track, Album, ArtistProfile, User, Genre, Label } from "@/types";
import Image from "next/image";
import { Facebook, Instagram, Verified, Spinner } from "@/components/ui/Icons";
import { api } from "@/utils/api";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Music } from "lucide-react";
import { useDominantColor } from "@/hooks/useDominantColor";
import { Textarea } from "@/components/ui/textarea";
import { Label as InputLabel } from "@/components/ui/label";
import { Tags } from "lucide-react";
import Link from "next/link";
import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Thêm import

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
  availableLabels: { id: string; name: string }[];
  selectedLabelId: string | null;
  setSelectedLabelId: (id: string | null) => void;
  theme?: "light" | "dark";
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
  availableLabels,
  selectedLabelId,
  setSelectedLabelId,
  theme = "light",
}: EditTrackModalProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [genreError, setGenreError] = useState<string | null>(null);

  // Cập nhật preview khi track thay đổi (chỉ khi component được mount hoặc track prop thay đổi)
  useEffect(() => {
    if (track?.coverUrl) {
      setPreviewImage(track.coverUrl);
    } else {
      setPreviewImage(null);
    }
  }, [track?.coverUrl]);

  if (!track) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
    }
  };

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  // Xử lý submit form
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!track) return;

    // **Inline Validation Check for Genres**
    if (selectedGenres.length === 0) {
      setGenreError("This field is required");
      return; // Stop submission
    } else {
      setGenreError(null); // Clear error if validation passes
    }

    const formData = new FormData(e.currentTarget);

    formData.delete("featuredArtists");
    formData.delete("genreIds");
    formData.delete("labelId");

    // Gửi featuredArtists
    selectedFeaturedArtists.forEach((artistId) => {
      formData.append("featuredArtists", artistId);
    });

    // Gửi genreIds
    if (selectedGenres.length > 0) {
      // Validation ensures this
      selectedGenres.forEach((genreId) => {
        formData.append("genreIds", genreId);
      });
    }
    // No need for else case, as validation prevents empty selection

    // Gửi labelId
    if (selectedLabelId) {
      formData.append("labelId", selectedLabelId);
    } else {
      formData.append("labelId", ""); // Gửi chuỗi rỗng nếu không có label
    }

    // Đảm bảo updateGenres và updateFeaturedArtists luôn được gửi
    formData.append("updateGenres", "true");
    formData.append("updateFeaturedArtists", "true");

    console.log("Form data being sent:", {
      genreIds: selectedGenres,
      updateGenres: formData.get("updateGenres"),
      labelId: formData.get("labelId"),
    }); // Logging để debug

    onSubmit(track.id, formData);
  };

  return (
    <Dialog open={!!track} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === "dark" ? "bg-[#2a2a2a] border-[#404040]" : "bg-white"
        } p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Edit Track
          </DialogTitle>
          <DialogDescription
            className={theme === "dark" ? "text-white/70" : "text-gray-500"}
          >
            Make changes to your track information here.
          </DialogDescription>
        </DialogHeader>
        {/* Sử dụng hàm xử lý submit mới */}
        <form onSubmit={handleFormSubmit} className="space-y-6 mt-4">
          {/* Cover Image */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Cover Image
            </span>
            <div
              className="w-full flex flex-col items-center mb-4"
              onClick={handleCoverClick}
            >
              <div
                className={`w-40 h-40 rounded-md overflow-hidden cursor-pointer border-2 ${
                  theme === "dark" ? "border-gray-600" : "border-gray-300"
                } hover:opacity-90 transition-opacity relative`}
              >
                <img
                  src={
                    previewImage ||
                    track.coverUrl ||
                    "https://placehold.co/150x150?text=No+Cover"
                  }
                  alt="Track cover"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22150%22%20viewBox%3D%220%200%20150%20150%22%3E%3Crect%20fill%3D%22%23ccc%22%20width%3D%22150%22%20height%3D%22150%22%2F%3E%3Ctext%20fill%3D%22%23666%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20dy%3D%22.5em%22%20text-anchor%3D%22middle%22%20x%3D%2275%22%20y%3D%2275%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E";
                  }}
                />
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity text-white`}
                >
                  <span>Change Cover</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                id="coverFile"
                // *** QUAN TRỌNG: Đặt tên cho input file để FormData có thể lấy được nó ***
                name="coverFile"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span
                className={`mt-2 text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Click to upload new cover image
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Title
            </span>
            <Input
              id="title"
              name="title" // Cần có name để FormData lấy được giá trị
              defaultValue={track.title}
              required
              className={`w-full px-3 py-2 rounded-md border ${
                theme === "dark"
                  ? "bg-[#3a3a3a] border-[#505050] text-white placeholder-gray-400 focus:border-white/50"
                  : "bg-white border-gray-300 text-gray-900 focus:border-gray-400"
              } transition-colors focus:outline-none`}
              placeholder="Enter track title"
            />
          </div>

          {/* Type (disabled SINGLE) */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Type
            </span>
            <Input
              id="type_display" // Đổi id để không trùng với input ẩn
              value="SINGLE"
              disabled
              className={`w-full px-3 py-2 rounded-md border ${
                theme === "dark"
                  ? "bg-[#3a3a3a] border-[#505050] text-white/70"
                  : "bg-gray-100 border-gray-300 text-gray-600"
              } transition-colors focus:outline-none cursor-not-allowed`}
            />
            {/* Input ẩn để gửi giá trị type */}
            <input type="hidden" name="type" value="SINGLE" />
          </div>

          {/* Release Date */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Release Date
            </span>
            <Input
              id="releaseDate"
              name="releaseDate" // Cần có name
              type="datetime-local"
              defaultValue={(() => {
                try {
                  // Chuyển đổi sang Date object, đảm bảo múi giờ đúng nếu cần
                  const date = new Date(track.releaseDate);
                  // Kiểm tra xem Date có hợp lệ không
                  if (isNaN(date.getTime())) {
                    // Nếu không hợp lệ, trả về chuỗi rỗng hoặc giá trị mặc định khác
                    console.warn("Invalid release date:", track.releaseDate);
                    return "";
                  }
                  // Định dạng sang 'YYYY-MM-DDTHH:mm'
                  const year = date.getFullYear();
                  const month = (date.getMonth() + 1)
                    .toString()
                    .padStart(2, "0");
                  const day = date.getDate().toString().padStart(2, "0");
                  const hours = date.getHours().toString().padStart(2, "0");
                  const minutes = date.getMinutes().toString().padStart(2, "0");
                  return `${year}-${month}-${day}T${hours}:${minutes}`;
                } catch (error) {
                  console.error("Error formatting release date:", error);
                  return ""; // Fallback an toàn
                }
              })()}
              required
              className={`w-full px-3 py-2 rounded-md border ${
                theme === "dark"
                  ? "bg-[#3a3a3a] border-[#505050] text-white focus:border-white/50"
                  : "bg-white border-gray-300 text-gray-900 focus:border-gray-400"
              } transition-colors focus:outline-none ${
                theme === "dark" ? "date-input-dark" : ""
              }`}
            />
          </div>

          {/* Featured Artists */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
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
              // Không cần required nếu là optional
            />
            {/* Input ẩn không còn cần thiết vì ta tự append vào FormData */}
          </div>

          {/* Genres - Apply conditional styling and error message */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Genres *
            </span>
            {/* Wrap SearchableSelect for error styling */}
            <div
              className={cn(genreError && "rounded-md border border-red-500")}
            >
              <SearchableSelect
                multiple
                // Map to the expected type { id: string; name: string; }
                options={availableGenres.map((g) => ({
                  id: g.id,
                  name: g.name,
                }))}
                value={selectedGenres} // Pass selectedGenres to value prop
                onChange={setSelectedGenres}
                placeholder="Select genres..."
              />
            </div>
            {/* Display error message */}
            {genreError && (
              <p className="text-sm text-red-500 mt-1">{genreError}</p>
            )}
          </div>

          {/* --- Thêm trường chọn Label --- */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Label (Optional)
            </span>
            <SearchableSelect
              options={availableLabels}
              value={selectedLabelId ? [selectedLabelId] : []}
              onChange={(ids) =>
                setSelectedLabelId(ids.length > 0 ? ids[0] : null)
              }
              placeholder="Select a label..."
              multiple={false}
            />
          </div>
          {/* --- Kết thúc thêm trường chọn Label --- */}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={
                theme === "dark"
                  ? "border-white/50 text-white hover:bg-white/10"
                  : ""
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={
                theme === "dark" ? "bg-white text-black hover:bg-white/90" : ""
              }
              // Thêm trạng thái loading nếu cần
              // disabled={isLoading}
            >
              {/* {isLoading ? 'Saving...' : 'Save Changes'} */}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditAlbumModalProps {
  album: Album | null;
  onClose: () => void;
  onSubmit: (albumId: string, formData: FormData) => Promise<void>;
  availableGenres: Array<{ id: string; name: string }>;
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  // Thêm props cho Label
  availableLabels: Array<{ id: string; name: string }>;
  selectedLabelId: string | null;
  setSelectedLabelId: Dispatch<SetStateAction<string | null>>;
  theme?: "light" | "dark";
}

export function EditAlbumModal({
  album,
  onClose,
  onSubmit,
  availableGenres,
  selectedGenres,
  setSelectedGenres,
  // Destructure các props mới cho Label
  availableLabels,
  selectedLabelId,
  setSelectedLabelId,
  theme = "light",
}: EditAlbumModalProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [genreError, setGenreError] = useState<string | null>(null); // <<< Added state for genre error

  useEffect(() => {
    if (album?.coverUrl) {
      setPreviewImage(album.coverUrl);
    } else {
      setPreviewImage(null);
    }
    // Nếu album có label, cập nhật selectedLabelId khi modal mở
    if (album?.label?.id) {
      setSelectedLabelId(album.label.id);
    }
    // Clear genre error when album changes or modal opens
    setGenreError(null); // <<< Clear error on mount/album change
  }, [album, setSelectedLabelId]);

  if (!album) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
    }
  };

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // <<< Added genre validation check
    if (selectedGenres.length === 0) {
      setGenreError("This field is required");
      return; // Stop submission if validation fails
    } else {
      setGenreError(null); // Clear error if validation passes
    }

    const formData = new FormData(e.currentTarget);

    // Xóa các trường hiện có để tránh trùng lặp
    formData.delete("genres");
    formData.delete("labelId"); // Xóa labelId cũ nếu có

    // Thêm genres từ state (validation ensures it's not empty)
    selectedGenres.forEach((genreId) => {
      formData.append("genres", genreId);
    });

    // Thêm labelId nếu được chọn
    if (selectedLabelId) {
      formData.append("labelId", selectedLabelId);
    }

    // Gửi formData lên hàm onSubmit từ component cha
    onSubmit(album.id, formData);
  };

  return (
    <Dialog open={!!album} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === "dark" ? "bg-[#2a2a2a] border-[#404040]" : "bg-white"
        } p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Edit Album
          </DialogTitle>
          <DialogDescription
            className={theme === "dark" ? "text-white/70" : "text-gray-500"}
          >
            Make changes to your album information here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Cover Image */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Cover Image
            </span>
            <div
              className="w-full flex flex-col items-center mb-4"
              onClick={handleCoverClick}
            >
              <div
                className={`w-40 h-40 rounded-md overflow-hidden cursor-pointer border-2 ${
                  theme === "dark" ? "border-gray-600" : "border-gray-300"
                } hover:opacity-90 transition-opacity relative`}
              >
                <img
                  src={
                    previewImage ||
                    album.coverUrl ||
                    "https://placehold.co/150x150?text=No+Cover"
                  }
                  alt="Album cover"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22150%22%20viewBox%3D%220%200%20150%20150%22%3E%3Crect%20fill%3D%22%23ccc%22%20width%3D%22150%22%20height%3D%22150%22%2F%3E%3Ctext%20fill%3D%22%23666%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20dy%3D%22.5em%22%20text-anchor%3D%22middle%22%20x%3D%2275%22%20y%3D%2275%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E";
                  }}
                />
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity text-white`}
                >
                  <span>Change Cover</span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                id="coverFile"
                name="coverFile"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span
                className={`mt-2 text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Click to upload new cover image
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Title
            </span>
            <Input
              id="title"
              name="title"
              defaultValue={album.title}
              required
              className={`w-full px-3 py-2 rounded-md border ${
                theme === "dark"
                  ? "bg-[#3a3a3a] border-[#505050] text-white placeholder-gray-400 focus:border-white/50"
                  : "bg-white border-gray-300 text-gray-900 focus:border-gray-400"
              } transition-colors focus:outline-none`}
              placeholder="Enter album title"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Type
            </span>
            <select
              id="type"
              name="type"
              defaultValue={album.type}
              className={`w-full px-3 py-2 rounded-md border ${
                theme === "dark"
                  ? "bg-[#3a3a3a] border-[#505050] text-white placeholder-gray-400 focus:border-white/50"
                  : "bg-white border-gray-300 text-gray-900 focus:border-gray-400"
              } transition-colors focus:outline-none`}
            >
              <option value="ALBUM">Album</option>
              <option value="EP">EP</option>
            </select>
          </div>

          {/* Release Date */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Release Date
            </span>
            <Input
              id="releaseDate"
              name="releaseDate"
              type="datetime-local"
              defaultValue={(() => {
                const date = new Date(album.releaseDate);
                return date
                  .toLocaleString("sv", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .replace(" ", "T");
              })()}
              required
              className={`w-full px-3 py-2 rounded-md border ${
                theme === "dark"
                  ? "bg-[#3a3a3a] border-[#505050] text-white focus:border-white/50"
                  : "bg-white border-gray-300 text-gray-900 focus:border-gray-400"
              } transition-colors focus:outline-none`}
            />
          </div>

          {/* Genres */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Genres * {/* <<< Added asterisk */}
            </span>
            {/* <<< Wrap SearchableSelect for error styling */}
            <div
              className={cn(genreError && "rounded-md border border-red-500")}
            >
              <SearchableSelect
                options={availableGenres}
                value={selectedGenres}
                onChange={setSelectedGenres}
                placeholder="Select genres..."
                multiple={true}
                // required={false} <<< Removed required prop
              />
            </div>
             {/* <<< Display error message */}
             {genreError && (
              <p className="text-sm text-red-500 mt-1">{genreError}</p>
            )}
          </div>

          {/* Thêm trường chọn Label */}
          <div className="space-y-2">
            <span
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Label (Optional)
            </span>
            <SearchableSelect
              options={availableLabels}
              value={selectedLabelId ? [selectedLabelId] : []}
              onChange={(ids) =>
                setSelectedLabelId(ids.length > 0 ? ids[0] : null)
              }
              placeholder="Select a label..."
              multiple={false}
            />
          </div>
          {/* Kết thúc thêm trường chọn Label */}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={
                theme === "dark"
                  ? "border-white/50 text-white hover:bg-white/10"
                  : ""
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={
                theme === "dark" ? "bg-white text-black hover:bg-white/90" : ""
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

interface ArtistInfoModalProps {
  artist: {
    id: string;
    artistName: string;
    bio?: string;
    avatar?: string;
    socialMediaLinks?: {
      spotify?: string;
      youtube?: string;
      instagram?: string;
      twitter?: string;
      facebook?: string;
    };
    monthlyListeners?: number;
    isVerified?: boolean;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
}

export function ArtistInfoModal({
  artist,
  isOpen,
  onClose,
  theme = "light",
}: ArtistInfoModalProps) {
  if (!artist) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full sm:max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden",
            theme === "dark" ? "bg-[#2a2a2a] border-[#404040]" : "bg-white"
          )}
        >
          <DialogHeader>
            <DialogTitle className="sr-only">Artist Information</DialogTitle>
            <DialogDescription className="sr-only">
              Details about the artist
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              {artist.avatar ? (
                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={artist.avatar}
                    alt={artist.artistName}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`text-2xl font-bold ${
                      theme === "dark" ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {artist.artistName?.charAt(0).toUpperCase() || "A"}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-1">
                  <h3
                    className={`text-xl font-bold ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {artist.artistName}
                  </h3>
                  {artist.isVerified && (
                    <Verified
                      className={`w-5 h-5 ${
                        theme === "dark" ? "text-blue-400" : "text-blue-500"
                      }`}
                    />
                  )}
                </div>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  {artist.monthlyListeners
                    ? artist.monthlyListeners.toLocaleString()
                    : "0"}{" "}
                  monthly listeners
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {artist.bio || "No bio available"}
              </p>
            </div>

            {(artist.socialMediaLinks?.facebook ||
              artist.socialMediaLinks?.instagram) && (
              <div className="flex gap-3">
                {artist.socialMediaLinks?.facebook && (
                  <a
                    href={
                      artist.socialMediaLinks.facebook.startsWith("http")
                        ? artist.socialMediaLinks.facebook
                        : `https://www.facebook.com/${artist.socialMediaLinks.facebook}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-blue-500 hover:text-blue-600 flex items-center gap-1`}
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {artist.socialMediaLinks?.instagram && (
                  <a
                    href={
                      artist.socialMediaLinks.instagram.startsWith("http")
                        ? artist.socialMediaLinks.instagram
                        : `https://www.instagram.com/${artist.socialMediaLinks.instagram}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-pink-500 hover:text-pink-600 flex items-center gap-1`}
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}

            {/* Nút Close ở góc dưới bên phải */}
            <div className="flex justify-end mt-4">
              <Button
                onClick={onClose}
                variant="outline"
                className={`${
                  theme === "dark"
                    ? "border-gray-600 text-black hover:bg-gray-300"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

interface EditArtistModalProps {
  artist: ArtistProfile | null;
  onClose: () => void;
  onUpdate: (updatedArtist: Partial<ArtistProfile>) => void;
  theme?: "light" | "dark";
}

export function EditArtistModal({
  artist,
  onClose,
  onUpdate,
  theme = "light",
}: EditArtistModalProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(
    artist?.avatar || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!artist) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        toast.error("No authentication token found");
        return;
      }

      const response = await api.admin.updateArtist(artist.id, formData, token);
      onUpdate(response.artist);
      onClose();
      toast.success("Artist updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update artist"
      );
    }
  };

  return (
    <Dialog open={!!artist} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === "dark" ? "bg-[#2a2a2a] border-[#404040]" : "bg-white"
        } p-6 rounded-lg shadow-lg max-w-lg w-full`}
      >
        <DialogHeader>
          <DialogTitle>Edit Artist</DialogTitle>
          <DialogDescription>
            Make changes to artist information here. Click save when you're
            done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Avatar */}
          <div className="space-y-2">
            <label
              htmlFor="avatar"
              className={theme === "dark" ? "text-white" : "text-gray-700"}
            >
              Avatar
            </label>
            <div className="flex items-center gap-4">
              <img
                src={
                  previewImage || "https://placehold.co/150x150?text=No+Cover"
                }
                alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              />
              <input
                type="file"
                id="avatar"
                name="avatar"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className={
                  theme === "dark"
                    ? "text-black border-white/50 hover:bg-gray-200"
                    : ""
                }
              >
                Change Avatar
              </Button>
            </div>
          </div>

          {/* Artist Name */}
          <div className="space-y-2">
            <label
              htmlFor="artistName"
              className={theme === "dark" ? "text-white" : "text-gray-700"}
            >
              Artist Name
            </label>
            <Input
              id="artistName"
              name="artistName"
              defaultValue={artist.artistName}
              required
              className={theme === "dark" ? "bg-[#3a3a3a] text-white" : ""}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label
              htmlFor="bio"
              className={theme === "dark" ? "text-white" : "text-gray-700"}
            >
              Bio
            </label>
            <Input
              id="bio"
              name="bio"
              defaultValue={artist.bio || ""}
              className={theme === "dark" ? "bg-[#3a3a3a] text-white" : ""}
            />
          </div>

          {/* Verification Status */}
          <div className="space-y-2">
            <label
              htmlFor="isVerified"
              className={theme === "dark" ? "text-white" : "text-gray-700"}
            >
              Verification Status
            </label>
            <select
              id="isVerified"
              name="isVerified"
              defaultValue={artist.isVerified ? "true" : "false"}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                theme === "dark"
                  ? "bg-[#3a3a3a] text-white border-gray-600"
                  : "border-gray-300"
              }`}
            >
              <option value="true">Verified</option>
              <option value="false">Not Verified</option>
            </select>
          </div>

          {/* Social Media Links */}
          <div className="space-y-2">
            <label
              htmlFor="facebookLink"
              className={theme === "dark" ? "text-white" : "text-gray-700"}
            >
              Facebook Link
            </label>
            <Input
              id="facebookLink"
              name="socialMediaLinks[facebook]" // Use nested name for FormData parsing
              defaultValue={artist.socialMediaLinks?.facebook || ""}
              placeholder="https://www.facebook.com/your_page"
              className={theme === "dark" ? "bg-[#3a3a3a] text-white" : ""}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="instagramLink"
              className={theme === "dark" ? "text-white" : "text-gray-700"}
            >
              Instagram Link
            </label>
            <Input
              id="instagramLink"
              name="socialMediaLinks[instagram]"
              defaultValue={artist.socialMediaLinks?.instagram || ""}
              placeholder="https://www.instagram.com/your_profile"
              className={theme === "dark" ? "bg-[#3a3a3a] text-white" : ""}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={
                theme === "dark"
                  ? "bg-white text-black hover:bg-gray-200 border-gray-300"
                  : ""
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading}
              className={
                theme === "dark" ? "bg-white text-black hover:bg-gray-200" : ""
              }
            >
              {isUploading ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditGenreModalProps {
  genre: Genre | null;
  onClose: () => void;
  onSubmit: (genreId: string, formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
}

export function EditGenreModal({
  genre,
  onClose,
  onSubmit,
  theme = "light",
}: EditGenreModalProps) {
  if (!genre) return null;

  return (
    <Dialog open={!!genre} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === "dark" ? "bg-[#2a2a2a] border-[#404040]" : "bg-white"
        } p-6 rounded-lg shadow-lg max-w-md w-full`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Edit Genre
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            await onSubmit(genre.id, formData);
          }}
          className="space-y-4 mt-4"
        >
          <div className="space-y-2">
            <label
              htmlFor="name"
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Name
            </label>
            <Input
              id="name"
              name="name"
              defaultValue={genre.name}
              required
              maxLength={50}
              className={`w-full px-3 py-2 rounded-md border ${
                theme === "dark"
                  ? "bg-[#3a3a3a] border-[#505050] text-white"
                  : "bg-white border-gray-300"
              }`}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={theme === "dark" ? "text-white border-white/50" : ""}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={theme === "dark" ? "bg-white text-black" : ""}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AddGenreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  theme?: "light" | "dark";
}

export function AddGenreModal({
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: AddGenreModalProps) {
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(name);
      setName("");
      onClose();
    } catch (error) {
      toast.error("Failed to create genre");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === "dark" ? "bg-[#2a2a2a] border-[#404040]" : "bg-white"
        } p-6 rounded-lg shadow-lg max-w-md w-full`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Add New Genre
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className={`block text-sm font-medium ${
                theme === "dark" ? "text-gray-200" : "text-gray-700"
              }`}
            >
              Genre Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              className={`w-full px-3 py-2 rounded-md border ${
                theme === "dark"
                  ? "bg-[#3a3a3a] border-[#505050] text-white"
                  : "bg-white border-gray-300"
              }`}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={theme === "dark" ? "text-white border-white/50" : ""}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={theme === "dark" ? "bg-white text-black" : ""}
            >
              Add Genre
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface UserInfoModalProps {
  user: User | null;
  onClose: () => void;
  theme?: "light" | "dark";
}

export function UserInfoModal({
  user,
  onClose,
  theme = "light",
}: UserInfoModalProps) {
  if (!user) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === "dark" ? "bg-[#2a2a2a] border-[#404040]" : "bg-white"
        } p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            User Information
          </DialogTitle>
          <DialogDescription
            className={theme === "dark" ? "text-white/70" : "text-gray-500"}
          >
            Detailed information about the user
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Information */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || "User avatar"}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    theme === "dark" ? "bg-gray-500" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`text-2xl font-bold ${
                      theme === "dark" ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {(user.name || user.email)?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3
                className={`text-lg font-semibold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {user.name || "No name provided"}
              </h3>
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {user.email}
              </p>
            </div>
          </div>

          {/* Additional Information */}
          <div
            className={`grid grid-cols-2 gap-4 p-4 rounded-lg ${
              theme === "dark" ? "bg-gray-500" : "bg-gray-50"
            }`}
          >
            <div>
              <p
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-gray-200" : "text-gray-500"
                }`}
              >
                Username
              </p>
              <p
                className={`mt-1 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {user.username || "Not set"}
              </p>
            </div>
            <div>
              <p
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-gray-200" : "text-gray-500"
                }`}
              >
                Current Profile
              </p>
              <p
                className={`mt-1 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {user.currentProfile}
              </p>
            </div>
            <div>
              <p
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-gray-200" : "text-gray-500"
                }`}
              >
                Created At
              </p>
              <p
                className={`mt-1 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {formatDate(user.createdAt)}
              </p>
            </div>
            <div>
              <p
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-gray-200" : "text-gray-500"
                }`}
              >
                Last Login
              </p>
              <p
                className={`mt-1 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
              </p>
            </div>
            <div>
              <p
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-gray-200" : "text-gray-500"
                }`}
              >
                Role
              </p>
              <p
                className={`mt-1 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {user.role}
              </p>
            </div>
          </div>

          {/* Artist Profile Information (if exists) */}
          {user.artistProfile && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                theme === "dark" ? "bg-gray-800" : "bg-gray-50"
              }`}
            >
              <h4
                className={`text-lg font-semibold mb-4 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Artist Profile
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Artist Name
                  </p>
                  <p
                    className={`mt-1 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {user.artistProfile.artistName}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Verification Status
                  </p>
                  <p
                    className={`mt-1 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {user.artistProfile.isVerified
                      ? "Verified"
                      : "Not Verified"}
                  </p>
                </div>
                {user.artistProfile.verificationRequestedAt && (
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Verification Requested
                    </p>
                    <p
                      className={`mt-1 ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {formatDate(user.artistProfile.verificationRequestedAt)}
                    </p>
                  </div>
                )}
                {user.artistProfile.verifiedAt && (
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      Verified At
                    </p>
                    <p
                      className={`mt-1 ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {formatDate(user.artistProfile.verifiedAt)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end mt-6">
            <Button
              onClick={onClose}
              className={`${
                theme === "dark"
                  ? "bg-white text-black hover:bg-gray-200"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ActionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  actionText: string;
  theme?: "light" | "dark";
  predefinedReasons?: string[];
}

export function ActionReasonModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  actionText,
  theme = "light",
  predefinedReasons = [],
}: ActionReasonModalProps) {
  const [reason, setReason] = useState("");
  const [selectedPredefined, setSelectedPredefined] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (selectedPredefined) {
      setReason(selectedPredefined);
    }
  }, [selectedPredefined]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
    setSelectedPredefined(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/50" />
        <DialogContent
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          )}
        >
          <DialogHeader>
            <DialogTitle
              className={`text-lg font-semibold mb-4 ${
                theme === "light" ? "text-gray-900" : "text-white"
              }`}
            >
              {title}
            </DialogTitle>
            <DialogDescription
              className={`mb-4 text-sm ${
                theme === "light" ? "text-gray-600" : "text-gray-300"
              }`}
            >
              {description}
            </DialogDescription>
          </DialogHeader>

          {predefinedReasons.length > 0 && (
            <div className="mb-4">
              <div
                className={`text-sm font-medium mb-2 ${
                  theme === "light" ? "text-gray-700" : "text-gray-200"
                }`}
              >
                Select a reason:
              </div>
              <div className="space-y-2">
                {predefinedReasons.map((preReason) => (
                  <div
                    key={preReason}
                    onClick={() => setSelectedPredefined(preReason)}
                    className={`p-2 rounded-md cursor-pointer text-sm ${
                      selectedPredefined === preReason
                        ? theme === "light"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : "bg-blue-900 text-blue-100 border border-blue-700"
                        : theme === "light"
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-800"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                    }`}
                  >
                    {preReason}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className={`text-sm font-medium mb-2 ${
              theme === "light" ? "text-gray-700" : "text-gray-200"
            }`}
          >
            {predefinedReasons.length > 0
              ? "Or enter a custom reason:"
              : "Enter a reason:"}
          </div>
          <textarea
            className={`w-full h-32 px-3 py-2 text-sm rounded-md border ${
              theme === "light"
                ? "border-gray-300 focus:border-blue-500 bg-white text-gray-900"
                : "border-gray-700 focus:border-blue-400 bg-gray-700 text-white"
            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
            placeholder="Enter reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="flex justify-end space-x-3 mt-4">
            <Button
              variant={theme === "light" ? "outline" : "secondary"}
              onClick={onClose}
              className={theme === "dark" ? "text-gray-200" : ""}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!reason.trim()}
              className={`${
                theme === "dark" ? "bg-red-600 hover:bg-red-700" : ""
              } ${!reason.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {actionText}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  theme?: "light" | "dark";
}

export function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  theme = "light",
}: RejectModalProps) {
  return (
    <ActionReasonModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Reject Artist Request"
      description="Please provide a reason for rejection. This will be sent to the user."
      actionText="Reject"
      theme={theme}
      predefinedReasons={[
        "Incomplete or insufficient artist information",
        "Invalid social media accounts or links",
        "Doesn't meet our artist verification criteria",
        "Inappropriate content in artist profile",
      ]}
    />
  );
}

interface AlbumDetailModalProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
}

export function AlbumDetailModal({
  album,
  isOpen,
  onClose,
  theme = "light",
}: AlbumDetailModalProps) {
  const { dominantColor } = useDominantColor(album?.coverUrl);

  if (!album) return null;

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Sắp xếp bài hát theo trackNumber (nếu có) và sau đó theo title
  const sortedTracks = [...(album.tracks || [])].sort((a, b) => {
    const trackNumberA = a.trackNumber ?? Infinity;
    const trackNumberB = b.trackNumber ?? Infinity;

    if (trackNumberA !== trackNumberB) {
      // Nếu trackNumber khác nhau, sắp xếp theo trackNumber
      return trackNumberA - trackNumberB;
    } else {
      // Nếu trackNumber giống nhau, sắp xếp theo title
      return a.title.localeCompare(b.title);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === "dark" ? "bg-[#1e1e1e] border-[#404040]" : "bg-white"
        } p-0 rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden`} // Changed max-w-4xl to max-w-5xl
      >
        <DialogTitle className="sr-only">{album.title}</DialogTitle>
        <div
          className="relative overflow-y-auto max-h-[90vh]"
          style={{
            background: dominantColor
              ? `linear-gradient(180deg, 
                  ${dominantColor} 0%, 
                  ${dominantColor}99 15%,
                  ${dominantColor}40 30%,
                  ${theme === "light" ? "#ffffff" : "#1e1e1e"} 100%)`
              : theme === "light"
              ? "linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)"
              : "linear-gradient(180deg, #2c2c2c 0%, #1e1e1e 100%)",
          }}
        >
          <div className="p-6 pb-2">
            {/* Album header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Album Cover */}
              {album.coverUrl && (
                <div className="w-[200px] flex-shrink-0">
                  <img
                    src={album.coverUrl}
                    alt={album.title}
                    className={`w-full aspect-square object-cover rounded-xl shadow-2xl ${
                      theme === "light"
                        ? "shadow-gray-200/50"
                        : "shadow-black/50"
                    }`}
                  />
                </div>
              )}

              {/* Album Info */}
              <div className="flex flex-col gap-3 text-center md:text-left">
                <h2
                  className={`text-2xl md:text-3xl font-bold ${
                    theme === "light" ? "text-gray-900" : "text-white"
                  }`}
                >
                  {album.title}
                </h2>

                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <span
                    className={
                      theme === "light" ? "text-gray-900" : "text-white/90"
                    }
                  >
                    {album.artist?.artistName || "Unknown Artist"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                  <div
                    className={`flex items-center gap-1.5 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(album.releaseDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                    }`}
                  >
                    <Music className="w-4 h-4" />
                    <span>{album.totalTracks || 0} tracks</span>
                  </div>
                </div>

                {album.genres?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap justify-center md:justify-start mt-2">
                    {album.genres.map(({ genre }) => (
                      <span
                        key={genre?.id || "unknown"}
                        className={`px-2.5 py-0.5 rounded-full text-xs ${
                          theme === "light"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-white/10 text-white/80"
                        }`}
                      >
                        {genre?.name || "Unknown Genre"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Track List */}
          {sortedTracks.length > 0 && (
            <div className="px-6 pb-6 pt-2">
              <div
                className={`w-full rounded-xl overflow-hidden border backdrop-blur-sm ${
                  theme === "light"
                    ? "bg-gray-50/90 border-gray-200"
                    : "bg-black/20 border-white/10"
                }`}
              >
                {/* Header - Desktop only */}
                <div
                  className={`hidden md:block px-6 py-3 border-b ${
                    theme === "light" ? "border-gray-200" : "border-white/10"
                  }
                    }`}
                >
                  <div
                    className={`grid grid-cols-[48px_4fr_2fr_250px_100px] gap-4 text-xs ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                    }
                    }`}
                  >
                    <div className="text-center">#</div>
                    <div>Title</div>
                    <div>Artists</div>
                    <div className="text-center">Player</div>
                    <div className="text-right">Duration</div>
                  </div>
                </div>

                <div
                  className={`divide-y ${
                    theme === "light" ? "divide-gray-200" : "divide-white/10"
                  }`}
                >
                  {sortedTracks.map((track) => (
                    <div
                      key={track.id}
                      className={`md:grid md:grid-cols-[48px_4fr_2fr_250px_100px] md:gap-4 px-4 md:px-6 py-2.5 md:py-3 ${
                        theme === "light"
                          ? "hover:bg-gray-100"
                          : "hover:bg-white/5"
                      }`}
                    >
                      {/* Track number */}
                      <div
                        className={`hidden md:flex items-center justify-center ${
                          theme === "light" ? "text-gray-600" : "text-white/60"
                        }`}
                      >
                        {track.trackNumber}
                      </div>

                      {/* Mobile Layout - Including Player */}
                      <div className="md:hidden flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col flex-1 min-w-0">
                            <span
                              className={`font-medium text-sm line-clamp-1 ${
                                theme === "light"
                                  ? "text-gray-900"
                                  : "text-white"
                              }`}
                            >
                              {track.title}
                            </span>
                            <div
                              className={`text-xs line-clamp-1 ${
                                theme === "light"
                                  ? "text-gray-600"
                                  : "text-white/60"
                              }`}
                            >
                              {track.artist?.artistName || "Unknown Artist"}
                              {track.featuredArtists?.length > 0 && (
                                <span
                                  className={
                                    theme === "light"
                                      ? "text-gray-400"
                                      : "text-white/40"
                                  }
                                >
                                  {" "}
                                  • feat.{" "}
                                  {track.featuredArtists
                                    .map(
                                      ({ artistProfile }) =>
                                        artistProfile?.artistName ||
                                        "Unknown Artist"
                                    )
                                    .join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-sm whitespace-nowrap pl-3 ${
                              theme === "light"
                                ? "text-gray-600"
                                : "text-white/60"
                            }`}
                          >
                            {formatDuration(track.duration)}
                          </span>
                        </div>
                        {/* Mobile Audio Player */}
                        {track.audioUrl && (
                          <div className="w-full">
                            <audio
                              controls
                              src={track.audioUrl}
                              className="w-full h-8 rounded-md"
                              style={{
                                filter:
                                  theme === "dark"
                                    ? "invert(1) sepia(0.1) saturate(0.8) hue-rotate(180deg)"
                                    : "none",
                              }}
                            >
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                      </div>

                      {/* Desktop Layout */}
                      <div
                        className={`hidden md:flex items-center min-w-0 ${
                          theme === "light" ? "text-gray-900" : "text-white"
                        }`}
                      >
                        <span className="font-medium line-clamp-1">
                          {track.title}
                        </span>
                      </div>

                      <div className="hidden md:flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`line-clamp-1 ${
                              theme === "light"
                                ? "text-gray-900"
                                : "text-white/90"
                            }`}
                          >
                            {track.artist?.artistName || "Unknown Artist"}
                          </span>
                        </div>
                        {track.featuredArtists?.length > 0 && (
                          <div
                            className={`text-xs line-clamp-1 mt-0.5 ${
                              theme === "light"
                                ? "text-gray-500"
                                : "text-white/50"
                            }`}
                          >
                            feat.{" "}
                            {track.featuredArtists
                              .map(
                                ({ artistProfile }) =>
                                  artistProfile?.artistName || "Unknown Artist"
                              )
                              .join(", ")}
                          </div>
                        )}
                      </div>

                      {/* Desktop Audio Player */}
                      <div className="hidden md:flex items-center">
                        {track.audioUrl && (
                          <audio
                            controls
                            src={track.audioUrl}
                            className="w-full h-8 rounded-md"
                            style={{
                              filter:
                                theme === "dark"
                                  ? "invert(1) sepia(0.1) saturate(0.8) hue-rotate(180deg)"
                                  : "none",
                            }}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        )}
                      </div>

                      <div
                        className={`hidden md:flex items-center justify-end ${
                          theme === "light" ? "text-gray-600" : "text-white/60"
                        }`}
                      >
                        {formatDuration(track.duration)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Copyright Label Footer */}
                {album.label && (
                  <div
                    className={`px-6 py-3 text-xs ${
                      theme === "light" ? "text-gray-500" : "text-white/40"
                    }`}
                  >
                    © {album.label.name || "Unknown Label"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
      {/* Close Button */}
      <DialogClose
        className={`absolute top-3 right-3 p-1 rounded-full transition-colors ${
          theme === "light"
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
            : "bg-white/10 text-white/70 hover:bg-white/20"
        }`}
      >
        <X className="w-5 h-5" />
        <span className="sr-only">Close</span>
      </DialogClose>
    </Dialog>
  );
}

interface TrackDetailModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
  theme?: "light" | "dark";
  currentArtistId?: string;
}

export function TrackDetailModal({
  track,
  isOpen,
  onClose,
  theme = "light",
  currentArtistId,
}: TrackDetailModalProps) {
  const router = useRouter();
  const { dominantColor } = useDominantColor(track?.coverUrl);

  if (!track) return null;

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
      return "0:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleArtistClick = (artistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(); // Close the current modal first
    router.push(`/admin/artists/${artistId}`);
  };

  const handleAlbumClick = (albumId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(); // Close the current modal first
    if (track.artist?.id) {
      router.push(`/admin/artists/${track.artist.id}?album=${albumId}`);
    } else {
      router.push(`/admin/albums?selected=${albumId}`);
    }
  };

  // Check if the track's main artist is the same as the current viewing artist
  const isCurrentArtist =
    currentArtistId && track.artist?.id === currentArtistId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === "dark" ? "bg-[#1e1e1e] border-[#404040]" : "bg-white"
        } p-0 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden`}
      >
        <DialogTitle className="sr-only">{track.title}</DialogTitle>
        <div
          className="relative overflow-y-auto max-h-[90vh]"
          style={{
            background: dominantColor
              ? `linear-gradient(180deg, 
                  ${dominantColor} 0%, 
                  ${dominantColor}99 15%,
                  ${dominantColor}40 30%,
                  ${theme === "light" ? "#ffffff" : "#1e1e1e"} 100%)`
              : theme === "light"
              ? "linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)"
              : "linear-gradient(180deg, #2c2c2c 0%, #1e1e1e 100%)",
          }}
        >
          <div className="p-6">
            {/* Track header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Track Cover */}
              <div className="w-[200px] flex-shrink-0">
                <img
                  src={
                    track.coverUrl ||
                    track.album?.coverUrl ||
                    "https://placehold.co/200x200?text=No+Cover"
                  }
                  alt={track.title}
                  className={`w-full aspect-square object-cover rounded-xl shadow-2xl ${
                    theme === "light" ? "shadow-gray-200/50" : "shadow-black/50"
                  }`}
                />
              </div>

              {/* Track Info */}
              <div className="flex flex-col gap-3 text-center md:text-left">
                <h2
                  className={`text-2xl md:text-3xl font-bold ${
                    theme === "light" ? "text-gray-900" : "text-white"
                  }`}
                >
                  {track.title}
                </h2>

                {/* Main Artist - Not clickable if it's the current artist */}
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span
                    className={`font-medium ${
                      !isCurrentArtist ? `cursor-pointer hover:underline` : ``
                    } ${theme === "light" ? "text-gray-900" : "text-white"}`}
                    onClick={(e) =>
                      !isCurrentArtist &&
                      track.artist?.id &&
                      handleArtistClick(track.artist.id, e)
                    }
                  >
                    {track.artist?.artistName || "Unknown Artist"}
                  </span>
                </div>

                {/* Featured Artists Section with improved styling */}
                {track.featuredArtists?.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                    <div
                      className={`inline-flex items-center ${
                        theme === "light"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-gray-800/40 text-gray-300"
                      } px-2.5 py-1 rounded-full text-sm`}
                    >
                      <span
                        className={
                          theme === "light" ? "text-gray-500" : "text-gray-400"
                        }
                      >
                        feat.
                      </span>
                      <div className="flex flex-wrap items-center ml-1">
                        {track.featuredArtists.map(
                          ({ artistProfile }, index) => (
                            <div
                              key={artistProfile?.id || index}
                              className="flex items-center"
                            >
                              {index > 0 && (
                                <span className="mx-1 opacity-60">•</span>
                              )}
                              <button
                                className="hover:underline font-medium inline-flex items-center"
                                onClick={(e) =>
                                  artistProfile?.id &&
                                  handleArtistClick(artistProfile.id, e)
                                }
                              >
                                {artistProfile?.artistName || "Unknown Artist"}
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                  <div
                    className={`flex items-center gap-1.5 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(track.releaseDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                    }`}
                  >
                    <Music className="w-4 h-4" />
                    <span>{formatDuration(track.duration)}</span>
                  </div>
                </div>

                {track.album && (
                  <div className="mt-4">
                    <span
                      className={`text-sm font-medium ${
                        theme === "light" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      From the album:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <img
                        src={track.album.coverUrl}
                        alt={track.album.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <div
                          className={`text-sm font-medium ${
                            theme === "light" ? "text-gray-900" : "text-white"
                          }`}
                        >
                          {track.album.title}
                        </div>
                        <div
                          className={`text-xs ${
                            theme === "light"
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {track.album.type}
                          {"releaseDate" in track.album &&
                            ` • ${new Date(
                              track.album.releaseDate as string
                            ).getFullYear()}`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {track.genres?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap justify-center md:justify-start mt-2">
                    {track.genres.map(({ genre }) => (
                      <span
                        key={genre?.id || "unknown"}
                        className={`px-2.5 py-0.5 rounded-full text-xs ${
                          theme === "light"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-white/10 text-white/80"
                        }`}
                      >
                        {genre?.name || "Unknown Genre"}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2">
                  <div
                    className={`flex items-center gap-2 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                    }`}
                  >
                    <span>Track #:</span>
                    <span
                      className={
                        theme === "light" ? "text-gray-900" : "text-white"
                      }
                    >
                      {track.trackNumber}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-2 mt-1 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                    }`}
                  >
                    <span>Play count:</span>
                    <span
                      className={
                        theme === "light" ? "text-gray-900" : "text-white"
                      }
                    >
                      {track.playCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Track Label */}
          <div
            className={`px-6 pb-4 pt-2 text-xs ${
              theme === "dark" ? "text-white/40" : "text-gray-500"
            }`}
          >
            {track.label && (
              <span>© {track.label.name || "Unknown Label"}</span>
            )}
          </div>

          {/* Track Audio Player */}
          {track.audioUrl && (
            <div className="mt-4 w-full">
              <audio
                controls
                src={track.audioUrl}
                className={`w-full rounded-lg ${
                  theme === "dark"
                    ? "bg-[#282828] shadow-md shadow-black/30"
                    : "bg-gray-100 shadow-sm"
                }`}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Add any other info or actions here */}
        </div>
      </DialogContent>
      {/* Close Button */}
      <DialogClose
        className={`absolute top-3 right-3 p-1 rounded-full transition-colors ${
          theme === "light"
            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
            : "bg-white/10 text-white/70 hover:bg-white/20"
        }`}
      >
        <X className="w-5 h-5" />
        <span className="sr-only">Close</span>
      </DialogClose>
    </Dialog>
  );
}

interface EditArtistProfileModalProps {
  artistProfile: ArtistProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateSuccess?: () => void;
  theme?: "light" | "dark";
}

export function EditArtistProfileModal({
  artistProfile,
  open,
  onOpenChange,
  onUpdateSuccess,
  theme = "light",
}: EditArtistProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    artistName: "",
    bio: "",
    avatar: undefined as File | string | undefined,
  });
  const [avatarPreview, setAvatarPreview] = useState<string>(
    "/images/default-avatar.jpg"
  );
  const [bannerPreview, setBannerPreview] = useState<string | null>(null); // State for banner preview
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null); // Ref for banner input

  // Effect to update form data when artistProfile changes
  useEffect(() => {
    if (artistProfile) {
      setFormData({
        artistName: artistProfile.artistName,
        bio: artistProfile.bio || "",
        avatar: artistProfile.avatar || "", // Keep track of the original avatar URL
        // Don't store banner file here, just use preview state
      });
      setAvatarPreview(artistProfile.avatar || "/images/default-avatar.jpg");
      setBannerPreview(artistProfile.artistBanner || null); // Set initial banner preview
    } else {
      // Reset form if artistProfile is null (e.g., when modal closes)
      setFormData({ artistName: "", bio: "", avatar: undefined });
      setAvatarPreview("/images/default-avatar.jpg");
      setBannerPreview(null);
    }
  }, [artistProfile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        avatar: file,
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Store the file itself in a separate state if needed, or directly in FormData on submit
      // For simplicity, we'll handle it during submit. Just update preview here.
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Add the file to formData state if you want to track it explicitly
      setFormData((prev) => ({ ...prev, artistBannerFile: file } as any)); // Use 'any' temporarily if type not defined
    }
  };

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const handleBannerClick = () => {
    bannerInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistProfile) return; // Ensure artistProfile exists

    setIsLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        toast.error("Please login again");
        setIsLoading(false);
        return;
      }
      const apiFormData = new FormData();
      apiFormData.append("artistName", formData.artistName);
      apiFormData.append("bio", formData.bio);
      if (formData.avatar instanceof File) {
        apiFormData.append("avatar", formData.avatar);
      }
      // Append banner file if it exists in the temporary state
      const bannerFile = (formData as any).artistBannerFile;
      if (bannerFile instanceof File) {
        apiFormData.append("artistBanner", bannerFile);
      }

      // Update userData in localStorage with new artistProfile
      const response = await api.artists.updateProfile(
        artistProfile.id,
        apiFormData,
        token
      );
      const newArtistProfile = response.data;
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      userData.artistProfile = newArtistProfile;

      localStorage.setItem("userData", JSON.stringify(userData));
      window.dispatchEvent(new StorageEvent("storage", { key: "userData" }));

      toast.success("Updated Artist Profile");
      onOpenChange(false);
      if (onUpdateSuccess) {
        onUpdateSuccess(); // Call success callback
      }
    } catch (error: any) {
      console.error("Error updating artist profile:", error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Determine text and background colors based on theme
  const textColor = theme === "dark" ? "text-white" : "text-gray-900";
  const secondaryTextColor =
    theme === "dark" ? "text-white/70" : "text-gray-500";
  const inputBgColor = theme === "dark" ? "bg-[#3a3a3a]" : "bg-white";
  const inputBorderColor =
    theme === "dark" ? "border-[#505050]" : "border-gray-300";
  const inputFocusBorderColor =
    theme === "dark" ? "focus:border-white/50" : "focus:border-gray-400";
  const inputPlaceholderColor = theme === "dark" ? "placeholder-gray-400" : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${
          theme === "dark" ? "bg-[#2a2a2a] border-[#404040]" : "bg-white"
        } p-6 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle className={`text-xl font-semibold ${textColor}`}>
            Edit Artist Profile
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col space-y-6 mt-4">
          {/* Avatar Preview and Upload */}
          <div className="flex justify-center">
            <div
              className="relative w-40 h-40 flex justify-center group cursor-pointer"
              onClick={handleCoverClick}
            >
              <Image
                src={avatarPreview}
                alt="Avatar Preview"
                width={160}
                height={160}
                className="rounded-full w-full h-full object-cover border-2 border-gray-300 dark:border-gray-600"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full text-white font-semibold">
                Change Avatar
              </div>
              <input
                ref={fileInputRef}
                id="avatarInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Banner Preview and Upload */}
          <div className="space-y-2">
            <label
              className={`block text-sm font-medium ${secondaryTextColor}`}
            >
              Banner Image
            </label>
            <div
              className="relative w-full h-32 flex justify-center items-center group cursor-pointer border-2 border-dashed rounded-md border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              onClick={handleBannerClick}
            >
              {bannerPreview ? (
                <Image
                  src={bannerPreview}
                  alt="Banner Preview"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-md"
                />
              ) : (
                <span className={`${secondaryTextColor} text-center`}>
                  Click to upload banner
                </span>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md text-white font-semibold">
                {bannerPreview ? "Change Banner" : "Upload Banner"}
              </div>
              <input
                ref={bannerInputRef}
                id="bannerInput"
                name="artistBannerFile" // Give it a name
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerFileChange}
              />
            </div>
          </div>

          {/* Artist Name Input */}
          <div className="space-y-2">
            <label
              htmlFor="artistName"
              className={`block text-sm font-medium ${secondaryTextColor}`}
            >
              Artist Name
            </label>
            <Input
              id="artistName"
              name="artistName"
              placeholder="Enter artist name"
              value={formData.artistName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 rounded-md border ${inputBgColor} ${inputBorderColor} ${textColor} ${inputPlaceholderColor} ${inputFocusBorderColor} transition-colors focus:outline-none`}
              required
            />
          </div>

          {/* Bio Textarea */}
          <div className="space-y-2">
            <label
              htmlFor="bio"
              className={`block text-sm font-medium ${secondaryTextColor}`}
            >
              Bio
            </label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Enter artist bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-3 py-2 rounded-md border ${inputBgColor} ${inputBorderColor} ${textColor} ${inputPlaceholderColor} ${inputFocusBorderColor} transition-colors focus:outline-none resize-none`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant={theme === "dark" ? "cancel" : "destructive"}
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditLabelModalProps {
  label: Label | null;
  onClose: () => void;
  onSubmit: (labelId: string, formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
}

export function EditLabelModal({
  label,
  onClose,
  onSubmit,
  theme = "light",
}: EditLabelModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string>(label?.logoUrl || "");

  useEffect(() => {
    const resetState = () => {
      setLogoFile(null);
      setPreviewLogo(label?.logoUrl || "");
    };

    resetState();
  }, [label]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setPreviewLogo(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleLogoClick = () => {
    document.getElementById("logoFile")?.click();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!label) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData(e.currentTarget);

      // Only add the file if a new one was selected
      if (logoFile) {
        formData.set("logoFile", logoFile);
      }

      await onSubmit(label.id, formData);
      onClose();
    } catch (error) {
      toast.error("Failed to update label");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!label) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className={`sm:max-w-md ${
          theme === "dark" ? "bg-[#1e1e1e] text-white border-none" : ""
        }`}
      >
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className={theme === "dark" ? "text-white" : ""}>
              Edit Label
            </DialogTitle>
            <DialogDescription
              className={theme === "dark" ? "text-white/60" : ""}
            >
              Update label information
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div
              className="w-32 h-32 mx-auto rounded-full overflow-hidden cursor-pointer border-2 flex items-center justify-center"
              onClick={handleLogoClick}
            >
              {previewLogo ? (
                <Image
                  src={previewLogo}
                  alt="Label Logo"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Tags
                  className={`w-16 h-16 ${
                    theme === "dark" ? "text-white/40" : "text-gray-400"
                  }`}
                />
              )}
            </div>

            <input
              type="file"
              id="logoFile"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="space-y-2">
              <InputLabel
                htmlFor="name"
                className={theme === "dark" ? "text-white" : ""}
              >
                Label Name
              </InputLabel>
              <Input
                id="name"
                name="name"
                defaultValue={label.name}
                required
                className={
                  theme === "dark"
                    ? "bg-white/[0.07] text-white border-white/[0.1]"
                    : ""
                }
              />
            </div>

            <div className="space-y-2">
              <InputLabel
                htmlFor="description"
                className={theme === "dark" ? "text-white" : ""}
              >
                Description
              </InputLabel>
              <Textarea
                id="description"
                name="description"
                defaultValue={label.description || ""}
                className={
                  theme === "dark"
                    ? "bg-white/[0.07] text-white border-white/[0.1]"
                    : ""
                }
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={
                theme === "dark"
                  ? "bg-transparent text-white border-white/20 hover:bg-white/10"
                  : ""
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={
                theme === "dark" ? "bg-white text-black hover:bg-white/90" : ""
              }
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AddLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  theme?: "light" | "dark";
}

export function AddLabelModal({
  isOpen,
  onClose,
  onSubmit,
  theme = "light",
}: AddLabelModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      setLogoFile(null);
      setPreviewLogo("");
      formRef.current?.reset();
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setPreviewLogo(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleLogoClick = () => {
    document.getElementById("newLogoFile")?.click();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      const formData = new FormData(e.currentTarget);

      if (logoFile) {
        formData.set("logoFile", logoFile);
      }

      await onSubmit(formData);
      onClose();
      formRef.current?.reset();
    } catch (error) {
      toast.error("Failed to create label");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`sm:max-w-md ${
          theme === "dark" ? "bg-[#1e1e1e] text-white border-none" : ""
        }`}
      >
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className={theme === "dark" ? "text-white" : ""}>
              Add New Label
            </DialogTitle>
            <DialogDescription
              className={theme === "dark" ? "text-white/60" : ""}
            >
              Create a new record label
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div
              className="w-32 h-32 mx-auto rounded-full overflow-hidden cursor-pointer border-2 flex items-center justify-center"
              onClick={handleLogoClick}
            >
              {previewLogo ? (
                <Image
                  src={previewLogo}
                  alt="Label Logo"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Tags
                  className={`w-16 h-16 ${
                    theme === "dark" ? "text-white/40" : "text-gray-400"
                  }`}
                />
              )}
            </div>

            <input
              type="file"
              id="newLogoFile"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="space-y-2">
              <InputLabel
                htmlFor="newName"
                className={theme === "dark" ? "text-white" : ""}
              >
                Label Name
              </InputLabel>
              <Input
                id="newName"
                name="name"
                required
                className={
                  theme === "dark"
                    ? "bg-white/[0.07] text-white border-white/[0.1]"
                    : ""
                }
              />
            </div>

            <div className="space-y-2">
              <InputLabel
                htmlFor="newDescription"
                className={theme === "dark" ? "text-white" : ""}
              >
                Description
              </InputLabel>
              <Textarea
                id="newDescription"
                name="description"
                className={
                  theme === "dark"
                    ? "bg-white/[0.07] text-white border-white/[0.1]"
                    : ""
                }
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={
                theme === "dark"
                  ? "bg-transparent text-white border-white/20 hover:bg-white/10"
                  : ""
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={
                theme === "dark" ? "bg-white text-black hover:bg-white/90" : ""
              }
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Label"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MusicAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MusicAuthDialog({ open, onOpenChange }: MusicAuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#121212] text-white">
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4 text-white" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5"
            aria-hidden="true"
          >
            <Music className="h-6 w-6 text-white" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-white">
              Start listening with Soundwave
            </DialogTitle>
            <DialogDescription className="text-center text-white/70">
              Sign up for free to unlock unlimited music streaming and discover
              new artists.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="mt-4 space-y-4">
          <div className="text-sm text-white/70">
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2 text-[#A57865]">•</span>
                Ad-free music listening
              </li>
              <li className="flex items-center">
                <span className="mr-2 text-[#A57865]">•</span>
                Create your own playlists
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/register" className="w-full">
              <Button className="w-full bg-white text-black hover:bg-white/90">
                Sign up free
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button
                variant="outline"
                className="w-full border-white/10 hover:bg-white/5 text-white"
              >
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SystemPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: {
    id?: string;
    name?: string;
    description?: string;
    coverUrl?: string;
    privacy?: "PUBLIC" | "PRIVATE";
    // Add AI parameters here as well
    basedOnMood?: string;
    basedOnGenre?: string;
    basedOnArtist?: string;
    basedOnSongLength?: string;
    basedOnReleaseTime?: string;
    trackCount?: number;
  };
  theme?: "light" | "dark";
  mode: "create" | "edit";
}

export function SystemPlaylistModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  theme = "light",
  mode = "create",
}: SystemPlaylistModalProps) {
  const [name, setName] = useState(initialData.name || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "PRIVATE">(
    initialData.privacy || "PUBLIC"
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initialData.coverUrl || null
  );

  // AI generation parameters - Initialize from initialData
  const [isAIGenerated, setIsAIGenerated] = useState(true);
  const [basedOnMood, setBasedOnMood] = useState(initialData.basedOnMood || "");
  const [basedOnGenre, setBasedOnGenre] = useState(
    initialData.basedOnGenre || ""
  );
  const [basedOnArtist, setBasedOnArtist] = useState(
    initialData.basedOnArtist || ""
  );
  const [basedOnSongLength, setBasedOnSongLength] = useState(
    initialData.basedOnSongLength || ""
  );
  const [basedOnReleaseTime, setBasedOnReleaseTime] = useState(
    initialData.basedOnReleaseTime || ""
  );
  const [trackCount, setTrackCount] = useState(initialData.trackCount || 10);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();

    // Basic playlist data
    formData.append("name", name);
    if (description) formData.append("description", description);
    formData.append("privacy", privacy);

    // If we're editing an existing playlist, include the ID
    if (mode === "edit" && initialData.id) {
      formData.append("id", initialData.id);
    }

    // Include the cover file if one was selected
    if (coverFile) {
      formData.append("cover", coverFile);
    }

    // AI generation parameters
    formData.append("isAIGenerated", String(isAIGenerated));
    if (isAIGenerated) {
      if (basedOnMood) formData.append("basedOnMood", basedOnMood);
      if (basedOnGenre) formData.append("basedOnGenre", basedOnGenre);
      if (basedOnArtist) formData.append("basedOnArtist", basedOnArtist);
      if (basedOnSongLength)
        formData.append("basedOnSongLength", basedOnSongLength);
      if (basedOnReleaseTime)
        formData.append("basedOnReleaseTime", basedOnReleaseTime);
      formData.append("trackCount", String(trackCount));
    }
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error submitting playlist:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`sm:max-w-5xl w-[95vw] h-[85vh] flex flex-col ${
          // Thay max-h-[90vh] bằng h-[85vh]
          theme === "dark"
            ? "bg-[#1e1e1e] text-white border-white/10"
            : "bg-white"
        }`}
      >
        <DialogHeader className="flex-shrink-0">
          {" "}
          {/* Header không co lại */}
          <DialogTitle
            className={theme === "dark" ? "text-white" : "text-gray-900"}
          >
            {mode === "create"
              ? "Create System Playlist"
              : "Edit System Playlist"}
          </DialogTitle>
          <DialogDescription
            className={theme === "dark" ? "text-white/70" : "text-gray-500"}
          >
            {mode === "create"
              ? "Create a new system playlist as a template for user playlists"
              : "Edit the system playlist details"}
          </DialogDescription>
        </DialogHeader>

        {/* Khu vực nội dung chính có thể scroll nội bộ */}
        <div className="flex-grow overflow-y-hidden pt-4">
          {/* Cho phép khu vực này giãn nở, ẩn scrollbar chính */}
          <form
            onSubmit={handleSubmit}
            id="system-playlist-form"
            className="h-full flex flex-col"
          >
            {/* Form chiếm hết chiều cao khu vực giữa */}
            <Tabs
              defaultValue="basic"
              className="w-full flex flex-col flex-grow"
            >
              {/* Tabs chiếm không gian còn lại */}
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                {/* TabsList không co lại */}
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="ai">AI Options</TabsTrigger>
              </TabsList>
              {/* Wrapper cuộn nội bộ cho TabsContent */}
              <div className="flex-grow overflow-y-auto pr-3 mt-6">
                {/* Phần này sẽ cuộn, không cần chiều cao cố định */}
                {/* Nội dung tab Basic Information */}
                <TabsContent value="basic" className="mt-0">
                  <div className="space-y-6">
                    {/* Container cho nội dung */}
                    {/* Giữ lại grid nội bộ cho cover và các trường input cơ bản */}
                    <div className="grid grid-cols-4 gap-4">
                      {/* Cover Image */}
                      <div className="col-span-1">
                        <InputLabel
                          className={`mb-1 block text-sm font-medium ${
                            theme === "dark" ? "text-white/80" : ""
                          }`}
                        >
                          Cover
                        </InputLabel>
                        <div
                          onClick={handleCoverClick}
                          className={`w-full aspect-square rounded-md ${
                            theme === "dark"
                              ? "bg-white/5 hover:bg-white/10"
                              : "bg-gray-100 hover:bg-gray-200"
                          } flex items-center justify-center cursor-pointer overflow-hidden transition-colors`}
                        >
                          {coverPreview ? (
                            <Image
                              src={coverPreview}
                              alt="Playlist cover"
                              width={100}
                              height={100}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="h-10 w-10 text-gray-400" />
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <p
                          className={`text-xs mt-1 text-center ${
                            theme === "dark" ? "text-white/50" : "text-gray-500"
                          }`}
                        >
                          Click to upload
                        </p>
                      </div>
                      {/* Fields: Name, Description, Privacy */}
                      <div className="col-span-3">
                        {" "}
                        {/* Giảm gap thành space-y-3 */}
                        <div>
                          <InputLabel
                            htmlFor="name"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Playlist Name*
                          </InputLabel>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Top Hits of 2023"
                            required
                            maxLength={50} // Thêm giới hạn ký tự
                            className={
                              theme === "dark"
                                ? "bg-white/[0.07] text-white border-white/[0.1]"
                                : ""
                            }
                          />
                          {/* Bộ đếm ký tự cho Title */}
                          <p
                            className={`text-xs text-right mt-1 ${
                              theme === "dark"
                                ? "text-white/50"
                                : "text-gray-500"
                            }`}
                          >
                            {name.length} / 50
                          </p>
                        </div>
                        <div>
                          <InputLabel
                            htmlFor="description"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Description
                          </InputLabel>
                          <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="A short description of the playlist"
                            // rows={2} Bỏ rows đi khi dùng chiều cao cố định
                            maxLength={120} // Thêm giới hạn ký tự
                            className={`h-24 ${
                              // Thêm chiều cao cố định h-24
                              theme === "dark"
                                ? "bg-white/[0.07] text-white border-white/[0.1]"
                                : ""
                            }`}
                            style={{ resize: "none" }} // Thêm style để không cho resize
                          />
                          {/* Bộ đếm ký tự cho Description */}
                          <p
                            className={`text-xs text-right mt-1 ${
                              theme === "dark"
                                ? "text-white/50"
                                : "text-gray-500"
                            }`}
                          >
                            {description.length} / 120
                          </p>
                        </div>
                        <div>
                          <InputLabel
                            htmlFor="privacy"
                            className={theme === "dark" ? "text-white" : ""}
                          >
                            Privacy Setting
                          </InputLabel>
                          <Select
                            value={privacy}
                            onValueChange={(value: "PUBLIC" | "PRIVATE") =>
                              setPrivacy(value)
                            }
                          >
                            <SelectTrigger
                              className={
                                theme === "dark"
                                  ? "bg-white/[0.07] text-white border-white/[0.1]"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Select privacy" />
                            </SelectTrigger>
                            <SelectContent
                              className={
                                theme === "dark"
                                  ? "bg-[#1e1e1e] border-white/10 text-white"
                                  : ""
                              }
                            >
                              <SelectItem value="PUBLIC">Public</SelectItem>
                              <SelectItem value="PRIVATE">Private</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                {/* Nội dung tab AI Options */}
                <TabsContent value="ai" className="mt-0">
                  {/* Chia các trường AI thành 2 cột trên màn hình nhỏ trở lên */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {" "}
                    {/* Giảm gap thành gap-y-3 */}
                    <div>
                      <InputLabel
                        htmlFor="basedOnMood"
                        className={theme === "dark" ? "text-white" : ""}
                      >
                        Based on Mood (optional)
                      </InputLabel>
                      <Input
                        id="basedOnMood"
                        value={basedOnMood}
                        onChange={(e) => setBasedOnMood(e.target.value)}
                        placeholder="e.g., Energetic, Chill, Romantic"
                        className={
                          theme === "dark"
                            ? "bg-white/[0.07] text-white border-white/[0.1]"
                            : ""
                        }
                      />
                    </div>
                    <div>
                      <InputLabel
                        htmlFor="basedOnGenre"
                        className={theme === "dark" ? "text-white" : ""}
                      >
                        Based on Genre (optional)
                      </InputLabel>
                      <Input
                        id="basedOnGenre"
                        value={basedOnGenre}
                        onChange={(e) => setBasedOnGenre(e.target.value)}
                        placeholder="e.g., Rock, Pop, Hip-Hop"
                        className={
                          theme === "dark"
                            ? "bg-white/[0.07] text-white border-white/[0.1]"
                            : ""
                        }
                      />
                    </div>
                    <div>
                      <InputLabel
                        htmlFor="basedOnArtist"
                        className={theme === "dark" ? "text-white" : ""}
                      >
                        Based on Artist (optional)
                      </InputLabel>
                      <Input
                        id="basedOnArtist"
                        value={basedOnArtist}
                        onChange={(e) => setBasedOnArtist(e.target.value)}
                        placeholder="e.g., Taylor Swift, The Weeknd"
                        className={
                          theme === "dark"
                            ? "bg-white/[0.07] text-white border-white/[0.1]"
                            : ""
                        }
                      />
                    </div>
                    <div>
                      <InputLabel
                        htmlFor="basedOnSongLength"
                        className={theme === "dark" ? "text-white" : ""}
                      >
                        Based on Song Length (optional)
                      </InputLabel>
                      <Input
                        id="basedOnSongLength"
                        value={basedOnSongLength}
                        onChange={(e) => setBasedOnSongLength(e.target.value)}
                        placeholder="Enter length category or seconds"
                        className={
                          theme === "dark"
                            ? "bg-white/[0.07] text-white border-white/[0.1]"
                            : ""
                        }
                      />
                      <p
                        className={`text-xs mt-1 ${
                          theme === "dark" ? "text-white/50" : "text-gray-500"
                        }`}
                      >
                        Enter "short" (&lt; 3min), "medium" (3-5min), "long"
                        (&gt; 5min) or specific seconds
                      </p>
                    </div>
                    <div>
                      <InputLabel
                        htmlFor="basedOnReleaseTime"
                        className={theme === "dark" ? "text-white" : ""}
                      >
                        Based on Release Time (optional)
                      </InputLabel>
                      <Input
                        id="basedOnReleaseTime"
                        value={basedOnReleaseTime}
                        onChange={(e) => setBasedOnReleaseTime(e.target.value)}
                        placeholder="Enter a year (e.g., 2022) or keyword"
                        className={
                          theme === "dark"
                            ? "bg-white/[0.07] text-white border-white/[0.1]"
                            : ""
                        }
                      />
                      <p
                        className={`text-xs mt-1 ${
                          theme === "dark" ? "text-white/50" : "text-gray-500"
                        }`}
                      >
                        Enter a specific year (1900-present) or use "new",
                        "recent", "classics"
                      </p>
                    </div>
                    <div>
                      <InputLabel
                        htmlFor="trackCount"
                        className={theme === "dark" ? "text-white" : ""}
                      >
                        Number of Tracks
                      </InputLabel>
                      <Input
                        id="trackCount"
                        type="number"
                        min={5}
                        max={50}
                        value={trackCount}
                        onChange={(e) =>
                          setTrackCount(parseInt(e.target.value) || 10)
                        }
                        className={
                          theme === "dark"
                            ? "bg-white/[0.07] text-white border-white/[0.1]"
                            : ""
                        }
                      />
                      <p
                        className={`text-xs mt-1 ${
                          theme === "dark" ? "text-white/50" : "text-gray-500"
                        }`}
                      >
                        Recommended: 10-20 tracks for optimal generation
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </div>{" "}
              {/* Kết thúc div wrapper cuộn nội bộ */}
            </Tabs>
          </form>
        </div>

        {/* Footer cố định ở cuối DialogContent */}
        <DialogFooter
          className={`flex-shrink-0 mt-auto pt-4 border-t ${
            theme === "dark" ? "border-white/10" : "border-gray-200"
          }`}
        >
          {/* Footer không co lại, nằm cuối */}
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={
              theme === "dark"
                ? "bg-transparent text-white border-white/20 hover:bg-white/5"
                : ""
            }
          >
            Cancel
          </Button>
          <Button
            form="system-playlist-form" // Liên kết nút này với form ở trên
            type="submit"
            className={
              theme === "dark" ? "bg-blue-600 text-white hover:bg-blue-700" : ""
            }
          >
            {mode === "create" ? "Create Playlist" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MakeAdminModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => void;
  theme?: "light" | "dark";
}

export function MakeAdminModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  theme = "light",
}: MakeAdminModalProps) {
  if (!isOpen || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${
          theme === "dark"
            ? "bg-[#2a2a2a] border-[#404040] text-white"
            : "bg-white"
        } p-6 rounded-lg shadow-lg max-w-md w-full`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Confirm Admin Promotion
          </DialogTitle>
          <DialogDescription
            className={theme === "dark" ? "text-gray-400" : "text-gray-500"}
          >
            Are you sure you want to promote this user to Admin (Level 2)?
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          <p>
            <strong>Name:</strong> {user.name || "N/A"}
          </p>
          <p>
            <strong>Username:</strong> {user.username || "N/A"}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Current Role:</strong> {user.role}
          </p>
          {user.adminLevel && (
            <p>
              <strong>Current Admin Level:</strong> {user.adminLevel}
            </p>
          )}
        </div>
        <DialogFooter className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm(user.id)}
          >
            Confirm Promotion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  theme?: "light" | "dark";
  entityType?: "user" | "artist";
}

export function DeactivateModal({
  isOpen,
  onClose,
  onConfirm,
  theme = "light",
  entityType = "user",
}: DeactivateModalProps) {
  const title = `Deactivate ${entityType === "user" ? "User" : "Artist"}`;
  const description = `Please provide a reason for deactivating this ${entityType}. This will be sent to the ${entityType}.`;

  const predefinedReasons = [
    "Violation of terms of service",
    "Inappropriate content or behavior",
    "Account inactivity",
    "User requested deactivation",
  ];

  return (
    <ActionReasonModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      actionText="Deactivate"
      theme={theme}
      predefinedReasons={predefinedReasons}
    />
  );
}

interface ConfirmDeleteModalProps {
  user: { id: string; name?: string | null; email: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string, reason: string) => void;
  theme?: 'light' | 'dark';
  entityType?: string;
}

export function ConfirmDeleteModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  theme = 'light',
  entityType = 'item',
}: ConfirmDeleteModalProps) {
  const [reason, setReason] = useState('');

  // Define predefined reasons directly inside the component
  const predefinedReasons = [
    'Account requested deletion',
    'Violated terms of service',
    'Spam account',
    'Other (specify below)',
  ];

  useEffect(() => {
    if (isOpen) {
      setReason(''); // Reset reason when modal opens
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const entityName = user.name || user.email;

  const handleConfirm = () => {
    if (!reason.trim()) {
      // Optionally add validation/toast here if reason is mandatory
      alert('Please provide a reason for deletion.');
      return;
    }
    onConfirm(user.id, reason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={theme === 'dark' ? 'dark bg-[#1e1e1e] border-gray-700' : ''}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : ''}`}>
            Confirm Deletion
          </DialogTitle>
          <DialogDescription className={theme === 'dark' ? 'text-gray-400' : ''}>
            Are you sure you want to permanently delete the {entityType}{" "}
            <strong>{entityName}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-2">
          <label
            htmlFor="deleteReason"
            className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
          >
            Reason for Deletion (Required)
          </label>
          <Textarea
            id="deleteReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Please provide a reason for deleting this ${entityType}...`}
            className={`min-h-[80px] w-full rounded-md border p-2 text-sm ${theme === 'dark'
                ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
          />
        </div>

        {/* Add predefined reason buttons */} 
        {predefinedReasons.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Or select a predefined reason:</p>
            <div className="flex flex-wrap gap-2">
              {predefinedReasons.map((preReason) => (
                <Button
                  key={preReason}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReason(preReason)}
                  className={`${theme === 'dark' ? 'text-white border-gray-600 hover:bg-gray-700' : ''} ${reason === preReason ? (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200') : ''}`}
                >
                  {preReason}
                </Button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="mt-6 sm:justify-end gap-2">
          <Button variant="outline" onClick={onClose} className={theme === 'dark' ? 'text-white border-gray-600 hover:bg-gray-700' : ''}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim()} // Disable if no reason
            className={theme === 'dark' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            Delete {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
