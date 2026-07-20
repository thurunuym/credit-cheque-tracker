import React, { useState, useEffect, useRef, useMemo } from 'react';
import shopsRaw from '../constants/shops.js';

// Type definition matching the structures inside shops.js
interface RawShop {
  id: string;
  name: string;
  distributor?: string;
  psa: string;
  spoAccount?: string;
  address?: string;
}

const shops: RawShop[] = shopsRaw as RawShop[];

interface ShopAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

// Helper to normalize search text: lowercase and strip dots
const normalizeStr = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/\./g, '');
};

export default function ShopAutocomplete({
  value,
  onChange,
  placeholder = 'Type or select shop...',
  className = '',
}: ShopAutocompleteProps) {
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

  // Compute clean query for searching
  const cleanQuery = useMemo(() => normalizeStr(value), [value]);

  // Determine suggestions based on current query
  const suggestions = useMemo(() => {
    if (!cleanQuery) return [];

    // Filter to find matching shops
    const matches: RawShop[] = [];
    for (const shop of shops) {
      const cleanName = normalizeStr(shop.name);
      const cleanPsa = normalizeStr(shop.psa);

      if (cleanName.includes(cleanQuery) || cleanPsa.includes(cleanQuery)) {
        matches.push(shop);
        // Limit search results to 50 items for performance
        if (matches.length >= 50) break;
      }
    }
    return matches;
  }, [cleanQuery]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  const handleSelect = (shop: RawShop) => {
    const formattedVal = `${shop.name} - ${shop.psa}`;
    onChange(formattedVal);
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
            {suggestions.map((shop, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={shop.id}
                  role="option"
                  aria-selected={isHighlighted}
                  onClick={() => handleSelect(shop)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex flex-col px-3.5 py-2 text-left cursor-pointer transition-colors ${isHighlighted ? 'bg-teal-50 text-teal-900' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{shop.name}</span>
                  </div>
                  <span className={`text-xs mt-0.5 font-medium ${isHighlighted ? 'text-teal-700' : 'text-gray-500'}`}>
                    Route : {shop.psa}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
