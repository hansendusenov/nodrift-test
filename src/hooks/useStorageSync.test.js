import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStorageChange } from './useStorageSync.js';

const KEYS = { bookingKey: 'rentcar_bookings_v1', fleetKey: 'rentcar_fleet_v1' };

describe('Hook: useStorageSync - resolveStorageChange', () => {
  it('maps the booking key to a bookings change', () => {
    assert.equal(resolveStorageChange('rentcar_bookings_v1', KEYS), 'bookings');
  });

  it('maps the fleet key to a fleet change', () => {
    assert.equal(resolveStorageChange('rentcar_fleet_v1', KEYS), 'fleet');
  });

  it('treats a null key (localStorage.clear) as a clear', () => {
    assert.equal(resolveStorageChange(null, KEYS), 'clear');
  });

  it('ignores unrelated keys so the panel does not reload for nothing', () => {
    assert.equal(resolveStorageChange('some_other_app_key', KEYS), null);
    assert.equal(resolveStorageChange('rentcar_admin_session', KEYS), null);
  });

  it('does not confuse the two rentcar keys', () => {
    // A prefix match would wrongly treat the fleet key as a booking change
    assert.notEqual(
      resolveStorageChange('rentcar_fleet_v1', KEYS),
      resolveStorageChange('rentcar_bookings_v1', KEYS)
    );
  });
});
