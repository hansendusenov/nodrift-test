import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDurationDays, calculateRentalCost, INSURANCE_FEE_PER_DAY } from './rentalService.js';
import { validateBookingInput } from './validation.js';

describe('Domain: rentalService', () => {
  it('calculates duration correctly between dates', () => {
    const days = calculateDurationDays('2026-11-01', '2026-11-04');
    assert.equal(days, 3);
  });

  it('defaults to 1 day for same-day or reverse range', () => {
    assert.equal(calculateDurationDays('2026-11-01', '2026-11-01'), 1);
    assert.equal(calculateDurationDays('2026-11-05', '2026-11-01'), 1);
  });

  it('calculates full cost breakdown without driver & insurance', () => {
    const result = calculateRentalCost({
      pricePerDay: 400000,
      driverFeePerDay: 150000,
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      withDriver: false,
      withInsurance: false,
    });

    assert.equal(result.days, 2);
    assert.equal(result.carSubtotal, 800000);
    assert.equal(result.driverSubtotal, 0);
    assert.equal(result.insuranceSubtotal, 0);
    assert.equal(result.grandTotal, 800000);
  });

  it('calculates full cost breakdown with driver & insurance', () => {
    const result = calculateRentalCost({
      pricePerDay: 500000,
      driverFeePerDay: 150000,
      startDate: '2026-11-01',
      endDate: '2026-11-04',
      withDriver: true,
      withInsurance: true,
    });

    assert.equal(result.days, 3);
    assert.equal(result.carSubtotal, 1500000);
    assert.equal(result.driverSubtotal, 450000);
    assert.equal(result.insuranceSubtotal, 3 * INSURANCE_FEE_PER_DAY);
    assert.equal(result.grandTotal, 1500000 + 450000 + 150000);
  });
});

describe('Domain: validation', () => {
  it('flags invalid or short customer name and phone', () => {
    const res = validateBookingInput({
      customerName: 'A',
      customerPhone: '123',
      customerIdCard: '',
      startDate: '',
      endDate: '',
    });

    assert.equal(res.isValid, false);
    assert.ok(res.errors.customerName);
    assert.ok(res.errors.customerPhone);
    assert.ok(res.errors.customerIdCard);
    assert.ok(res.errors.startDate);
  });

  it('passes valid booking payload', () => {
    const res = validateBookingInput({
      customerName: 'Budi Santoso',
      customerPhone: '081234567890',
      customerIdCard: '3201234567890001',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
    });

    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });
});
