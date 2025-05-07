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
import { MagicWand, XIcon } from "@/components/ui/Icons"; 

interface GenerateAIPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistCreated: () => void; 
}

export function GenerateAIPlaylistModal({
  isOpen,
  onClose,
  onPlaylistCreated,
}: GenerateAIPlaylistModalProps) {
  const { theme } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      const response = await api.generate.createPlaylistFromPrompt({ prompt }, token);
      
      if (response && response.playlist) { 
        toast.success(response.message || 'AI Playlist generated successfully!');
        onPlaylistCreated(); 
        onClose();
      } else {
        const errorMessage = response?.message || 'Failed to generate AI playlist. The AI might not have found suitable tracks.';
        toast.error(errorMessage);
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
             <MagicWand className={`w-6 h-6 mr-2 ${theme === 'dark' ? 'text-primary' : 'text-primary-dark'}`} />
            Create Playlist with AI
          </DialogTitle>
          <DialogClose asChild>
            <button
                className={`absolute right-4 top-4 rounded-full p-1 transition-colors ${
                    theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-neutral-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
                onClick={handleClose}
                disabled={isLoading}
                aria-label="Close"
                >
                <XIcon className="h-5 w-5" />
            </button>
          </DialogClose>
          <DialogDescription className={`pt-2 text-sm ${
             theme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'
          }`}>
            Describe the kind of playlist you want (e.g., mood, genre, artists). The AI will curate it based on available tracks.
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
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isLoading || !prompt.trim()} 
            className={`inline-flex items-center justify-center px-5 py-2 min-w-[120px] rounded-md text-sm font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#282828] ${
              isLoading || !prompt.trim() 
                ? (theme === 'dark' ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                : (theme === 'dark' ? 'bg-yellow-500 text-black hover:bg-yellow-400 font-bold' : 'bg-primary-dark hover:bg-primary-dark/80 text-white focus-visible:ring-primary-dark')
            } ${isLoading ? 'opacity-70' : ''}`}
           >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <MagicWand className="w-5 h-5 mr-2" />
                <span>Generate</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 