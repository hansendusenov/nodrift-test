/**
 * Catalog browsing domain service.
 * Adheres to nodrift-standard Section 2: filtering and sorting are pure
 * functions, so the catalog rules are unit-testable without a DOM.
 */

export const SORT_OPTIONS = Object.freeze([
  { id: 'RECOMMENDED', label: 'Rekomendasi' },
  { id: 'PRICE_ASC', label: 'Harga Termurah' },
  { id: 'PRICE_DESC', label: 'Harga Tertinggi' },
  { id: 'RATING_DESC', label: 'Rating Tertinggi' },
  { id: 'SEATS_DESC', label: 'Kapasitas Terbanyak' },
]);

export const TRANSMISSION_OPTIONS = Object.freeze([
  { id: 'ALL', label: 'Semua Transmisi' },
  { id: 'Automatic', label: 'Otomatis (Matic)' },
  { id: 'Manual', label: 'Manual' },
]);

/**
 * Lower and upper bound of the price range, derived from the fleet so the
 * slider always spans real data instead of an invented scale.
 *
 * @param {Array} cars
 * @returns {{min: number, max: number}}
 */
export function getPriceBounds(cars = []) {
  const prices = cars
    .map((car) => Number(car.pricePerDay))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) return { min: 0, max: 0 };

  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * Applies every active catalog filter.
 *
 * @param {object} params
 * @param {Array} params.cars
 * @param {string} [params.searchTerm]
 * @param {string} [params.category] `Semua` means no category filter.
 * @param {string} [params.transmission] `ALL` means no transmission filter.
 * @param {boolean} [params.onlyAvailable]
 * @param {number} [params.maxPrice] Upper bound; falsy or >= fleet max disables it.
 * @returns {Array}
 */
export function filterCars({
  cars = [],
  searchTerm = '',
  category = 'Semua',
  transmission = 'ALL',
  onlyAvailable = false,
  maxPrice = 0,
}) {
  const term = String(searchTerm).trim().toLowerCase();
  const priceCap = Number(maxPrice) > 0 ? Number(maxPrice) : Infinity;

  return cars.filter((car) => {
    if (!car) return false;

    if (term) {
      // Search the model name and the category, so "suv" finds SUVs too
      const haystack = `${car.name} ${car.category}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    if (category !== 'Semua' && car.category !== category) return false;
    if (transmission !== 'ALL' && car.transmission !== transmission) return false;
    if (onlyAvailable && !car.available) return false;
    if (Number(car.pricePerDay) > priceCap) return false;

    return true;
  });
}

/**
 * Sorts a copy of the fleet. Never mutates the input array.
 *
 * @param {Array} cars
 * @param {string} [sortBy] One of SORT_OPTIONS ids.
 * @returns {Array}
 */
export function sortCars(cars = [], sortBy = 'RECOMMENDED') {
  const sorted = [...cars];

  switch (sortBy) {
    case 'PRICE_ASC':
      return sorted.sort((a, b) => a.pricePerDay - b.pricePerDay);
    case 'PRICE_DESC':
      return sorted.sort((a, b) => b.pricePerDay - a.pricePerDay);
    case 'RATING_DESC':
      return sorted.sort((a, b) => {
        const byRating = (b.rating || 0) - (a.rating || 0);
        // Break ties by popularity so equal ratings have a stable order
        return byRating !== 0 ? byRating : (b.tripsCount || 0) - (a.tripsCount || 0);
      });
    case 'SEATS_DESC':
      return sorted.sort((a, b) => (b.seats || 0) - (a.seats || 0));
    case 'RECOMMENDED':
    default:
      return sorted;
  }
}

/**
 * One-call pipeline used by the catalog page.
 *
 * @param {object} params
 * @returns {Array}
 */
export function selectCars(params) {
  return sortCars(filterCars(params), params.sortBy);
}
