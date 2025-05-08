import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogFooter, 
  DialogTitle, 
  DialogDescription, 
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';
import { api } from '@/utils/api';
import { MagicWand } from "@/components/ui/Icons"; 
import { Bot } from 'lucide-react';
import Image from 'next/image';

interface GenerateAIPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistCreated: () => void; 
  playlistId?: string;
  currentPlaylistName?: string;
}

const presetPrompts = [
  "Add more songs by similar artists",
  "Find some upbeat tracks for this playlist",
  "Suggest older hits by these artists",
  "Add relaxing background music",
  "Include tracks with a faster tempo",
];

export function GenerateAIPlaylistModal({
  isOpen,
  onClose,
  onPlaylistCreated,
  playlistId,
  currentPlaylistName,
}: GenerateAIPlaylistModalProps) {
  const { theme } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isSuggestMode = !!playlistId;

  useEffect(() => {
    if (isOpen) {
      setPrompt(''); 
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt to generate the playlist.');
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsLoading(false);
      onClose();
      return;
    }

    try {
      if (isSuggestMode && playlistId) {
        console.log(`Suggesting tracks for playlist ${playlistId} with prompt: "${prompt}"`);
        const response = await api.playlists.suggestAndAddTracksByPrompt(playlistId, prompt, token);

        if (response.success) {
            toast.success(response.message || `Tracks suggested and added successfully!`);
            onPlaylistCreated();
            onClose();
        } else {
            const errorMessage = response?.message || 'Failed to suggest tracks. The AI might not have found suitable matches.';
            toast.error(errorMessage);
        }
      } else {
        const response = await api.generate.createPlaylistFromPrompt({ prompt }, token);
        
        if (response && response.playlist) { 
          toast.success(response.message || 'AI Playlist generated successfully!');
          onPlaylistCreated(); 
          onClose();
        } else {
          const errorMessage = response?.message || 'Failed to generate AI playlist. The AI might not have found suitable tracks.';
          toast.error(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Error generating AI playlist:', error);
      toast.error(error.message || 'An error occurred while generating the playlist.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}> 
      <DialogContent 
         className={`sm:max-w-[525px] p-6 rounded-lg shadow-xl ${
           theme === 'dark' 
             ? 'dark bg-[#282828] text-white border border-neutral-700' 
             : 'bg-white text-black border border-gray-200'
         }`}
         onInteractOutside={handleClose} 
         onEscapeKeyDown={handleClose} 
      >
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center text-xl font-semibold">
             {isSuggestMode ? (
                <Image 
                  src="https://res.cloudinary.com/dutg3z2do/image/upload/v1746724091/googleGemini_icon_wabfgl.png"
                  alt="AI Icon"
                  width={24}
                  height={24}
                  className="mr-2 rounded-full"
                />
             ) : (
                <MagicWand className={`w-6 h-6 mr-2 ${theme === 'dark' ? 'text-primary' : 'text-primary-dark'}`} />
             )}
            {isSuggestMode ? `Suggest Tracks for "${currentPlaylistName || 'Playlist'}"` : 'Create Playlist with AI'}
          </DialogTitle>
          <DialogDescription className={`pt-2 text-sm ${
             theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'
          }`}>
            {isSuggestMode
              ? 'Describe the kind of tracks you want to add (e.g., mood, genre, specific artists).'
              : 'Describe the kind of playlist you want (e.g., mood, genre, artists). The AI will curate it based on available tracks.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="prompt-input" className={`text-sm font-medium ${
                theme === 'dark' ? 'text-neutral-200' : 'text-neutral-800'
            }`}>
              Your Prompt
            </Label>
            <textarea
              id="prompt-input"
              rows={4}
              placeholder='e.g., "Chill V-Pop for a rainy day" or "Workout mix with tracks by Keshi and Joji"'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              className={`w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-offset-1 focus:ring-opacity-75 resize-none ${
                theme === 'dark'
                  ? 'bg-neutral-700 border-neutral-600 placeholder-neutral-400 text-white focus:ring-primary focus:border-primary'
                  : 'bg-gray-50 border-gray-300 placeholder-gray-500 text-black focus:ring-primary-dark focus:border-primary-dark'
              }`}
            />
          </div>
          {isSuggestMode && (
            <div className="mt-3 mb-1">
              <Label className={`text-xs font-medium ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}> 
                Or try these suggestions:
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {presetPrompts.map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => setPrompt(preset)} 
                    className={`text-xs h-auto py-1 px-2 ${ 
                      theme === 'dark' 
                      ? 'border-neutral-600 bg-neutral-700/50 hover:bg-neutral-700' 
                      : 'border-gray-300 bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
           <Button 
              variant="ghost" 
              onClick={handleClose} 
              disabled={isLoading}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                  theme === 'dark' ? 'text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100' : 'text-gray-700 hover:bg-gray-100'
              }`}
           >
            Cancel
          </Button>
          {isLoading ? (
              <Button
                  disabled={true}
                  className={`relative inline-flex h-auto items-center justify-center overflow-hidden rounded-full p-[1px] text-sm font-semibold focus:outline-none min-w-[120px] cursor-not-allowed ${
                    theme === 'dark' ? 'focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-[#282828]' : 'focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-white'
                  }`}
              >
                  <span className={`absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]`} />
                  <span className={`relative z-10 inline-flex h-full w-full cursor-not-allowed items-center justify-center rounded-full px-[calc(0.75rem-1px)] py-[calc(0.375rem-1px)] transition-colors ${
                    theme === 'dark' ? 'bg-[#282828] text-neutral-100' : 'bg-white text-gray-800'
                  }`}>
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-50" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{isSuggestMode ? 'Suggesting...' : 'Generating...'}</span>
                  </span>
              </Button>
          ) : (
            <Button 
              type="button" 
              onClick={handleSubmit} 
              disabled={!prompt.trim()} 
              className={`inline-flex items-center justify-center px-5 py-2 min-w-[120px] rounded-full text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#282828] ${
                !prompt.trim() 
                  ? (theme === 'dark' ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                  : (theme === 'dark' ? 'bg-yellow-500 text-black hover:bg-yellow-400 font-bold' : 'bg-primary-dark hover:bg-primary-dark/80 text-white focus-visible:ring-primary-dark')
              }`}
            >
              <Bot className="w-5 h-5 mr-2" />
              <span>{isSuggestMode ? 'Suggest Tracks' : 'Generate'}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 