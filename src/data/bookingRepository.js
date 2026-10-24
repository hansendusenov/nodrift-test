/**
 * Data Repository for Booking Orders.
 * Persists customer bookings into localStorage.
 * Adheres to nodrift-standard Section 2: the presentation layer never touches
 * storage keys directly, it calls these methods.
 */

import { BOOKING_STORAGE_KEY } from './storageKeys.js';

const STORAGE_KEY = BOOKING_STORAGE_KEY;

export const bookingRepository = {
  /**
   * Generates a human-friendly booking reference ID.
   */
  generateBookingId() {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `RC-${datePrefix}-${randomSuffix}`;
  },

  /**
   * Retrieves all bookings from storage.
   * @returns {Array} List of bookings, newest first
   */
  getAll() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      // A corrupted payload must not crash the catalog; drop non-array shapes
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => item && typeof item === 'object' && item.id);
    } catch (err) {
      console.error('[bookingRepository.getAll] Failed reading bookings:', err);
      return [];
    }
  },

  /**
   * Retrieves a single booking by its reference ID.
   * @param {string} id
   * @returns {object|null}
   */
  getById(id) {
    return this.getAll().find((booking) => booking.id === id) || null;
  },

  /**
   * Saves a new booking.
   * @param {object} booking
   * @returns {object} The saved booking with created timestamp
   */
  create(booking) {
    try {
      const all = this.getAll();
      const newBooking = {
        ...booking,
        id: booking.id || this.generateBookingId(),
        createdAt: new Date().toISOString(),
        status: 'CONFIRMED',
      };

      all.unshift(newBooking);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return newBooking;
    } catch (err) {
      console.error('[bookingRepository.create] Failed saving booking:', err);
      throw err;
    }
  },

  /**
   * Replaces the status of one booking.
   * @param {string} id
   * @param {string} status
   * @returns {object|null} Updated booking, or null when not found.
   */
  updateStatus(id, status) {
    try {
      const all = this.getAll();
      const index = all.findIndex((booking) => booking.id === id);
      if (index === -1) return null;

      all[index] = { ...all[index], status, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return all[index];
    } catch (err) {
      console.error('[bookingRepository.updateStatus] Failed updating status:', err);
      throw err;
    }
  },

  /**
   * Cancels a booking, releasing its dates back to the fleet.
   * The record is kept so the customer can still see what happened.
   * @param {string} id
   * @returns {object|null}
   */
  cancel(id) {
    return this.updateStatus(id, 'CANCELLED');
  },

  /**
   * Permanently removes one booking.
   * @param {string} id
   * @returns {boolean} Whether a record was removed.
   */
  remove(id) {
    try {
      const all = this.getAll();
      const next = all.filter((booking) => booking.id !== id);
      if (next.length === all.length) return false;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return true;
    } catch (err) {
      console.error('[bookingRepository.remove] Failed removing booking:', err);
      throw err;
    }
  },

  /**
   * Clears booking history.
   */
  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[bookingRepository.clear] Failed:', err);
    }
  },
};

export default bookingRepository;
