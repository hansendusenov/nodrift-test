/**
 * Data Repository for Booking Orders.
 * Persists customer bookings into localStorage.
 */

const STORAGE_KEY = 'rentcar_bookings_v1';

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
   * @returns {Array} List of bookings
   */
  getAll() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('[bookingRepository.getAll] Failed reading bookings:', err);
      return [];
    }
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
