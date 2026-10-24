import React from 'react';
import { Search, X } from 'lucide-react';

const CATEGORIES = ['Semua', 'MPV', 'SUV', 'City Car', 'Luxury', 'EV'];

export const FilterBar = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategorySelect,
  transmissionFilter,
  onTransmissionChange,
  onlyAvailable,
  onToggleAvailable,
}) => {
  return (
    <section className="filter-section" aria-label="Filter dan Pencarian Armada">
      <div className="filter-card">
        {/* Main Controls Row */}
        <div className="filter-main-bar">
          {/* Search Box */}
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              className="search-input"
              aria-label="Cari nama atau model armada mobil"
              placeholder="Cari armada (contoh: Avanza, Zenix, Pajero, Ioniq...)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Hapus kata kunci pencarian"
                className="search-clear-btn"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Transmission Selector */}
          <div>
            <select
              className="filter-select"
              value={transmissionFilter}
              aria-label="Filter jenis transmisi kendaraan"
              onChange={(e) => onTransmissionChange(e.target.value)}
            >
              <option value="ALL">Semua Transmisi</option>
              <option value="Automatic">Otomatis (Matic)</option>
              <option value="Manual">Manual</option>
            </select>
          </div>

          {/* Availability Toggle */}
          <div>
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                className="filter-checkbox"
                checked={onlyAvailable}
                onChange={(e) => onToggleAvailable(e.target.checked)}
              />
              <span>Hanya Unit Siap</span>
            </label>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="category-tabs-row" role="tablist" aria-label="Kategori kendaraan">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`category-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => onCategorySelect(cat)}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
