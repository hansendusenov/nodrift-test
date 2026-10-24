/**
 * Domain Service for Rental Pricing and Calculations.
 * Adheres to nodrift-standard Section 2: Pure domain layer without UI dependencies.
 */

export const INSURANCE_FEE_PER_DAY = 50000;

/**
 * Calculates rental duration in days between two date strings (YYYY-MM-DD).
 * Minimum duration is 1 day.
 * @param {string} startDateStr
 * @param {string} endDateStr
 * @returns {number} Duration in days
 */
export function calculateDurationDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 1;

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
 * @returns {object} Breakdown of costs
 */
export function calculateRentalCost({
  pricePerDay = 0,
  driverFeePerDay = 0,
  startDate,
  endDate,
  withDriver = false,
  withInsurance = false,
}) {
  const days = calculateDurationDays(startDate, endDate);

  const carSubtotal = pricePerDay * days;
  const driverSubtotal = withDriver ? driverFeePerDay * days : 0;
  const insuranceSubtotal = withInsurance ? INSURANCE_FEE_PER_DAY * days : 0;

  const grandTotal = carSubtotal + driverSubtotal + insuranceSubtotal;

  return {
    days,
    carSubtotal,
    driverSubtotal,
    insuranceSubtotal,
    grandTotal,
  };
}
