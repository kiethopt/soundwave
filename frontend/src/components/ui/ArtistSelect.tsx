'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';

export interface ArtistOption {
  id: string;
  artistName: string;
  avatar?: string | null;
}

interface ArtistSelectProps {
  artists: ArtistOption[];
  value: ArtistOption | null;
  onChange: (artist: ArtistOption | null) => void;
  placeholder?: string;
  label?: string;
}

export function ArtistSelect({
  artists,
  value,
  onChange,
  placeholder = 'Select an artist...',
  label,
}: ArtistSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();


  // Filter options based on search term
  const filteredOptions = artists.filter(
    (option) =>
      option.artistName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!value || option.id !== value.id)
  );

  const handleSelect = (option: ArtistOption) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-gray-700' : 'text-white/80'}`}>{label}</label>
      )}
      <div
        className={cn(
          'relative',
        )}
        ref={wrapperRef}
      >
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded-md border min-h-[48px]',
            theme === 'light' ? 'border-gray-300 bg-white' : 'border-white/[0.1] bg-white/[0.07]',
            'focus-within:outline-none focus-within:ring-2',
            theme === 'light' ? 'focus-within:ring-blue-500/20' : 'focus-within:ring-white/20'
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {value ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Avatar className="h-8 w-8">
                {value.avatar ? (
                  <AvatarImage src={value.avatar} alt={value.artistName} />
                ) : (
                  <AvatarFallback>{value.artistName[0]}</AvatarFallback>
                )}
              </Avatar>
              <span className={cn('truncate text-sm', theme === 'light' ? 'text-gray-900' : 'text-white')}>{value.artistName}</span>
              <button
                type="button"
                onClick={handleClear}
                className={cn('ml-auto rounded-full p-1', theme === 'light' ? 'hover:bg-gray-300' : 'hover:bg-white/20')}
                aria-label="Clear selection"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className={cn(
                'w-full bg-transparent focus:outline-none text-sm py-0.5',
                theme === 'light' ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/50'
              )}
              placeholder={placeholder}
            />
          )}
        </div>
        {/* Dropdown */}
        {isOpen && filteredOptions.length > 0 && !value && (
          <div className={cn(
            'absolute z-20 w-full left-0 top-full mt-1 rounded-md shadow-lg border max-h-60 overflow-y-auto',
            theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#181818] border-white/[0.15]'
          )}>
            {filteredOptions.map(option => (
              <div
                key={option.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer',
                  theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                )}
                onClick={() => handleSelect(option)}
              >
                <Avatar className="h-7 w-7">
                  {option.avatar ? (
                    <AvatarImage src={option.avatar} alt={option.artistName} />
                  ) : (
                    <AvatarFallback>{option.artistName[0]}</AvatarFallback>
                  )}
                </Avatar>
                <span className={theme === 'light' ? 'text-gray-900' : 'text-white'}>{option.artistName}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
