import React from 'react';
import { Music, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface MusicAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MusicAuthDialog = ({ open, onOpenChange }: MusicAuthDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#121212] text-white">
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4 text-white" />
          <span className="sr-only">Close</span>
        </DialogClose>
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
              <li className="flex items-center">
                <span className="mr-2 text-[#A57865]">•</span>
                Listen offline
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
};

export { MusicAuthDialog };
