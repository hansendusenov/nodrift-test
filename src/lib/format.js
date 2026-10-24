/**
 * Presentation formatting helpers.
 * Single source of truth: the Rupiah formatter was duplicated in four
 * components, so a currency change had to be made in four places.
 */

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/**
 * Formats a number as Indonesian Rupiah, e.g. 400000 -> "Rp 400.000".
 * Non-finite input renders as zero rather than "NaN".
 *
 * @param {number} value
 * @returns {string}
 */
export function formatRupiah(value) {
  const numeric = Number(value);
  return rupiahFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

/**
 * Formats a `YYYY-MM-DD` date as a short Indonesian date, e.g. "24 Okt 2026".
 * Returns the raw string when it cannot be parsed, so the UI never shows
 * "Invalid Date".
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDateID(isoDate) {
  if (!isoDate) return '—';

  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(isoDate);

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
