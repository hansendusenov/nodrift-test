/**
 * Pure helpers for the staff notification feed.
 * Adheres to nodrift-standard Section 2: no React, no DOM, unit testable.
 */

/**
 * Finds bookings that exist in `next` but not in `previous`.
 *
 * Used to decide what counts as a *new* arrival when the panel re-reads storage
 * after another tab writes. Comparing ids (not object identity) is essential:
 * `getAll()` returns fresh objects on every read, so a reference comparison
 * would report every booking as new on every sync.
 *
 * @param {Array<{id?: string}>} previous
 * @param {Array<{id?: string}>} next
 * @returns {Array} Bookings present only in `next`, in `next` order.
 */
export function findNewBookings(previous, next) {
  const known = new Set(
    (previous || []).map((booking) => booking?.id).filter(Boolean)
  );

  return (next || []).filter((booking) => booking?.id && !known.has(booking.id));
}

/**
 * Builds the notification payload for a booking that just arrived.
 *
 * @param {object} booking
 * @param {(isoDate: string) => string} formatDate Date formatter, injected so
 *   this module stays free of locale/formatting imports.
 * @returns {{kind: string, title: string, detail: string}}
 */
export function buildBookingNotification(booking, formatDate) {
  const range = `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`;

  return {
    kind: 'booking',
    title: `Pesanan baru ${booking.id}`,
    detail: `${booking.customerName || 'Penyewa'} — ${booking.carName || 'unit'} · ${range}`,
  };
}
