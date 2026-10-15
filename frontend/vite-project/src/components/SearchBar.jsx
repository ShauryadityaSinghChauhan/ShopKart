import React from 'react';

// Kept local so this file only exports the component (react-refresh rule)
const CATEGORIES = ['All Categories', 'Electronics', 'Fashion', 'Books', 'Home'];

const SORT_OPTIONS = [
  { value: '', label: 'Sort: Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' }
];

const SearchBar = ({ search, onSearchChange, category, onCategoryChange, sort, onSortChange }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search products..."
        className="flex-1 px-4 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
      />

      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="px-4 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
      >
        {CATEGORIES.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-4 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
      >
        {SORT_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </div>
  );
};

export default SearchBar;
