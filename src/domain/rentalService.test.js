import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDurationDays,
  calculateRentalCost,
  getPickupOption,
  PICKUP_OPTIONS,
  INSURANCE_FEE_PER_DAY,
} from './rentalService.js';
import { validateBookingInput } from './validation.js';

describe('Domain: rentalService - duration', () => {
  it('calculates duration correctly between dates', () => {
    const days = calculateDurationDays('2026-11-01', '2026-11-04');
    assert.equal(days, 3);
  });

  it('defaults to 1 day for same-day or reverse range', () => {
    assert.equal(calculateDurationDays('2026-11-01', '2026-11-01'), 1);
    assert.equal(calculateDurationDays('2026-11-05', '2026-11-01'), 1);
  });

  it('is not thrown off by a daylight-saving style offset', () => {
    // Pure UTC arithmetic: 31 days in October must stay 31
    assert.equal(calculateDurationDays('2026-10-01', '2026-11-01'), 31);
  });
});

describe('Domain: rentalService - cost breakdown', () => {
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
    assert.equal(result.pickupFee, 0);
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

  it('adds the pickup fee once per booking, not per day', () => {
    const result = calculateRentalCost({
      pricePerDay: 400000,
      startDate: '2026-11-01',
      endDate: '2026-11-06',
      pickupOptionId: 'BANDARA',
    });

    assert.equal(result.days, 5);
    assert.equal(result.pickupFee, 150000);
    assert.equal(result.grandTotal, 400000 * 5 + 150000);
  });

  it('never produces NaN for an unknown pickup zone', () => {
    const result = calculateRentalCost({
      pricePerDay: 400000,
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      pickupOptionId: 'ZONE_THAT_DOES_NOT_EXIST',
    });

    assert.equal(result.pickupFee, 0);
    assert.ok(Number.isFinite(result.grandTotal));
  });
});

describe('Domain: rentalService - pickup options', () => {
  it('falls back to the free depot option for unknown ids', () => {
    assert.equal(getPickupOption('NOPE').id, 'DEPOT');
    assert.equal(getPickupOption('NOPE').fee, 0);
  });

  it('exposes a stable option list with unique ids', () => {
    const ids = PICKUP_OPTIONS.map((option) => option.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.includes('DEPOT'));
  });
});

describe('Domain: validation - customer fields', () => {
  const validBase = {
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    customerIdCard: '3201234567890001',
    startDate: '2026-11-10',
    endDate: '2026-11-12',
    agreeToTerms: true,
    pickupOptionId: 'DEPOT',
    pickupOptionIds: ['DEPOT', 'BANDARA'],
    today: '2026-11-01',
  };

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

  it('passes a fully valid payload', () => {
    const res = validateBookingInput(validBase);
    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });

  it('rejects a start date in the past', () => {
    const res = validateBookingInput({ ...validBase, startDate: '2026-10-01' });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.startDate);
  });

  it('accepts a start date of today', () => {
    const res = validateBookingInput({ ...validBase, startDate: '2026-11-01', endDate: '2026-11-02' });
    assert.equal(res.isValid, true);
  });

  it('rejects a reversed range', () => {
    const res = validateBookingInput({ ...validBase, startDate: '2026-11-12', endDate: '2026-11-10' });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.endDate);
  });

  it('requires the terms checkbox', () => {
    const res = validateBookingInput({ ...validBase, agreeToTerms: false });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.agreeToTerms);
  });

  it('rejects an unknown pickup zone', () => {
    const res = validateBookingInput({ ...validBase, pickupOptionId: 'ATLANTIS' });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.pickupOptionId);
  });
});
