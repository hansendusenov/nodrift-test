import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseISODate,
  addDaysISO,
  toRentalInterval,
  rangesOverlap,
  findBookingConflicts,
  checkCarAvailability,
  groupBookingsByCar,
} from './availability.js';

describe('Domain: availability - date parsing', () => {
  it('parses a valid ISO date as UTC midnight', () => {
    const date = parseISODate('2026-11-01');
    assert.ok(date);
    assert.equal(date.getUTCFullYear(), 2026);
    assert.equal(date.getUTCMonth(), 10);
    assert.equal(date.getUTCDate(), 1);
  });

  it('rejects malformed and impossible dates', () => {
    assert.equal(parseISODate('2026-11-1'), null);
    assert.equal(parseISODate('01-11-2026'), null);
    assert.equal(parseISODate(''), null);
    assert.equal(parseISODate(null), null);
    // Feb 31 would silently roll over to March without the guard
    assert.equal(parseISODate('2026-02-31'), null);
  });

  it('adds days across a month boundary', () => {
    assert.equal(addDaysISO('2026-10-31', 1), '2026-11-01');
    assert.equal(addDaysISO('2026-12-31', 1), '2027-01-01');
    assert.equal(addDaysISO('not-a-date', 1), null);
  });
});

describe('Domain: availability - interval semantics', () => {
  it('treats the range as half-open so a returned car is free that day', () => {
    const a = toRentalInterval('2026-11-01', '2026-11-05');
    const b = toRentalInterval('2026-11-05', '2026-11-08');
    // Ends on the 5th, next booking starts on the 5th: no conflict
    assert.equal(rangesOverlap(a, b), false);
  });

  it('detects a one-day overlap', () => {
    const a = toRentalInterval('2026-11-01', '2026-11-05');
    const b = toRentalInterval('2026-11-04', '2026-11-08');
    assert.equal(rangesOverlap(a, b), true);
  });

  it('normalises a same-day rental to a 24 hour interval', () => {
    const interval = toRentalInterval('2026-11-01', '2026-11-01');
    assert.ok(interval);
    assert.equal(interval.to - interval.from, 24 * 60 * 60 * 1000);
  });

  it('normalises a reversed range instead of producing a negative interval', () => {
    const interval = toRentalInterval('2026-11-05', '2026-11-01');
    assert.ok(interval);
    assert.ok(interval.to > interval.from);
  });

  it('returns null for an unparseable start date', () => {
    assert.equal(toRentalInterval('nope', '2026-11-05'), null);
    assert.equal(rangesOverlap(null, toRentalInterval('2026-11-01', '2026-11-02')), false);
  });
});

describe('Domain: availability - conflict detection', () => {
  const bookings = [
    { id: 'B1', carId: 'avanza-2024', startDate: '2026-11-01', endDate: '2026-11-05', status: 'CONFIRMED' },
    { id: 'B2', carId: 'avanza-2024', startDate: '2026-11-10', endDate: '2026-11-12', status: 'CONFIRMED' },
    { id: 'B3', carId: 'brio-rs-2024', startDate: '2026-11-01', endDate: '2026-11-05', status: 'CONFIRMED' },
  ];

  it('finds a conflicting booking on the same unit', () => {
    const conflicts = findBookingConflicts({
      bookings,
      carId: 'avanza-2024',
      startDate: '2026-11-03',
      endDate: '2026-11-07',
    });
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].id, 'B1');
  });

  it('ignores bookings on a different unit', () => {
    const conflicts = findBookingConflicts({
      bookings,
      carId: 'avanza-2024',
      startDate: '2026-11-02',
      endDate: '2026-11-04',
    });
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].id, 'B1');
  });

  it('allows a back-to-back booking on the same day', () => {
    const conflicts = findBookingConflicts({
      bookings,
      carId: 'avanza-2024',
      startDate: '2026-11-05',
      endDate: '2026-11-10',
    });
    assert.deepEqual(conflicts, []);
  });

  it('ignores cancelled bookings', () => {
    const withCancelled = [
      { ...bookings[0], status: 'CANCELLED' },
    ];
    const conflicts = findBookingConflicts({
      bookings: withCancelled,
      carId: 'avanza-2024',
      startDate: '2026-11-02',
      endDate: '2026-11-04',
    });
    assert.deepEqual(conflicts, []);
  });

  it('can exclude the booking being edited', () => {
    const conflicts = findBookingConflicts({
      bookings,
      carId: 'avanza-2024',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      excludeBookingId: 'B1',
    });
    assert.deepEqual(conflicts, []);
  });

  it('returns conflicts sorted by start date', () => {
    const conflicts = findBookingConflicts({
      bookings,
      carId: 'avanza-2024',
      startDate: '2026-10-25',
      endDate: '2026-11-20',
    });
    assert.deepEqual(conflicts.map((c) => c.id), ['B1', 'B2']);
  });
});

describe('Domain: availability - checkCarAvailability', () => {
  const bookings = [
    { id: 'B1', carId: 'avanza-2024', startDate: '2026-11-01', endDate: '2026-11-05', status: 'CONFIRMED' },
  ];

  it('blocks a unit flagged unavailable by an operator', () => {
    const result = checkCarAvailability({
      car: { id: 'avanza-2024', available: false },
      bookings,
      startDate: '2026-12-01',
      endDate: '2026-12-03',
    });
    assert.equal(result.available, false);
    assert.deepEqual(result.conflicts, []);
  });

  it('blocks a unit with a date conflict', () => {
    const result = checkCarAvailability({
      car: { id: 'avanza-2024', available: true },
      bookings,
      startDate: '2026-11-02',
      endDate: '2026-11-04',
    });
    assert.equal(result.available, false);
    assert.equal(result.conflicts.length, 1);
  });

  it('allows a free range on an available unit', () => {
    const result = checkCarAvailability({
      car: { id: 'avanza-2024', available: true },
      bookings,
      startDate: '2026-12-01',
      endDate: '2026-12-03',
    });
    assert.equal(result.available, true);
  });
});

describe('Domain: availability - grouping', () => {
  it('groups active bookings per car and skips cancelled ones', () => {
    const map = groupBookingsByCar([
      { id: 'B1', carId: 'a', startDate: '2026-11-05', endDate: '2026-11-06', status: 'CONFIRMED' },
      { id: 'B2', carId: 'a', startDate: '2026-11-01', endDate: '2026-11-02', status: 'CONFIRMED' },
      { id: 'B3', carId: 'a', startDate: '2026-11-03', endDate: '2026-11-04', status: 'CANCELLED' },
    ]);

    const list = map.get('a');
    assert.equal(list.length, 2);
    assert.deepEqual(list.map((b) => b.id), ['B2', 'B1']);
  });
});
