import React from 'react';
import { SortOption } from '../types';

interface FilterBarProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ currentSort, onSortChange }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center text-sm">
      <div className="flex bg-pump-card rounded border border-gray-800 p-1">
        <button className="px-4 py-1 bg-gray-700 text-white rounded shadow text-xs font-bold">Following</button>
        <button className="px-4 py-1 text-gray-400 hover:text-white text-xs font-bold">Terminal</button>
      </div>

      <select
        value={currentSort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="bg-pump-card border border-gray-800 text-white text-xs rounded p-2 outline-none sm:ml-auto w-full sm:w-auto focus:border-blue-500"
      >
        <option value="creationTime">Sort: Creation Time</option>
        <option value="featured">Sort: Featured</option>
        <option value="marketCap">Sort: MC</option>
        <option value="lastReply">Sort: Last Reply</option>
      </select>
    </div>
  );
};

export default FilterBar;
