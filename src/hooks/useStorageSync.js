import { useEffect, useRef, useState } from 'react';

/**
 * Cross-tab storage synchronisation.
 *
 * The problem this solves
 * -----------------------
 * Every screen reads its data from `localStorage` on mount. The browser fires a
 * `storage` event on *other* tabs when one tab writes, so a booking made in tab
 * A was invisible to a staff panel already open in tab B: no refresh, no
 * warning, no notification.
 *
 * The `storage` event never fires in the tab that performed the write. That is
 * why each screen must still refresh itself after its own mutations; this hook
 * covers only the cross-tab half plus the notification feed.
 */

/**
 * Normalises a raw `storage` event key into an internal change name.
 * Extracted as a pure function so the key-to-change mapping is unit testable
 * without a DOM (nodrift-standard Section 6).
 *
 * @param {string|null} key The `localStorage` key that changed.
 * @param {object} keys Key constants, injected so the function stays pure.
 * @param {string} keys.bookingKey
 * @param {string} keys.fleetKey
 * @returns {'bookings'|'fleet'|'clear'|null} Change name, or null when irrelevant.
 */
export function resolveStorageChange(key, { bookingKey, fleetKey }) {
  if (key === bookingKey) return 'bookings';
  if (key === fleetKey) return 'fleet';
  // `null` means localStorage.clear() ran, so both datasets are gone
  if (key === null) return 'clear';
  return null;
}

/**
 * Subscribes to booking and fleet changes coming from other tabs.
 *
 * @param {object} params
 * @param {string} params.bookingKey
 * @param {string} params.fleetKey
 * @param {(change: 'bookings'|'fleet'|'clear') => void} params.onChange
 *   Called after a relevant remote change. Not called for unrelated keys.
 * @returns {void}
 */
export function useStorageSync({ bookingKey, fleetKey, onChange }) {
  // Keep the latest callback without re-subscribing on every render.
  // Updated in an effect, never during render (React refs rule).
  const handlerRef = useRef(onChange);

  useEffect(() => {
    handlerRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const handleStorage = (event) => {
      const change = resolveStorageChange(event.key, { bookingKey, fleetKey });
      if (!change) return;
      handlerRef.current?.(change);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [bookingKey, fleetKey]);
}

/**
 * Retains a short feed of unseen operational events for the notification bell.
 *
 * Notifications are deliberately derived, not persisted: there is no server to
 * push to, so a stored notification table would be fake complexity. What
 * matters is that a staff member looking at the panel is told *now* that a
 * booking arrived. They are lost on reload, which is honest for a mockup.
 *
 * @param {number} [limit] Maximum retained entries.
 * @returns {{notifications: Array, unreadCount: number, push: Function, dismiss: Function, clear: Function}}
 */
export function useNotifications(limit = 20) {
  const [notifications, setNotifications] = useState([]);
  const counterRef = useRef(0);

  const push = (item) => {
    counterRef.current += 1;
    const entry = {
      id: `n-${Date.now()}-${counterRef.current}`,
      createdAt: new Date().toISOString(),
      ...item,
    };

    setNotifications((prev) => [entry, ...prev].slice(0, limit));
  };

  const dismiss = (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const clear = () => setNotifications([]);

  return {
    notifications,
    unreadCount: notifications.length,
    push,
    dismiss,
    clear,
  };
}
