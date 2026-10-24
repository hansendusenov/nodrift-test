/**
 * Data Repository for Car Fleet.
 * Adheres to nodrift-standard Section 2: Data layer boundary.
 * Presentation components never mutate raw storage directly.
 */

import { INITIAL_CARS } from './mockCars.js';

const STORAGE_KEY = 'rentcar_fleet_v1';

export const carRepository = {
  /**
   * Retrieves all cars from localStorage or initializes with seed data.
   * @returns {Array} List of car objects
   */
  getAll() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CARS));
        return INITIAL_CARS;
      }
      return JSON.parse(stored);
    } catch (err) {
      console.error('[carRepository.getAll] Failed to read localStorage:', err);
      return INITIAL_CARS;
    }
  },

  /**
   * Get car by unique ID.
   * @param {string} id
   * @returns {object|null}
   */
  getById(id) {
    const cars = this.getAll();
    return cars.find((c) => c.id === id) || null;
  },

  /**
   * Toggle car availability (e.g. for simple admin control).
   * @param {string} id
   * @returns {object|null}
   */
  toggleAvailability(id) {
    try {
      const cars = this.getAll();
      const index = cars.findIndex((c) => c.id === id);
      if (index === -1) return null;

      cars[index] = {
        ...cars[index],
        available: !cars[index].available,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
      return cars[index];
    } catch (err) {
      console.error('[carRepository.toggleAvailability] Error saving:', err);
      return null;
    }
  },

  /**
   * Reset catalog to initial mock seed.
   */
  resetToDefault() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CARS));
      return INITIAL_CARS;
    } catch (err) {
      console.error('[carRepository.resetToDefault] Error:', err);
      return INITIAL_CARS;
    }
  },
};

export default carRepository;
