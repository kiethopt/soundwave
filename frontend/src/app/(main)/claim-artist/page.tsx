"use client";

import { useEffect, useState, useRef } from "react";
import { ArtistSelect } from "@/components/ui/ArtistSelect";
import { api } from "@/utils/api";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Upload, FileText, X, Clock, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from "next/navigation";
import { ArtistClaimRequest } from "@/types/index"
import { Button } from "@/components/ui/button";


interface ArtistOption {
  id: string;
  artistName: string;
  avatar?: string | null;
  userId?: string | null;
}

export default function ClaimArtistPage() {
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<ArtistOption | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [artistTouched, setArtistTouched] = useState(false);
  const [filesTouched, setFilesTouched] = useState(false);
  const router = useRouter();
  const [userClaims, setUserClaims] = useState<ArtistClaimRequest[]>([]);
  const [hasPendingClaim, setHasPendingClaim] = useState(false);
  const [claimTimestamp, setClaimTimestamp] = useState<number | null>(null);
  const [hasPendingArtistRequest, setHasPendingArtistRequest] = useState<boolean>(false);
  const [hasOverallPendingClaimRequest, setHasOverallPendingClaimRequest] = useState<boolean>(false);
  const [pendingArtistRequestTimestamp, setPendingArtistRequestTimestamp] = useState<number | null>(null);

  
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const token = localStorage.getItem("userToken") || "";
      try {
        // Fetch pending actions status
        const statusResponse = await api.user.getPendingUserActionsStatus(token);
        if (statusResponse) {
          setHasPendingArtistRequest(statusResponse.hasPendingArtistRequest);
          setHasOverallPendingClaimRequest(statusResponse.hasPendingClaimRequest);
        }

        // Fetch existing claims for this user
        const claims = await api.user.getUserClaims(token);
        setUserClaims(claims);

        // Fetch claimable artists (only if NO pending new artist request AND NO overall pending claim request)
        if (!statusResponse?.hasPendingArtistRequest && !statusResponse?.hasPendingClaimRequest) {
          const result = await api.user.getClaimableArtists(token);
          if (result && Array.isArray(result)) {
            setArtists(
              result
                .filter((artist: any) => !artist.userId) // Only unclaimed artists
                .map((artist: any) => ({
                  id: artist.id,
                  artistName: artist.artistName,
                  avatar: artist.avatar,
                  userId: artist.userId,
                }))
            );
          } else {
            toast.error("Failed to load artists for claiming.");
          }
        }
      } catch (e: any) {
        toast.error(e.message || "Failed to load page data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedArtist && userClaims.length > 0) {
      const pendingClaim = userClaims.find(
        claim =>
          claim.artistProfile.id === selectedArtist.id &&
          claim.status === "PENDING"
      );
      setHasPendingClaim(!!pendingClaim);
      setClaimTimestamp(pendingClaim ? new Date(pendingClaim.submittedAt).getTime() : null);
    } else {
      setHasPendingClaim(false);
      setClaimTimestamp(null);
    }
  }, [selectedArtist, userClaims]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(f => {
        const validTypes = [
          'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
          'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const validExts = ['png','jpg','jpeg','gif','webp','pdf','doc','docx'];
        const ext = f.name.split('.').pop()?.toLowerCase();
        return validTypes.includes(f.type) || (ext && validExts.includes(ext));
      });

      // Filter out duplicates by name
      const uniqueFiles = newFiles.filter(f => !files.some(existing => existing.name === f.name));
      uniqueFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviews(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        } else {
          setPreviews(prev => [...prev, 'document']);
        }
      });
      setFiles(prev => [...prev, ...uniqueFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setArtistTouched(true);
    setFilesTouched(true);
    if (!selectedArtist) {
      toast.error("Please select an artist.");
      return;
    }
    if (selectedArtist.userId) {
      toast.error("This artist is already claimed.");
      return;
    }
    if (files.length === 0) {
      toast.error("Please upload at least one proof/evidence file.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("userToken") || "";
      const formData = new FormData();
      formData.append("artistProfileId", selectedArtist.id);
      files.forEach((file) => {
        formData.append("proof[]", file);
      });

      const res = await api.user.submitArtistClaim(token, formData);
      toast.success("Claim submitted successfully! We will review your request.");
      router.push("/");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit claim");
    } finally {
      setLoading(false);
    }
  };

  if (hasOverallPendingClaimRequest) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8", theme === 'dark' ? "bg-neutral-900 text-white" : "bg-white text-black")}>
        <div className={cn("w-full max-w-2xl p-6 sm:p-8 rounded-lg shadow-xl", theme === 'dark' ? "bg-neutral-800" : "bg-neutral-100")}>
          <div className="flex flex-col items-center text-center">
            <Clock className="w-16 h-16 text-yellow-500 mb-6" />
            <h1 className={cn("text-2xl sm:text-3xl font-bold mb-4", theme === 'dark' ? "text-white" : "text-neutral-800")}>
              Pending Artist Claim Submitted
            </h1>
            <p className={cn("text-base sm:text-lg mb-6", theme === 'dark' ? "text-neutral-300" : "text-neutral-600")}>
              You already have a pending artist claim request. Please wait for it to be processed by our administrators.
            </p>
            <p className={cn("text-sm mb-8", theme === 'dark' ? "text-neutral-400" : "text-neutral-500")}>
              We appreciate your patience. You will be notified once your claim request has been reviewed.
            </p>
            <Button
              onClick={() => router.push('/')}
              className={cn("w-full sm:w-auto", theme === 'dark' ? "bg-yellow-500 hover:bg-yellow-600" : "bg-yellow-500 hover:bg-yellow-600 text-white")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (hasPendingArtistRequest) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8", theme === 'dark' ? "bg-neutral-900 text-white" : "bg-white text-black")}>
        <div className={cn("w-full max-w-2xl p-6 sm:p-8 rounded-lg shadow-xl", theme === 'dark' ? "bg-neutral-800" : "bg-neutral-100")}>
          <div className="flex flex-col items-center text-center">
            <Clock className="w-16 h-16 text-yellow-500 mb-6" />
            <h1 className={cn("text-2xl sm:text-3xl font-bold mb-4", theme === 'dark' ? "text-white" : "text-neutral-800")}>
              Pending Artist Profile Request
            </h1>
            <p className={cn("text-base sm:text-lg mb-6", theme === 'dark' ? "text-neutral-300" : "text-neutral-600")}>
              You currently have a pending request to create a new artist profile.
              Please wait for this request to be processed before attempting to claim an existing artist profile.
            </p>
            <p className={cn("text-sm mb-8", theme === 'dark' ? "text-neutral-400" : "text-neutral-500")}>
              We appreciate your patience. You will be notified once your request has been reviewed.
            </p>
            <Button
              onClick={() => router.push('/')}
              className={cn("w-full sm:w-auto", theme === 'dark' ? "bg-yellow-500 hover:bg-yellow-600" : "bg-yellow-500 hover:bg-yellow-600 text-white")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-900 to-neutral-900 text-white">
      <div className="bg-black/40 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-lg p-10 w-full max-w-2xl flex flex-col items-center">
        <div className="flex flex-col w-full mb-10">
          <div className="flex items-center justify-start mb-4">
            <Button
              variant="secondary"
              onClick={() => router.back()}
              className="bg-neutral-700 hover:bg-neutral-600 text-neutral-100 flex items-center gap-2 px-4 py-2 rounded-2xl shadow-md border border-white/10"
              type="button"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </Button>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 drop-shadow-lg mb-2">
            Claim Artist Profile
          </h1>
          <p className="text-md md:text-lg text-gray-300 text-center mb-6">
            Submit your claim to manage your artist profile on Soundwave.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-10 w-full">
          <div>
            <label className={cn("block text-base font-semibold mb-2 text-white/80")}>Artist</label>
            <div className={cn(
              "rounded-2xl border-2 border-white/20 bg-white/10 focus-within:border-purple-400 transition-all p-3 shadow-md",
              artistTouched && !selectedArtist && 'border-red-500'
            )}>
              <ArtistSelect
                artists={artists}
                value={selectedArtist}
                onChange={a => { setSelectedArtist(a); setArtistTouched(true); }}
                placeholder="Select an artist to claim..."
              />
            </div>
            {artistTouched && !selectedArtist && (
              <div className="mt-2 text-xs text-red-400">Artist selection is required.</div>
            )}
            {selectedArtist && selectedArtist.userId && (
              <div className="mt-2 text-sm text-red-400 font-semibold">This artist is already claimed.</div>
            )}
          </div>
          {(selectedArtist && !selectedArtist.userId) && (
            <>
              <div>
                <label className={cn("block text-base font-semibold mb-2 text-white/80")}>Upload Proof/Evidence</label>
                <div className={cn(
                  "mb-4 rounded-2xl text-sm text-white p-5 border border-white/10 bg-white/10 shadow-lg"
                )}>Please upload at least one of the following as evidence:<ul className="list-disc ml-5 mt-2 text-white/80"><li>Screenshot of your social media page (Facebook, Instagram, Twitter, etc.) showing you as the owner/admin</li><li>Email or message from a label or manager confirming your ownership</li><li>Official document or contract linking you to the artist profile (PDF, Word)</li><li>Other clear proof of your connection to this artist</li></ul></div>
                <div
                  className={cn(
                    "w-full min-h-[140px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group p-6 transition-all",
                    "border-white/20 bg-white/10 hover:border-pink-400 hover:bg-white/20 shadow-lg",
                    filesTouched && files.length === 0 && 'border-red-500'
                  )}
                  onClick={handleUploadClick}
                >
                  {previews.length === 0 ? (
                    <div className="text-center p-4">
                      <Upload className="h-14 w-14 mx-auto mb-3 text-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white/40" />
                      <p className="font-medium text-white/70">Click to upload images or documents</p>
                      <p className="text-xs mt-1 text-white/40">PNG, JPG, GIF, PDF, DOC, DOCX up to 10MB each</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                      {previews.map((src, idx) => (
                        <div key={idx} className="relative group rounded-2xl shadow-xl overflow-hidden hover:scale-105 transition-all">
                          {src === 'document' ? (
                            <div className="flex flex-col items-center justify-center w-full h-24 bg-white/10 rounded-2xl">
                              <FileText className="h-8 w-8 text-white/60 mb-1" />
                              <span className="text-xs text-white/80 text-center break-all px-1">{files[idx]?.name}</span>
                            </div>
                          ) : (
                            <img src={src} alt={`Proof ${idx + 1}`} className="w-full h-24 object-cover rounded-2xl" />
                          )}
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); handleRemoveFile(idx); }}
                            className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 opacity-80 hover:opacity-100 shadow-lg"
                            aria-label="Remove file"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl">
                    <p className="text-white text-sm font-medium">{previews.length > 0 ? 'Click to add more files' : 'Upload Files'}</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                {filesTouched && files.length === 0 && (
                  <div className="mt-2 text-xs text-red-400">At least one file is required.</div>
                )}
                {files.length > 0 && (
                  <span className="mt-1 text-xs text-white/60">{files.length} file{files.length > 1 ? 's' : ''} selected</span>
                )}
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl shadow-md bg-neutral-700/60 hover:bg-neutral-700/80 border border-white/10"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={Boolean(loading || (selectedArtist && selectedArtist.userId) || hasPendingClaim)}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white font-bold px-8 py-3 rounded-2xl shadow-xl transition-all transform hover:scale-105"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Submit Claim
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
