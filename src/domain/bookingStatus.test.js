import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOKING_STATUS,
  BOOKING_STATUS_META,
  deriveBookingStatus,
  canCancelBooking,
  sortBookingsByRelevance,
  todayISO,
} from './bookingStatus.js';

describe('Domain: bookingStatus - derivation', () => {
  const base = { id: 'B1', startDate: '2026-11-10', endDate: '2026-11-13', status: 'CONFIRMED' };

  it('is CONFIRMED before the start date', () => {
    assert.equal(deriveBookingStatus(base, '2026-11-09'), BOOKING_STATUS.CONFIRMED);
  });

  it('is ONGOING on the start date', () => {
    assert.equal(deriveBookingStatus(base, '2026-11-10'), BOOKING_STATUS.ONGOING);
  });

  it('is still ONGOING the day before the end date', () => {
    assert.equal(deriveBookingStatus(base, '2026-11-12'), BOOKING_STATUS.ONGOING);
  });

  it('is COMPLETED on the end date because the unit is returned', () => {
    assert.equal(deriveBookingStatus(base, '2026-11-13'), BOOKING_STATUS.COMPLETED);
  });

  it('lets an explicit cancellation outrank the calendar', () => {
    const cancelled = { ...base, status: 'CANCELLED' };
    assert.equal(deriveBookingStatus(cancelled, '2026-11-11'), BOOKING_STATUS.CANCELLED);
    assert.equal(deriveBookingStatus(cancelled, '2027-01-01'), BOOKING_STATUS.CANCELLED);
  });

  it('returns null for a missing booking', () => {
    assert.equal(deriveBookingStatus(null), null);
  });

  it('every status has presentation metadata', () => {
    for (const status of Object.values(BOOKING_STATUS)) {
      const meta = BOOKING_STATUS_META[status];
      assert.ok(meta, `missing metadata for ${status}`);
      assert.ok(meta.label);
      assert.ok(meta.badgeClass);
    }
  });
});

describe('Domain: bookingStatus - cancellation rules', () => {
  const booking = { startDate: '2026-11-10', endDate: '2026-11-13', status: 'CONFIRMED' };

  it('allows cancelling an upcoming booking', () => {
    assert.equal(canCancelBooking(booking, '2026-11-01'), true);
  });

  it('allows cancelling a running rental', () => {
    assert.equal(canCancelBooking(booking, '2026-11-11'), true);
  });

  it('refuses to cancel a finished rental', () => {
    assert.equal(canCancelBooking(booking, '2026-11-20'), false);
  });

  it('refuses to cancel twice', () => {
    assert.equal(canCancelBooking({ ...booking, status: 'CANCELLED' }, '2026-11-01'), false);
  });
});

describe('Domain: bookingStatus - ordering', () => {
  it('puts ongoing first, then upcoming, then finished, then cancelled', () => {
    const today = '2026-11-11';
    const sorted = sortBookingsByRelevance(
      [
        { id: 'done', startDate: '2026-11-01', endDate: '2026-11-05', status: 'CONFIRMED' },
        { id: 'cancelled', startDate: '2026-11-20', endDate: '2026-11-22', status: 'CANCELLED' },
        { id: 'upcoming', startDate: '2026-11-15', endDate: '2026-11-17', status: 'CONFIRMED' },
        { id: 'ongoing', startDate: '2026-11-10', endDate: '2026-11-13', status: 'CONFIRMED' },
      ],
      today
    );

    assert.deepEqual(sorted.map((b) => b.id), ['ongoing', 'upcoming', 'done', 'cancelled']);
  });

  it('does not mutate the input array', () => {
    const input = [
      { id: 'a', startDate: '2026-11-05', endDate: '2026-11-06', status: 'CONFIRMED' },
      { id: 'b', startDate: '2026-11-01', endDate: '2026-11-02', status: 'CONFIRMED' },
    ];
    const snapshot = input.map((b) => b.id);
    sortBookingsByRelevance(input, '2026-10-01');
    assert.deepEqual(input.map((b) => b.id), snapshot);
  });
});

describe('Domain: bookingStatus - todayISO', () => {
  it('formats a local date without timezone drift', () => {
    // 23:30 local on the 31st must stay the 31st, not roll to the 1st
    assert.equal(todayISO(new Date(2026, 9, 31, 23, 30)), '2026-10-31');
    assert.equal(todayISO(new Date(2026, 0, 1, 0, 0)), '2026-01-01');
  });
});
