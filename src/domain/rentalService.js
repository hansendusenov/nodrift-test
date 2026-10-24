/**
 * Domain Service for Rental Pricing and Calculations.
 * Adheres to nodrift-standard Section 2: Pure domain layer without UI dependencies.
 */

import { parseISODate } from './availability.js';

export const INSURANCE_FEE_PER_DAY = 50000;

/**
 * Pickup / delivery zones. A fee of 0 means the unit is handed over at the
 * depot. Prices are per booking, not per day, because a delivery is two trips
 * regardless of how long the car is rented.
 */
export const PICKUP_OPTIONS = Object.freeze([
  { id: 'DEPOT', label: 'Ambil di Depot (Gratis)', fee: 0 },
  { id: 'JABODETABEK', label: 'Antar ke Alamat Jabodetabek', fee: 100000 },
  { id: 'BANDARA', label: 'Antar / Jemput Bandara Soekarno-Hatta', fee: 150000 },
  { id: 'LUAR_KOTA', label: 'Antar ke Luar Kota (radius 60 km)', fee: 300000 },
]);

/**
 * Looks up a pickup option by id, falling back to the free depot option so a
 * corrupted stored booking can never produce NaN in the price.
 *
 * @param {string} pickupId
 * @returns {{id: string, label: string, fee: number}}
 */
export function getPickupOption(pickupId) {
  return PICKUP_OPTIONS.find((option) => option.id === pickupId) || PICKUP_OPTIONS[0];
}

/**
 * Calculates rental duration in days between two date strings (YYYY-MM-DD).
 * Minimum duration is 1 day.
 * @param {string} startDateStr
 * @param {string} endDateStr
 * @returns {number} Duration in days
 */
export function calculateDurationDays(startDateStr, endDateStr) {
  const start = parseISODate(startDateStr);
  const end = parseISODate(endDateStr);

  if (!start || !end) return 1;

  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // If start and end are same day or invalid reverse range, default minimum 1 day
  return diffDays > 0 ? diffDays : 1;
}

/**
 * Calculates comprehensive rental cost breakdown.
 * @param {object} params
 * @param {number} params.pricePerDay
 * @param {number} params.driverFeePerDay
 * @param {string} params.startDate
 * @param {string} params.endDate
 * @param {boolean} params.withDriver
 * @param {boolean} params.withInsurance
 * @param {string} [params.pickupOptionId] Delivery zone; unknown ids cost nothing.
 * @returns {object} Breakdown of costs
 */
export function calculateRentalCost({
  pricePerDay = 0,
  driverFeePerDay = 0,
  startDate,
  endDate,
  withDriver = false,
  withInsurance = false,
  pickupOptionId = 'DEPOT',
}) {
  const days = calculateDurationDays(startDate, endDate);

  const carSubtotal = pricePerDay * days;
  const driverSubtotal = withDriver ? driverFeePerDay * days : 0;
  const insuranceSubtotal = withInsurance ? INSURANCE_FEE_PER_DAY * days : 0;
  const pickupOption = getPickupOption(pickupOptionId);
  const pickupFee = pickupOption.fee;

  const grandTotal = carSubtotal + driverSubtotal + insuranceSubtotal + pickupFee;

  return {
    days,
    carSubtotal,
    driverSubtotal,
    insuranceSubtotal,
    pickupFee,
    pickupLabel: pickupOption.label,
    grandTotal,
  };
}
