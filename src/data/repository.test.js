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
});

describe('Data Layer: bookingRepository', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('returns empty array when no bookings exist', () => {
    const bookings = bookingRepository.getAll();
    assert.deepEqual(bookings, []);
  });

  it('creates and persists a new booking with generated ID', () => {
    const newBooking = bookingRepository.create({
      carId: 'avanza-2024',
      carName: 'Toyota All New Avanza',
      customerName: 'Budi Santoso',
      customerPhone: '081234567890',
      startDate: '2026-11-01',
      endDate: '2026-11-03',
    });

    assert.ok(newBooking.id);
    assert.ok(newBooking.id.startsWith('RC-'));
    assert.equal(newBooking.status, 'CONFIRMED');

    const all = bookingRepository.getAll();
    assert.equal(all.length, 1);
    assert.equal(all[0].id, newBooking.id);
  });

  it('clears all stored bookings', () => {
    bookingRepository.create({ customerName: 'Test' });
    assert.equal(bookingRepository.getAll().length, 1);

    bookingRepository.clear();
    assert.equal(bookingRepository.getAll().length, 0);
  });
});
