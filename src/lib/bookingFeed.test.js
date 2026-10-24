import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findNewBookings, buildBookingNotification } from './bookingFeed.js';

const b = (id, extra = {}) => ({
  id,
  customerName: 'Budi',
  carName: 'Toyota Avanza',
  startDate: '2026-11-01',
  endDate: '2026-11-03',
  ...extra,
});

describe('lib: bookingFeed - findNewBookings', () => {
  it('returns bookings present only in the new list', () => {
    const result = findNewBookings([b('A')], [b('B'), b('A')]);
    assert.deepEqual(result.map((x) => x.id), ['B']);
  });

  it('returns nothing when only existing bookings are re-read', () => {
    // getAll() returns brand new objects each time, so id comparison is the
    // only thing that keeps this from reporting every booking as new
    const result = findNewBookings([b('A'), b('B')], [{ ...b('A') }, { ...b('B') }]);
    assert.deepEqual(result, []);
  });

  it('treats the first load as all-new only when there was no prior list', () => {
    assert.equal(findNewBookings([], [b('A')]).length, 1);
    assert.equal(findNewBookings(null, [b('A')]).length, 1);
  });

  it('handles a cleared or malformed list', () => {
    assert.deepEqual(findNewBookings([b('A')], []), []);
    assert.deepEqual(findNewBookings([b('A')], null), []);
    assert.deepEqual(findNewBookings([null, { carId: 'x' }], [b('A')]).map((x) => x.id), ['A']);
  });

  it('ignores records without an id on either side', () => {
    const result = findNewBookings([{ id: undefined }], [{ carId: 'x' }, b('A')]);
    assert.deepEqual(result.map((x) => x.id), ['A']);
  });
});

describe('lib: bookingFeed - buildBookingNotification', () => {
  const formatDate = (iso) => `fmt(${iso})`;

  it('builds a title containing the booking reference', () => {
    const n = buildBookingNotification(b('RC-1'), formatDate);
    assert.equal(n.title, 'Pesanan baru RC-1');
    assert.equal(n.kind, 'booking');
  });

  it('includes customer, car and the formatted date range', () => {
    const n = buildBookingNotification(b('RC-1'), formatDate);
    assert.match(n.detail, /Budi/);
    assert.match(n.detail, /Toyota Avanza/);
    assert.match(n.detail, /fmt\(2026-11-01\) – fmt\(2026-11-03\)/);
  });

  it('falls back gracefully when customer or car fields are missing', () => {
    const n = buildBookingNotification(
      { id: 'RC-2', startDate: '2026-11-01', endDate: '2026-11-02' },
      formatDate
    );
    assert.match(n.detail, /Penyewa/);
    assert.match(n.detail, /unit/);
  });
});
