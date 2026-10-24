import React, { Suspense, lazy } from 'react';
import CatalogPage from './pages/CatalogPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { useHashRoute, ROUTES } from './hooks/useHashRoute.js';

// The showroom is lazy: its Three.js bundle must never be part of the initial
// download for a visitor who only wants the catalog.
const ShowroomPage = lazy(() => import('./pages/ShowroomPage.jsx'));

export function App() {
  const route = useHashRoute();

  if (route === ROUTES.ADMIN) {
    return <AdminPage />;
  }

  if (route === ROUTES.SHOWROOM) {
    return (
      <Suspense fallback={<div className="route-fallback" role="status">Memuat showroom…</div>}>
        <ShowroomPage />
      </Suspense>
    );
  }

  return <CatalogPage />;
}

export default App;
