import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterCars, sortCars, selectCars, getPriceBounds, SORT_OPTIONS } from './catalog.js';

const CARS = [
  { id: 'a', name: 'Toyota Avanza', category: 'MPV', transmission: 'Automatic', pricePerDay: 400000, available: true, rating: 4.8, tripsCount: 142, seats: 7 },
  { id: 'b', name: 'Honda Brio', category: 'City Car', transmission: 'Automatic', pricePerDay: 350000, available: true, rating: 4.7, tripsCount: 165, seats: 5 },
  { id: 'c', name: 'Mitsubishi Pajero', category: 'SUV', transmission: 'Automatic', pricePerDay: 1150000, available: false, rating: 4.9, tripsCount: 84, seats: 7 },
  { id: 'd', name: 'Toyota Alphard', category: 'Luxury', transmission: 'Automatic', pricePerDay: 2300000, available: true, rating: 5.0, tripsCount: 62, seats: 6 },
];

describe('Domain: catalog - filtering', () => {
  it('returns everything with no filters', () => {
    assert.equal(filterCars({ cars: CARS }).length, 4);
  });

  it('searches by model name, case insensitively', () => {
    const result = filterCars({ cars: CARS, searchTerm: 'toyota' });
    assert.deepEqual(result.map((c) => c.id), ['a', 'd']);
  });

  it('searches the category too', () => {
    const result = filterCars({ cars: CARS, searchTerm: 'suv' });
    assert.deepEqual(result.map((c) => c.id), ['c']);
  });

  it('ignores surrounding whitespace in the search term', () => {
    assert.equal(filterCars({ cars: CARS, searchTerm: '  brio  ' }).length, 1);
  });

  it('filters by category, treating "Semua" as no filter', () => {
    assert.equal(filterCars({ cars: CARS, category: 'SUV' }).length, 1);
    assert.equal(filterCars({ cars: CARS, category: 'Semua' }).length, 4);
  });

  it('filters by transmission, treating ALL as no filter', () => {
    const manualFleet = [...CARS, { id: 'e', name: 'Old Truck', category: 'MPV', transmission: 'Manual', pricePerDay: 300000, available: true, rating: 4, tripsCount: 1, seats: 2 }];
    assert.equal(filterCars({ cars: manualFleet, transmission: 'Manual' }).length, 1);
    assert.equal(filterCars({ cars: manualFleet, transmission: 'ALL' }).length, 5);
  });

  it('filters by availability', () => {
    const result = filterCars({ cars: CARS, onlyAvailable: true });
    assert.deepEqual(result.map((c) => c.id), ['a', 'b', 'd']);
  });

  it('caps the price at the given maximum', () => {
    const result = filterCars({ cars: CARS, maxPrice: 500000 });
    assert.deepEqual(result.map((c) => c.id), ['a', 'b']);
  });

  it('treats a zero price cap as no cap', () => {
    assert.equal(filterCars({ cars: CARS, maxPrice: 0 }).length, 4);
  });

  it('combines filters', () => {
    const result = filterCars({ cars: CARS, searchTerm: 'toyota', onlyAvailable: true, maxPrice: 500000 });
    assert.deepEqual(result.map((c) => c.id), ['a']);
  });

  it('returns an empty array rather than throwing on missing input', () => {
    assert.deepEqual(filterCars({}), []);
    assert.deepEqual(filterCars({ cars: [null, undefined] }), []);
  });
});

describe('Domain: catalog - sorting', () => {
  it('sorts by price ascending and descending', () => {
    assert.deepEqual(sortCars(CARS, 'PRICE_ASC').map((c) => c.id), ['b', 'a', 'c', 'd']);
    assert.deepEqual(sortCars(CARS, 'PRICE_DESC').map((c) => c.id), ['d', 'c', 'a', 'b']);
  });

  it('sorts by rating, breaking ties by trip count', () => {
    const tied = [
      { id: 'x', rating: 4.9, tripsCount: 10, pricePerDay: 1, seats: 1 },
      { id: 'y', rating: 4.9, tripsCount: 99, pricePerDay: 1, seats: 1 },
      { id: 'z', rating: 5.0, tripsCount: 1, pricePerDay: 1, seats: 1 },
    ];
    assert.deepEqual(sortCars(tied, 'RATING_DESC').map((c) => c.id), ['z', 'y', 'x']);
  });

  it('sorts by seat count', () => {
    assert.deepEqual(sortCars(CARS, 'SEATS_DESC').map((c) => c.id), ['a', 'c', 'd', 'b']);
  });

  it('keeps the original order for RECOMMENDED and unknown keys', () => {
    assert.deepEqual(sortCars(CARS, 'RECOMMENDED').map((c) => c.id), ['a', 'b', 'c', 'd']);
    assert.deepEqual(sortCars(CARS, 'NONSENSE').map((c) => c.id), ['a', 'b', 'c', 'd']);
  });

  it('does not mutate the input array', () => {
    const snapshot = CARS.map((c) => c.id);
    sortCars(CARS, 'PRICE_DESC');
    assert.deepEqual(CARS.map((c) => c.id), snapshot);
  });

  it('every sort option is a real id', () => {
    for (const option of SORT_OPTIONS) {
      assert.doesNotThrow(() => sortCars(CARS, option.id));
    }
  });
});

describe('Domain: catalog - price bounds', () => {
  it('derives the bounds from the fleet', () => {
    assert.deepEqual(getPriceBounds(CARS), { min: 350000, max: 2300000 });
  });

  it('returns zeros for an empty or invalid fleet', () => {
    assert.deepEqual(getPriceBounds([]), { min: 0, max: 0 });
    assert.deepEqual(getPriceBounds([{ pricePerDay: 0 }, { pricePerDay: 'x' }]), { min: 0, max: 0 });
  });
});

describe('Domain: catalog - pipeline', () => {
  it('filters then sorts in one call', () => {
    const result = selectCars({ cars: CARS, onlyAvailable: true, sortBy: 'PRICE_ASC' });
    assert.deepEqual(result.map((c) => c.id), ['b', 'a', 'd']);
  });
});
