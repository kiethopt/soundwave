'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X as RemoveIcon, PlusCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface BaseOption {
  id?: string; // Optional ID for existing artists
  name: string;
}

interface ArtistCreatableSelectProps {
  existingArtists: { id: string; name: string }[]; // Artists already in the system
  value: BaseOption[]; // Selected artists (mix of existing and new)
  onChange: (value: BaseOption[]) => void;
  placeholder?: string;
  label?: string;
}

export function ArtistCreatableSelect({
  existingArtists,
  value = [],
  onChange,
  placeholder = 'Search or add artist...', // Updated placeholder
  label,
}: ArtistCreatableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  // Combine existing artists with newly added names (that aren't already existing)
  const allAvailableOptions = [
    ...existingArtists,
    ...value.filter(v => !v.id && !existingArtists.some(e => e.name.toLowerCase() === v.name.toLowerCase()))
             .map(v => ({ id: `new-${v.name}`, name: v.name })) // Give temporary unique ID for mapping if needed
  ];

  // Filter options based on search term, excluding already selected ones
  const filteredOptions = allAvailableOptions.filter(
    (option) =>
      !value.some(v => (v.id && v.id === option.id) || (!v.id && v.name.toLowerCase() === option.name.toLowerCase())) &&
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if the exact search term corresponds to an existing artist or a selected item
  const exactMatchExists = existingArtists.some(opt => opt.name.toLowerCase() === searchTerm.trim().toLowerCase());
  const alreadySelected = value.some(v => v.name.toLowerCase() === searchTerm.trim().toLowerCase());
  const canCreate = searchTerm.trim().length > 0 && !exactMatchExists && !alreadySelected;

  const handleSelect = (option: BaseOption) => {
    if (!value.some(v => (v.id && v.id === option.id) || (!v.id && v.name.toLowerCase() === option.name.toLowerCase()))) {
      onChange([...value, option]);
    }
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus(); // Keep focus for potentially adding more
  };

  const handleCreate = () => {
    if (canCreate) {
      handleSelect({ name: searchTerm.trim() }); // Add as a new name (no ID)
    }
  };

  const handleRemove = (itemToRemove: BaseOption) => {
    onChange(value.filter(v => 
      !( (v.id && v.id === itemToRemove.id) || (!v.id && v.name.toLowerCase() === itemToRemove.name.toLowerCase()) )
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canCreate) {
        handleCreate();
      } else if (filteredOptions.length === 1) {
        // If only one option matches, select it on Enter
        handleSelect(filteredOptions[0]);
      }
    }
    if (e.key === 'Backspace' && searchTerm === '' && value.length > 0) {
      // Remove last item on backspace when input is empty
      handleRemove(value[value.length - 1]);
    }
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
        <label className={`block text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-gray-700' : 'text-white/80'}`}>
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 p-2 rounded-md border',
          theme === 'light' ? 'border-gray-300 bg-white' : 'border-white/[0.1] bg-white/[0.07]',
          'focus-within:outline-none focus-within:ring-2',
           theme === 'light' ? 'focus-within:ring-blue-500/20' : 'focus-within:ring-white/20'
        )}
        onClick={() => inputRef.current?.focus()} // Focus input on container click
        ref={wrapperRef}
      >
        {/* Selected Items Pills */}
        {value.map((item, index) => (
          <span
            key={item.id || `new-${item.name}-${index}`}
            className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded text-sm',
              // Conditional styling based on whether the item has an ID (existing) or not (new)
              item.id 
                ? (theme === 'light' ? 'bg-gray-100 text-gray-800' : 'bg-white/10 text-white/90') 
                : (theme === 'light' ? 'bg-blue-100 text-blue-800' : 'bg-blue-900/30 text-blue-300') // Different style for new artists
            )}
          >
            {item.name}
            <button
              type="button"
              onClick={() => handleRemove(item)}
              className={cn('rounded-full p-0.5', theme === 'light' ? 'hover:bg-gray-300' : 'hover:bg-white/20')}
              aria-label={`Remove ${item.name}`}
            >
              <RemoveIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
        {/* Input Field */}
        <div className="relative flex-grow min-w-[150px]">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full bg-transparent focus:outline-none text-sm py-0.5',
              theme === 'light' ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/50'
            )}
            placeholder={value.length === 0 ? placeholder : ''}
          />
          {/* Dropdown */}
          {isOpen && (searchTerm.length > 0 || filteredOptions.length > 0) && (
            <div className={cn(
              'absolute z-20 w-full mt-2 rounded-md shadow-lg border max-h-60 overflow-y-auto',
              theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#181818] border-white/[0.15]'
            )}>
              {/* Create Option */}
              {canCreate && (
                <div
                  className={cn(
                    'px-3 py-2 cursor-pointer flex items-center gap-2',
                    theme === 'light' ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/5 text-white/80'
                  )}
                  onClick={handleCreate}
                >
                  <PlusCircle className="w-4 h-4" />
                  Create "{searchTerm.trim()}"
                </div>
              )}
              {/* Filtered Existing Options */}
              {filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={cn(
                    'px-3 py-2 cursor-pointer',
                    theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                  )}
                  onClick={() => handleSelect(option)}
                >
                  <span className={theme === 'light' ? 'text-gray-900' : 'text-white'}>
                    {option.name}
                  </span>
                </div>
              ))}
              {/* No Results */}
              {filteredOptions.length === 0 && !canCreate && searchTerm.length > 0 && (
                <div className={cn('px-3 py-2 text-sm', theme === 'light' ? 'text-gray-500' : 'text-white/60')}>
                  No artists found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 