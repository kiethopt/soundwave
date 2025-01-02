import React, { useRef, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  isPlaying: boolean;
  onEnded: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  isPlaying,
  onEnded,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying, src]);

  return (
    <audio
      ref={audioRef}
      src={src}
      onEnded={onEnded}
      style={{ display: 'none' }}
    />
  );
};

export default AudioPlayer;
