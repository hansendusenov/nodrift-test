/**
 * Single source of truth for localStorage keys.
 *
 * The keys were previously duplicated as private constants inside each
 * repository, which meant the cross-tab sync layer could not reference them
 * without hardcoding the strings a second time. A typo in either copy would
 * silently break synchronisation instead of failing loudly.
 */

export const BOOKING_STORAGE_KEY = 'rentcar_bookings_v1';
export const FLEET_STORAGE_KEY = 'rentcar_fleet_v1';
