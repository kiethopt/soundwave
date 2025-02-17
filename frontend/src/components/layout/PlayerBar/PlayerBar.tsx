'use client'

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Shuffle, Loop, Volume, Prev, Next } from '@/components/ui/Icons';
import { useTrack } from '@/contexts/TrackContext';

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    loop,
    shuffle,
    duration,
    playTrack,
    pauseTrack,
    setVolume,
    seekTrack,
    toggleLoop,
    toggleShuffle,
    skipNext,
    skipPrevious,
  } = useTrack();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black p-4 grid grid-cols-5 gap-4 items-center w-full">
      {/* Track Info */}
      <div className="flex items-center col-span-1 overflow-hidden">
        {currentTrack && (
          <>
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-12 h-12 rounded"
            />
            <div className="ml-4 flex-1 overflow-hidden">
              <h3 className="text-white font-medium text-ellipsis overflow-hidden whitespace-nowrap">
                {currentTrack.title}
              </h3>
              <p className="text-white/60 text-sm text-ellipsis overflow-hidden whitespace-nowrap">
                {typeof currentTrack.artist === 'string'
                  ? currentTrack.artist
                  : currentTrack.artist.artistName}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Track Controls */}
      <div className="flex flex-col items-center justify-center col-span-3 space-y-4">
        {/* Track Controls */}
        <div className="flex items-center space-x-4">
          <button onClick={toggleShuffle} className={`p-2 ${shuffle ? 'text-green-500' : 'text-white'}`}>
            <Shuffle className="w-5 h-5" />
          </button>
          <button onClick={skipPrevious} className="p-2 text-white">
            <Prev className="w-5 h-5" />
          </button>
          <button
            onClick={isPlaying ? pauseTrack : () => currentTrack && playTrack(currentTrack)}
            className="p-2 rounded-full bg-[#A57865]"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white" />
            )}
          </button>
          <button onClick={skipNext} className="p-2 text-white">
            <Next className="w-5 h-5" />
          </button>
          <button onClick={toggleLoop} className={`p-2 ${loop ? 'text-green-500' : 'text-white'}`}>
            <Loop className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex w-full items-center justify-between max-w-2xl space-x-4">
          <span className="text-white text-sm">{formatTime(progress / 100 * duration)}</span>
          <input
            type="range"
            value={progress}
            onChange={(e) => seekTrack(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
            min="0"
            max="100"
          />
          <span className="text-white text-sm">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="flex flex-row items-center justify-end space-x-2 hidden md:flex col-span-1">
        <Volume className="w-5 h-5 text-white" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
}