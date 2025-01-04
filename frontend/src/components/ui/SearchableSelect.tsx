import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

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
                className="bg-white/10 px-2 py-1 rounded-md text-sm"
              >
                {opt.name}
              </span>
            ))}
          </div>
        );
      }
      return <span className="text-white/60">{placeholder}</span>;
    }

    const selectedOption = options.find((opt) => opt.id === value);
    return selectedOption ? (
      <span>{selectedOption.name}</span>
    ) : (
      <span className="text-white/60">{placeholder}</span>
    );
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-2">{label}</label>
      )}
      <div className="relative" ref={wrapperRef}>
        <div
          className={`w-full px-3 py-2 bg-white/[0.07] rounded-md border ${
            required && !value ? 'border-red-500' : 'border-white/[0.1]'
          } focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent cursor-pointer`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {displayValue()}
        </div>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-[#121212] border border-white/[0.1] rounded-md shadow-lg">
            <div className="p-2 border-b border-white/[0.1] flex items-center gap-2">
              <Search className="w-4 h-4 text-white/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none text-white"
                placeholder="Search..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-white/5 ${
                    multiple
                      ? Array.isArray(value) && value.includes(option.id)
                        ? 'bg-white/10'
                        : ''
                      : option.id === value
                      ? 'bg-white/10'
                      : ''
                  }`}
                  onClick={() => handleSelect(option.id)}
                >
                  {option.name}
                </div>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-2 text-white/60">No results found</div>
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
