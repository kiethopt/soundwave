import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  label?: string;
  required?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  multiple = false,
  label,
  required = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optionId: string) => {
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      const newValue = currentValue.includes(optionId)
        ? currentValue.filter((id) => id !== optionId)
        : [...currentValue, optionId];
      onChange(newValue);
    } else {
      onChange(optionId);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayValue = () => {
    if (multiple) {
      if (Array.isArray(value) && value.length > 0) {
        const selectedOptions = options.filter((opt) => value.includes(opt.id));
        return (
          <div className="flex flex-wrap gap-2">
            {selectedOptions.map((opt) => (
              <span
                key={opt.id}
                className={`px-2 py-1 rounded-md text-sm ${
                  theme === 'light'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-white/10 text-white'
                }`}
              >
                {opt.name}
              </span>
            ))}
          </div>
        );
      }
      return (
        <span className={theme === 'light' ? 'text-gray-500' : 'text-white/60'}>
          {placeholder}
        </span>
      );
    }

    const selectedOption = options.find((opt) => opt.id === value);
    return selectedOption ? (
      <span className={theme === 'light' ? 'text-gray-900' : 'text-white'}>
        {selectedOption.name}
      </span>
    ) : (
      <span className={theme === 'light' ? 'text-gray-500' : 'text-white/60'}>
        {placeholder}
      </span>
    );
  };

  return (
    <div className="w-full">
      {label && (
        <label
          className={`block text-sm font-medium mb-2 ${
            theme === 'light' ? 'text-gray-700' : 'text-white/80'
          }`}
        >
          {label}
        </label>
      )}
      <div className="relative" ref={wrapperRef}>
        <div
          className={`w-full px-3 py-2 rounded-md border cursor-pointer ${
            required && !value
              ? 'border-red-500'
              : theme === 'light'
              ? 'border-gray-300 bg-white'
              : 'border-white/[0.1] bg-white/[0.07]'
          } focus:outline-none focus:ring-2 ${
            theme === 'light' ? 'focus:ring-blue-500/20' : 'focus:ring-white/20'
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {displayValue()}
        </div>

        {isOpen && (
          <div
            className={`absolute z-10 w-full mt-1 rounded-md shadow-lg border ${
              theme === 'light'
                ? 'bg-white border-gray-200'
                : 'bg-[#121212] border-white/[0.1]'
            }`}
          >
            <div
              className={`p-2 border-b flex items-center gap-2 ${
                theme === 'light' ? 'border-gray-200' : 'border-white/[0.1]'
              }`}
            >
              <Search
                className={`w-4 h-4 ${
                  theme === 'light' ? 'text-gray-400' : 'text-white/60'
                }`}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-transparent border-none focus:outline-none ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
                placeholder="Search..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`px-3 py-2 cursor-pointer ${
                    theme === 'light'
                      ? multiple
                        ? Array.isArray(value) && value.includes(option.id)
                          ? 'bg-gray-100'
                          : 'hover:bg-gray-50'
                        : option.id === value
                        ? 'bg-gray-100'
                        : 'hover:bg-gray-50'
                      : multiple
                      ? Array.isArray(value) && value.includes(option.id)
                        ? 'bg-white/10'
                        : 'hover:bg-white/5'
                      : option.id === value
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => handleSelect(option.id)}
                >
                  <span
                    className={
                      theme === 'light' ? 'text-gray-900' : 'text-white'
                    }
                  >
                    {option.name}
                  </span>
                </div>
              ))}
              {filteredOptions.length === 0 && (
                <div
                  className={`px-3 py-2 ${
                    theme === 'light' ? 'text-gray-500' : 'text-white/60'
                  }`}
                >
                  No results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {required && !value && (
        <p className="text-red-500 text-sm mt-1">This field is required</p>
      )}
    </div>
  );
}
