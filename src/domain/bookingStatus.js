/**
 * Booking lifecycle domain service.
 * Adheres to nodrift-standard Section 2: pure functions, no UI or storage access.
 *
 * Two kinds of status exist and must not be conflated:
 *
 * - **Stored** (`booking.status`): what an operator or the customer decided.
 *   Only `CONFIRMED` and `CANCELLED` are ever persisted.
 * - **Derived** (see `deriveBookingStatus`): what is true right now, computed
 *   from the rental dates. `ONGOING` and `COMPLETED` are never stored, so a
 *   booking can never be left in a stale state after its dates pass.
 *
 * Dates are compared as `YYYY-MM-DD` strings, which sort chronologically, so
 * no timezone conversion can shift a day boundary.
 */

export const BOOKING_STATUS = Object.freeze({
  CONFIRMED: 'CONFIRMED',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

/**
 * Returns today's local date as `YYYY-MM-DD`.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function todayISO(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolves the status a booking has at a given point in time.
 *
 * @param {object} booking
 * @param {string} [today] Reference date (`YYYY-MM-DD`).
 * @returns {string|null}
 */
export function deriveBookingStatus(booking, today = todayISO()) {
  if (!booking) return null;

  // An explicit cancellation outranks the calendar for the rest of its life
  if (booking.status === BOOKING_STATUS.CANCELLED) return BOOKING_STATUS.CANCELLED;

  const { startDate, endDate } = booking;

  // Half-open interval: the unit is back on `endDate`, so the rental is over
  if (endDate && today >= endDate) return BOOKING_STATUS.COMPLETED;
  if (startDate && today >= startDate) return BOOKING_STATUS.ONGOING;

  return BOOKING_STATUS.CONFIRMED;
}

/**
 * A booking can be cancelled until the rental has finished.
 * Cancelled and completed bookings are terminal.
 *
 * @param {object} booking
 * @param {string} [today]
 * @returns {boolean}
 */
export function canCancelBooking(booking, today = todayISO()) {
  const status = deriveBookingStatus(booking, today);
  return status === BOOKING_STATUS.CONFIRMED || status === BOOKING_STATUS.ONGOING;
}

/**
 * Presentation metadata for each status. Kept in the domain layer so the
 * label and badge variant cannot drift between the history list and admin.
 */
export const BOOKING_STATUS_META = Object.freeze({
  [BOOKING_STATUS.CONFIRMED]: { label: 'Terkonfirmasi', badgeClass: 'badge-emerald' },
  [BOOKING_STATUS.ONGOING]: { label: 'Sedang Berjalan', badgeClass: 'badge-blue' },
  [BOOKING_STATUS.COMPLETED]: { label: 'Selesai', badgeClass: 'badge-neutral' },
  [BOOKING_STATUS.CANCELLED]: { label: 'Dibatalkan', badgeClass: 'badge-rose' },
});

/**
 * Sort helper that puts the most operationally relevant bookings first:
 * running rentals, then upcoming ones, then finished history.
 *
 * @param {Array} bookings
 * @param {string} [today]
 * @returns {Array} New sorted array, input untouched.
 */
export function sortBookingsByRelevance(bookings = [], today = todayISO()) {
  const weight = {
    [BOOKING_STATUS.ONGOING]: 0,
    [BOOKING_STATUS.CONFIRMED]: 1,
    [BOOKING_STATUS.COMPLETED]: 2,
    [BOOKING_STATUS.CANCELLED]: 3,
  };

  return [...bookings].sort((a, b) => {
    const statusA = deriveBookingStatus(a, today);
    const statusB = deriveBookingStatus(b, today);
    const byWeight = (weight[statusA] ?? 9) - (weight[statusB] ?? 9);
    if (byWeight !== 0) return byWeight;

    // Within a group, soonest first
    return String(a.startDate).localeCompare(String(b.startDate));
  });
}
