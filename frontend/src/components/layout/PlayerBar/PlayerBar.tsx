'use client'

import { useState } from 'react';
import { Pause, Play, Shuffle, Loop, Volume, Prev, Next, Down } from '@/components/ui/Icons';
import { useTrack } from '@/contexts/TrackContext';
import { ListMusic } from 'lucide-react';
import { QueuePanel } from '@/components/player/QueuePanel';

export default function PlayerBar() {
  const [showMobileExpanded, setShowMobileExpanded] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  
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
    skipRandom,
    queue,
  } = useTrack();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleMobileExpanded = () => {
    setShowMobileExpanded(!showMobileExpanded);
  };

  return (
    <>
      {/* Desktop & Tablet Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black p-4 grid-cols-5 gap-4 items-center w-full hidden md:grid">
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
            {/* Shuffle Button */}
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-full hover:bg-[#383838] transition-colors duration-200 ${
                shuffle ? 'text-green-500' : 'text-white'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            {/* Previous Button */}
            <button
              onClick={shuffle ? skipRandom : skipPrevious}
              className="p-2 text-white rounded-full hover:bg-[#383838] transition-colors duration-200"
            >
              <Prev className="w-5 h-5" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={isPlaying ? pauseTrack : () => currentTrack && playTrack(currentTrack)}
              className="p-2 rounded-full bg-[#A57865] hover:bg-[#8a5f4d] transition-colors duration-200"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Next Button */}
            <button
              onClick={shuffle ? skipRandom : skipNext}
              className="p-2 text-white rounded-full hover:bg-[#383838] transition-colors duration-200"
            >
              <Next className="w-5 h-5" />
            </button>

            {/* Loop Button */}
            <button
              onClick={toggleLoop}
              className={`p-2 rounded-full hover:bg-[#383838] transition-colors duration-200 ${
                loop ? 'text-green-500' : 'text-white'
              }`}
            >
              <Loop className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex w-full items-center justify-between max-w-2xl space-x-4">
            <span className="text-white text-sm min-w-fit">{formatTime(progress / 100 * duration)}</span>
            <div className="relative w-full flex items-center group">
              {/* Background bar */}
              <div className="absolute w-full h-1 bg-[#383838] rounded-lg" />
              
              {/* Progress bar */}
              <div 
                className="absolute h-1 bg-white rounded-lg" 
                style={{ width: `${progress ? progress : 0}%` }}
              />

              {/* Range input (thumb is hidden until hover) */}
              <input
                type="range"
                value={isNaN(progress) ? 0 : progress}
                onChange={(e) => seekTrack(parseFloat(e.target.value))}
                className="relative w-full h-1 appearance-none cursor-pointer bg-transparent z-10
                  [&::-webkit-slider-thumb]:appearance-none
                  group-hover:[&::-webkit-slider-thumb]:w-3
                  group-hover:[&::-webkit-slider-thumb]:h-3
                  group-hover:[&::-webkit-slider-thumb]:rounded-full
                  group-hover:[&::-webkit-slider-thumb]:bg-white
                  group-hover:[&::-webkit-slider-thumb]:border-none
                  group-hover:[&::-webkit-slider-thumb]:shadow-lg
                  group-hover:[&::-moz-range-thumb]:w-3
                  group-hover:[&::-moz-range-thumb]:h-3
                  group-hover:[&::-moz-range-thumb]:rounded-full
                  group-hover:[&::-moz-range-thumb]:bg-white
                  group-hover:[&::-moz-range-thumb]:border-none
                  group-hover:[&::-moz-range-thumb]:shadow-lg
                  group-hover:[&::-ms-thumb]:w-3
                  group-hover:[&::-ms-thumb]:h-3
                  group-hover:[&::-ms-thumb]:rounded-full
                  group-hover:[&::-ms-thumb]:bg-white
                  group-hover:[&::-ms-thumb]:border-none
                  group-hover:[&::-ms-thumb]:shadow-lg"
                min="0"
                max="100"
              />
            </div>
            <span className="text-white text-sm min-w-fit">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Control & Queue */}
        <div className="flex items-center justify-end space-x-4 col-span-1">
          {/* Queue Button */}
          <button 
            onClick={() => setIsQueueOpen(prev => !prev)} 
            className={`relative p-2 rounded-full hover:bg-[#383838] transition-colors duration-200 ${
              isQueueOpen ? 'text-[#A57865]' : 'text-white'
            }`}
          >
            <ListMusic className="w-5 h-5" />
            {queue.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#A57865] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>
          
          {/* Volume Icon */}
          <Volume className="w-5 h-5 text-white" />

          {/* Volume Slider Container */}
          <div className="relative w-24 flex items-center">
            {/* Background Track */}
            <div className="absolute w-full h-1 bg-[#383838] rounded-lg" />

            {/* Filled Track */}
            <div 
              className="absolute h-1 bg-white rounded-lg" 
              style={{ width: `${volume * 100}%` }}
            />

            {/* Slider Input */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="relative w-full h-1 appearance-none cursor-pointer bg-transparent z-10
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:z-20
                [&::-moz-range-thumb]:w-3
                [&::-moz-range-thumb]:h-3
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-white
                [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:z-20
                [&::-ms-thumb]:w-3
                [&::-ms-thumb]:h-3
                [&::-ms-thumb]:rounded-full
                [&::-ms-thumb]:bg-white
                [&::-ms-thumb]:z-20"
            />
          </div>
        </div>
      </div>

      {/* Mobile Player Bar */}
      {currentTrack && (
        <>
          <div 
            onClick={toggleMobileExpanded}
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-[#383838] px-4 py-6 flex items-center w-full cursor-pointer"
          >
            {/* Track Image */}
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-14 h-14 rounded shadow-md"
            />
            
            {/* Track Info */}
            <div className="ml-3 flex-1 overflow-hidden">
              <h3 className="text-white text-base font-medium text-ellipsis overflow-hidden whitespace-nowrap">
                {currentTrack.title}
              </h3>
              <p className="text-white/60 text-sm text-ellipsis overflow-hidden whitespace-nowrap">
                {typeof currentTrack.artist === 'string'
                  ? currentTrack.artist
                  : currentTrack.artist.artistName}
              </p>
            </div>
            
            {/* Control Buttons */}
            <div className="flex items-center">
              {/* Play/Pause Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  isPlaying ? pauseTrack() : (currentTrack && playTrack(currentTrack));
                }}
                className="p-3 rounded-full bg-[#A57865] hover:bg-[#8a5f4d] transition-colors duration-200 ml-2"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
          </div>
          
          {/* Expanded Mobile Player */}
          {showMobileExpanded && (
            <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col">
              {/* Header with close button */}
              <div className="flex items-center justify-between p-4">
                <button 
                  onClick={toggleMobileExpanded}
                  className="text-white p-2"
                >
                  <Down className="w-6 h-6" />
                </button>
                <h2 className="text-white text-lg font-medium">Now Playing</h2>
                <div className="w-10"></div>
              </div>
              
              {/* Track Info */}
              <div className="flex-grow flex flex-col items-start justify-center px-6">
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-full rounded-md shadow-2xl mb-4"
                />
                
                {/* Track Title */}
                <h1 className="text-white text-lg font-bold text-center mb-2">
                  {currentTrack.title.toUpperCase()}
                </h1>
                <p className="text-white/70 text-base text-center mb-6">
                  {typeof currentTrack.artist === 'string'
                    ? currentTrack.artist
                    : currentTrack.artist.artistName}
                </p>
                
                {/* Progress Bar */}
                <div className="w-full max-w-md mb-4">
                  <div className="flex w-full items-center justify-between space-x-4 mb-4">
                    <span className="text-white text-sm">
                      {formatTime(progress / 100 * duration)}
                    </span>
                    <span className="text-white text-sm">
                      {formatTime(duration)}
                    </span>
                  </div>
                  
                  <div className="relative w-full h-1 bg-[#383838] rounded-lg items-center flex group">
                    <div 
                      className="absolute h-1 bg-white rounded-lg" 
                      style={{ width: `${progress ? progress : 0}%` }}
                    />
                    <input
                      type="range"
                      value={isNaN(progress) ? 0 : progress}
                      onChange={(e) => seekTrack(parseFloat(e.target.value))}
                      className="absolute w-full appearance-none cursor-pointer bg-transparent
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:border-none
                        [&::-webkit-slider-thumb]:z-20
                        [&::-moz-range-thumb]:w-3
                        [&::-moz-range-thumb]:h-3
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-white
                        [&::-moz-range-thumb]:border-none
                        [&::-moz-range-thumb]:z-20"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center my-6 w-full">                
                  {/* Main Controls */}
                  <div className="flex items-center justify-center space-x-4 w-full">
                    <button
                      onClick={toggleShuffle}
                      className={`p-2 rounded-full transition-colors duration-200 ${
                        shuffle ? 'text-green-500' : 'text-white'
                      }`}
                    >
                      <Shuffle className="w-6 h-6" />
                    </button>

                    <button
                      onClick={shuffle ? skipRandom : skipPrevious}
                      className="p-2 text-white"
                    >
                      <Prev className="w-8 h-8" />
                    </button>
                    
                    <button
                      onClick={isPlaying ? pauseTrack : () => currentTrack && playTrack(currentTrack)}
                      className="p-3 rounded-full bg-[#A57865] hover:bg-[#8a5f4d] transition-colors duration-200"
                    >
                      {isPlaying ? (
                        <Pause className="w-10 h-10 text-white" />
                      ) : (
                        <Play className="w-10 h-10 text-white" />
                      )}
                    </button>
                    
                    <button
                      onClick={shuffle ? skipRandom : skipNext}
                      className="p-2 text-white"
                    >
                      <Next className="w-8 h-8" />
                    </button>

                    <button
                      onClick={toggleLoop}
                      className={`p-2 rounded-full transition-colors duration-200 ${
                        loop ? 'text-green-500' : 'text-white'
                      }`}
                    >
                      <Loop className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
              
              
            </div>
          )}
        </>
      )}

      {/* Queue panel overlay */}
      {isQueueOpen && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setIsQueueOpen(false)} />
      )}
      
      {/* Queue panel */}
      <QueuePanel isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
    </>
  );
}