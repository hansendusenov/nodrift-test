import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { SORT_OPTIONS, TRANSMISSION_OPTIONS } from '../domain/catalog.js';
import { formatRupiah } from '../lib/format.js';

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
  sortBy,
  onSortChange,
  maxPrice,
  onMaxPriceChange,
  priceBounds,
  activeFilterCount,
  onResetFilters,
}) => {
  const priceCapDisabled = !priceBounds || priceBounds.max === 0;
  // A cap at the fleet maximum means "no cap", so show the slider at its end
  const sliderValue = maxPrice > 0 ? maxPrice : priceBounds?.max || 0;

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
              {TRANSMISSION_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div>
            <select
              className="filter-select"
              value={sortBy}
              aria-label="Urutkan daftar armada"
              onChange={(e) => onSortChange(e.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
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

        {/* Price cap */}
        <div className="price-filter-row">
          <label htmlFor="price-cap-input" className="price-filter-label">
            <SlidersHorizontal size={15} aria-hidden="true" />
            Batas Harga Harian
          </label>
          <input
            id="price-cap-input"
            type="range"
            className="price-filter-range"
            min={priceBounds?.min || 0}
            max={priceBounds?.max || 0}
            step={50000}
            value={sliderValue}
            disabled={priceCapDisabled}
            aria-valuetext={
              sliderValue >= (priceBounds?.max || 0)
                ? 'Tanpa batas harga'
                : `Maksimal ${formatRupiah(sliderValue)} per hari`
            }
            onChange={(e) => {
              const next = Number(e.target.value);
              // Dragging to the far right clears the cap entirely
              onMaxPriceChange(next >= (priceBounds?.max || 0) ? 0 : next);
            }}
          />
          <output htmlFor="price-cap-input" className="price-filter-value tabular-nums">
            {sliderValue >= (priceBounds?.max || 0) ? 'Tanpa batas' : `≤ ${formatRupiah(sliderValue)}`}
          </output>
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

          {activeFilterCount > 0 && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={onResetFilters}
            >
              Reset ({activeFilterCount})
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
