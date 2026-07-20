import React, { useState, useEffect, useRef, useMemo } from 'react';
import banks from '../constants/banks';

interface BankAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export default function BankAutocomplete({
  value,
  onChange,
  required = false,
  placeholder = 'Type or select bank...',
  className = '',
}: BankAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter bank suggestions based on input value
  const suggestions = useMemo(() => {
    const cleanQuery = value.toLowerCase().trim();
    if (!cleanQuery) {
      // Show all 10 banks if focused but empty
      return banks;
    }
    return banks.filter(bank => bank.toLowerCase().includes(cleanQuery));
  }, [value]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  const handleSelect = (bank: string) => {
    onChange(bank);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1 < suggestions.length ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 >= 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        required={required}
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <ul role="listbox" className="divide-y divide-gray-100">
            {suggestions.map((bank, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={bank}
                  role="option"
                  aria-selected={isHighlighted}
                  onClick={() => handleSelect(bank)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3.5 py-2 text-left text-xs font-semibold cursor-pointer transition-colors ${
                    isHighlighted ? 'bg-teal-50 text-teal-900' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {bank}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
