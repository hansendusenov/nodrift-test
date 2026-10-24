/**
 * Availability domain service.
 * Adheres to nodrift-standard Section 2: pure functions, no UI or storage access.
 *
 * Date model
 * ----------
 * Rental dates are date-only strings (`YYYY-MM-DD`). A rental occupies the
 * half-open interval [startDate, endDate): the customer picks the car up on
 * `startDate` and returns it on `endDate`, so the unit is free again the
 * moment `endDate` begins. Without a half-open interval, a car returned on
 * the 5th could not be rented out again until the 6th.
 *
 * A same-day rental (start === end) still bills one day, so it is normalised
 * to a 24-hour interval instead of collapsing to zero length.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a `YYYY-MM-DD` string into a UTC-midnight timestamp.
 * Returns null for malformed input or impossible dates such as 2026-02-31.
 * UTC is used deliberately so no timezone offset can shift a rental boundary.
 *
 * @param {string} dateStr
 * @returns {Date|null}
 */
export function parseISODate(dateStr) {
  if (typeof dateStr !== 'string' || !ISO_DATE_PATTERN.test(dateStr)) return null;

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Reject dates the Date constructor silently rolled over (e.g. Feb 31 -> Mar 3)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Returns the date `days` after `dateStr` as a `YYYY-MM-DD` string.
 *
 * @param {string} dateStr
 * @param {number} days
 * @returns {string|null}
 */
export function addDaysISO(dateStr, days) {
  const date = parseISODate(dateStr);
  if (!date) return null;
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Converts a rental range into a comparable half-open interval.
 *
 * @param {string} startDate
 * @param {string} endDate
 * @returns {{from: number, to: number}|null} Timestamps, or null if start is invalid.
 */
export function toRentalInterval(startDate, endDate) {
  const start = parseISODate(startDate);
  if (!start) return null;

  const end = parseISODate(endDate);
  // Same-day or reversed range: treat as a single 24-hour booking
  const to = end && end.getTime() > start.getTime() ? end.getTime() : start.getTime() + DAY_MS;

  return { from: start.getTime(), to };
}

/**
 * Tests two half-open intervals for overlap.
 *
 * @param {{from: number, to: number}|null} a
 * @param {{from: number, to: number}|null} b
 * @returns {boolean}
 */
export function rangesOverlap(a, b) {
  if (!a || !b) return false;
  return a.from < b.to && b.from < a.to;
}

/**
 * Finds every active booking that collides with a requested rental range.
 *
 * Cancelled bookings are ignored: their dates are released back to the fleet.
 * Completed bookings need no special case because they sit in the past and
 * therefore cannot overlap a future request.
 *
 * @param {object} params
 * @param {Array} params.bookings All bookings from the repository.
 * @param {string} params.carId Unit being requested.
 * @param {string} params.startDate
 * @param {string} params.endDate
 * @param {string|null} [params.excludeBookingId] Ignore this booking (used when editing).
 * @returns {Array} Conflicting bookings, oldest first.
 */
export function findBookingConflicts({
  bookings = [],
  carId,
  startDate,
  endDate,
  excludeBookingId = null,
}) {
  const target = toRentalInterval(startDate, endDate);
  if (!target || !carId) return [];

  return bookings
    .filter((booking) => {
      if (!booking || booking.carId !== carId) return false;
      if (excludeBookingId && booking.id === excludeBookingId) return false;
      if (booking.status === 'CANCELLED') return false;

      const other = toRentalInterval(booking.startDate, booking.endDate);
      return rangesOverlap(target, other);
    })
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
}

/**
 * Decides whether a unit can be booked for the requested range.
 * Combines the admin availability flag with the booking calendar.
 *
 * @param {object} params
 * @param {object} params.car
 * @param {Array} params.bookings
 * @param {string} params.startDate
 * @param {string} params.endDate
 * @returns {{available: boolean, conflicts: Array}}
 */
export function checkCarAvailability({ car, bookings = [], startDate, endDate }) {
  if (!car || car.available === false) {
    return { available: false, conflicts: [] };
  }

  const conflicts = findBookingConflicts({
    bookings,
    carId: car.id,
    startDate,
    endDate,
  });

  return { available: conflicts.length === 0, conflicts };
}

/**
 * Collects the first and last day each unit is already taken, so the catalog
 * can show "tersedia mulai <tanggal>" without re-scanning on every render.
 *
 * @param {Array} bookings
 * @returns {Map<string, Array>} carId -> bookings sorted by start date
 */
export function groupBookingsByCar(bookings = []) {
  const map = new Map();

  for (const booking of bookings) {
    if (!booking || booking.status === 'CANCELLED') continue;
    const list = map.get(booking.carId) || [];
    list.push(booking);
    map.set(booking.carId, list);
  }

  for (const list of map.values()) {
    list.sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  }

  return map;
}
