import { useEffect, useState } from 'react';

/**
 * Minimal hash-based router.
 *
 * A mockup of this size does not justify a router dependency: the whole app
 * has two screens, and a hash route keeps deep links working on any static
 * host without server rewrites.
 */

export const ROUTES = Object.freeze({
  CATALOG: '#/',
  ADMIN: '#/admin',
  SHOWROOM: '#/showroom',
});

/**
 * Normalises any hash into one of the known routes.
 * Unknown hashes fall back to the catalog so a stale bookmark is harmless.
 *
 * @param {string} hash
 * @returns {string}
 */
export function resolveRoute(hash) {
  const clean = String(hash || '').replace(/^#\/?/, '').replace(/\/$/, '').toLowerCase();
  if (clean === 'admin') return ROUTES.ADMIN;
  if (clean === 'showroom') return ROUTES.SHOWROOM;
  return ROUTES.CATALOG;
}

/**
 * Tracks the current hash route and re-renders on change.
 *
 * @returns {string} Current route, one of ROUTES.
 */
export function useHashRoute() {
  const [route, setRoute] = useState(() => resolveRoute(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => setRoute(resolveRoute(window.location.hash));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
}

/**
 * Imperatively navigates to a route.
 *
 * @param {string} route
 */
export function navigateTo(route) {
  window.location.hash = route;
}
