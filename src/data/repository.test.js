import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { carRepository } from './carRepository.js';
import { bookingRepository } from './bookingRepository.js';
import { INITIAL_CARS } from './mockCars.js';

// In-memory mock localStorage for Node test runner
const memoryStore = new Map();
globalThis.localStorage = {
  getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
  setItem: (key, val) => memoryStore.set(key, String(val)),
  removeItem: (key) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
};

describe('Data Layer: carRepository', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('retrieves all cars and seeds initial cars on first read', () => {
    const cars = carRepository.getAll();
    assert.equal(cars.length, INITIAL_CARS.length);
    assert.equal(cars[0].id, INITIAL_CARS[0].id);
  });

  it('gets a single car by its unique ID', () => {
    const car = carRepository.getById('avanza-2024');
    assert.ok(car);
    assert.equal(car.name, 'Toyota All New Avanza');
  });

  it('returns null for non-existent car ID', () => {
    const car = carRepository.getById('non-existent-id');
    assert.equal(car, null);
  });

  it('toggles car availability successfully', () => {
    const carBefore = carRepository.getById('avanza-2024');
    const initialStatus = carBefore.available;

    const updated = carRepository.toggleAvailability('avanza-2024');
    assert.equal(updated.available, !initialStatus);

    const carAfter = carRepository.getById('avanza-2024');
    assert.equal(carAfter.available, !initialStatus);
  });

  it('updates a daily rate', () => {
    const updated = carRepository.updatePrice('avanza-2024', 425000);
    assert.equal(updated.pricePerDay, 425000);
    assert.equal(carRepository.getById('avanza-2024').pricePerDay, 425000);
  });

  it('survives a corrupted fleet payload by falling back to the seed', () => {
    globalThis.localStorage.setItem('rentcar_fleet_v1', '{"not":"an array"}');
    const cars = carRepository.getAll();
    assert.equal(cars.length, INITIAL_CARS.length);
  });
});

describe('Data Layer: bookingRepository', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  const makeBooking = (overrides = {}) => ({
    carId: 'avanza-2024',
    carName: 'Toyota All New Avanza',
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    startDate: '2026-11-01',
    endDate: '2026-11-03',
    ...overrides,
  });

  it('returns empty array when no bookings exist', () => {
    const bookings = bookingRepository.getAll();
    assert.deepEqual(bookings, []);
  });

  it('creates and persists a new booking with generated ID', () => {
    const newBooking = bookingRepository.create(makeBooking());

    assert.ok(newBooking.id);
    assert.ok(newBooking.id.startsWith('RC-'));
    assert.equal(newBooking.status, 'CONFIRMED');

    const all = bookingRepository.getAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].id, newBooking.id);
  });

  it('gets a booking by id', () => {
    const created = bookingRepository.create(makeBooking());
    assert.equal(bookingRepository.getById(created.id).customerName, 'Budi Santoso');
    assert.equal(bookingRepository.getById('missing'), null);
  });

  it('cancels a booking without deleting it', () => {
    const created = bookingRepository.create(makeBooking());

    const cancelled = bookingRepository.cancel(created.id);
    assert.equal(cancelled.status, 'CANCELLED');
    assert.ok(cancelled.updatedAt);

    // The record is still there so the customer keeps their history
    const all = bookingRepository.getAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].status, 'CANCELLED');
  });

  it('returns null when cancelling an unknown booking', () => {
    assert.equal(bookingRepository.cancel('RC-NOPE'), null);
  });

  it('removes a single booking and leaves the others untouched', () => {
    const first = bookingRepository.create(makeBooking());
    const second = bookingRepository.create(makeBooking({ customerName: 'Siti Aminah' }));

    assert.equal(bookingRepository.remove(first.id), true);

    const all = bookingRepository.getAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].id, second.id);
  });

  it('reports a miss when removing an unknown booking', () => {
    assert.equal(bookingRepository.remove('RC-NOPE'), false);
  });

  it('clears all stored bookings', () => {
    bookingRepository.create(makeBooking());
    assert.equal(bookingRepository.getAll().length, 1);

    bookingRepository.clear();
    assert.equal(bookingRepository.getAll().length, 0);
  });

  it('ignores a corrupted bookings payload instead of crashing', () => {
    globalThis.localStorage.setItem('rentcar_bookings_v1', '"just a string"');
    assert.deepEqual(bookingRepository.getAll(), []);
  });

  it('drops malformed records that have no id', () => {
    globalThis.localStorage.setItem(
      'rentcar_bookings_v1',
      JSON.stringify([{ carId: 'x' }, null, { id: 'RC-1', carId: 'avanza-2024' }])
    );
    const all = bookingRepository.getAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].id, 'RC-1');
  });
});
