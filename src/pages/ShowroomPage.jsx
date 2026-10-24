import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Box, Footprints, PersonStanding, Loader2, AlertCircle } from 'lucide-react';
import { ROUTES } from '../hooks/useHashRoute.js';
import { useStorageSync } from '../hooks/useStorageSync.js';
import { BOOKING_STORAGE_KEY, FLEET_STORAGE_KEY } from '../data/storageKeys.js';
import carRepository from '../data/carRepository.js';
import bookingRepository from '../data/bookingRepository.js';
import { formatRupiah } from '../lib/format.js';
import { listModelUrls } from '../data/carModels.js';
import { preloadCarModels } from '../components/showroom/modelPreload.js';
import { StageBoundary } from '../components/showroom/StageBoundary.jsx';
import { CarSpecSheet } from '../components/showroom/CarSpecSheet.jsx';

// Every stage is lazy so Three.js never enters the catalog bundle. A visitor
// who never opens a showroom downloads none of it.
const ShowroomStage = lazy(() => import('../components/showroom/ShowroomStage.jsx'));
const VirtualStage = lazy(() => import('../components/showroom/VirtualStage.jsx'));
const ThirdPersonStage = lazy(() => import('../components/showroom/ThirdPersonStage.jsx'));

const BookingModal = lazy(() => import('../components/BookingModal.jsx'));
const InvoiceModal = lazy(() => import('../components/InvoiceModal.jsx'));

const MODES = Object.freeze([
  {
    id: 'showroom',
    label: 'Mode 3D',
    hint: 'Putar dan perbesar satu unit di atas panggung.',
    icon: Box,
  },
  {
    id: 'virtual',
    label: 'Mode Virtual',
    hint: 'Jelajahi showroom dengan sudut pandang orang pertama.',
    icon: Footprints,
  },
  {
    id: 'rpg',
    label: 'Mode RPG',
    hint: 'Jelajahi showroom lewat karakter, dengan sudut pandang orang ketiga.',
    icon: PersonStanding,
  },
]);

/**
 * Loading panel for the lazily imported 3D bundle.
 * Shown while the chunk downloads, not while a model loads.
 */
function StageFallback({ label }) {
  return (
    <div className="showroom-loading" role="status" aria-live="polite">
      <Loader2 size={22} className="showroom-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

/**
 * Shown when WebGL is unavailable or a model fails to load.
 * A blank canvas would look like a bug, so the failure is named.
 */
function StageError({ message }) {
  return (
    <div className="showroom-error" role="alert">
      <AlertCircle size={22} aria-hidden="true" />
      <div>
        <p className="showroom-error-title">Tampilan 3D tidak dapat dimuat</p>
        <p className="showroom-error-text">{message}</p>
        <p className="showroom-error-text">
          Anda tetap bisa melihat dan menyewa armada lewat{' '}
          <a href={ROUTES.CATALOG} className="showroom-error-link">
            katalog biasa
          </a>
          .
        </p>
      </div>
    </div>
  );
}

/**
 * Detects WebGL support once, before mounting a canvas.
 * `getContext` can throw on some locked-down browsers, hence the try/catch.
 */
function detectWebGL() {
  if (typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

export function ShowroomPage() {
  const [mode, setMode] = useState('showroom');
  const [cars, setCars] = useState(() => carRepository.getAll());
  const [bookings, setBookings] = useState(() => bookingRepository.getAll());
  const [selectedCarId, setSelectedCarId] = useState(() => cars[0]?.id ?? null);

  const [bookingCar, setBookingCar] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [specCar, setSpecCar] = useState(null);

  const [webglOk] = useState(detectWebGL);
  const [stageError, setStageError] = useState(null);

  // Keep the showroom in step with the catalog and the staff panel: a price
  // edit or a cancellation made elsewhere must be reflected here too.
  useStorageSync({
    bookingKey: BOOKING_STORAGE_KEY,
    fleetKey: FLEET_STORAGE_KEY,
    onChange: () => {
      setCars([...carRepository.getAll()]);
      setBookings([...bookingRepository.getAll()]);
    },
  });

  // Warm the model cache after the first paint so the chunk download and the
  // asset download do not compete.
  useEffect(() => {
    if (!webglOk) return undefined;
    const timer = setTimeout(() => preloadCarModels(listModelUrls()), 600);
    return () => clearTimeout(timer);
  }, [webglOk]);

  const selectedCar = cars.find((car) => car.id === selectedCarId) || cars[0] || null;

  const handleBookingSuccess = (booking, car) => {
    setBookingCar(null);
    setInvoiceData({ booking, car });
    setCars([...carRepository.getAll()]);
    setBookings([...bookingRepository.getAll()]);
  };

  const handleInspect = useCallback((car) => {
    setSelectedCarId(car.id);
    // Look first, book second: the spec sheet is the showroom's payoff.
    setSpecCar(car);
  }, []);

  const handleBook = useCallback((car) => {
    setSpecCar(null);
    setBookingCar(car);
  }, []);

  const handleStageError = useCallback((error) => {
    setStageError(error?.message || 'Model 3D gagal dimuat.');
  }, []);

  const availableCount = cars.filter((car) => car.available).length;

  return (
    <div className="showroom-page">
      <header className="showroom-header">
        <div className="showroom-header-inner">
          <a href={ROUTES.CATALOG} className="btn btn-secondary nav-action-btn">
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Kembali ke Katalog</span>
          </a>

          <div className="showroom-title-block">
            <h1 className="showroom-title">Showroom Virtual</h1>
            <p className="showroom-subtitle">
              <span className="tabular-nums">{availableCount}</span> dari{' '}
              <span className="tabular-nums">{cars.length}</span> unit siap dilihat
            </p>
          </div>

          <div className="showroom-mode-switch" role="group" aria-label="Pilih mode tampilan 3D">
            {MODES.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`showroom-mode-btn ${active ? 'is-active' : ''}`}
                  onClick={() => setMode(item.id)}
                  aria-pressed={active}
                  title={item.hint}
                  data-mode={item.id}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="showroom-main">
        {!webglOk ? (
          <StageError message="Browser ini tidak mendukung WebGL, yang dibutuhkan untuk menampilkan mobil 3D." />
        ) : stageError ? (
          <StageError message={stageError} />
        ) : mode === 'showroom' ? (
          <section className="showroom-panel" aria-label="Mode 3D: putar mobil">
            {selectedCar ? (
              <>
                <StageBoundary key={`showroom-${selectedCar.id}`} onError={handleStageError}>
                  <Suspense fallback={<StageFallback label="Memuat panggung 3D…" />}>
                    <ShowroomStage car={selectedCar} />
                  </Suspense>
                </StageBoundary>

                <div className="showroom-info">
                  <div className="showroom-info-main">
                    <h2 className="showroom-car-name">{selectedCar.name}</h2>
                    <p className="showroom-car-meta">
                      {selectedCar.category} · {selectedCar.year} · {selectedCar.transmission} ·{' '}
                      {selectedCar.seats} kursi
                    </p>
                    <p className="showroom-car-price tabular-nums">
                      {formatRupiah(selectedCar.pricePerDay)}
                      <span className="showroom-car-price-unit">/hari</span>
                    </p>
                  </div>

                  <div className="showroom-info-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setBookingCar(selectedCar)}
                    >
                      Sewa Unit Ini
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="showroom-empty">Belum ada unit yang bisa ditampilkan.</p>
            )}
          </section>
        ) : (
          <section
            className="showroom-panel showroom-panel-virtual"
            aria-label={
              mode === 'rpg'
                ? 'Mode RPG: keliling showroom dengan karakter orang ketiga'
                : 'Mode Virtual: keliling showroom orang pertama'
            }
          >
            {cars.length > 0 ? (
              <StageBoundary key={`${mode}-${cars.length}`} onError={handleStageError}>
                <Suspense
                  fallback={
                    <StageFallback
                      label={
                        mode === 'rpg'
                          ? 'Menyiapkan karakter dan kamera…'
                          : 'Membangun showroom virtual…'
                      }
                    />
                  }
                >
                  {mode === 'rpg' ? (
                    <ThirdPersonStage
                      cars={cars}
                      onInspect={handleInspect}
                      paused={Boolean(specCar || bookingCar || invoiceData)}
                    />
                  ) : (
                    <VirtualStage
                      cars={cars}
                      onInspect={handleInspect}
                      paused={Boolean(specCar || bookingCar || invoiceData)}
                    />
                  )}
                </Suspense>
              </StageBoundary>
            ) : (
              <p className="showroom-empty">Belum ada unit yang bisa ditampilkan.</p>
            )}
          </section>
        )}

        {/* Car picker: works in both modes, and is the only way to change the
            car in 3D mode without leaving the page. */}
        {webglOk && !stageError && (
          <section className="showroom-fleet" aria-label="Pilih unit">
            <h2 className="showroom-fleet-title">Pilih Unit</h2>
            <div className="showroom-fleet-grid">
              {cars.map((car) => (
                <button
                  key={car.id}
                  type="button"
                  className={`showroom-fleet-item ${
                    car.id === selectedCarId ? 'is-selected' : ''
                  }`}
                  onClick={() => {
                    setSelectedCarId(car.id);
                    // In the walk modes the picker is a shortcut to walking
                    // over: show the same spec sheet the in-scene prompt opens.
                    if (mode !== 'showroom') handleInspect(car);
                  }}
                  aria-pressed={car.id === selectedCarId}
                >
                  <span className="showroom-fleet-name">{car.name}</span>
                  <span className="showroom-fleet-price tabular-nums">
                    {formatRupiah(car.pricePerDay)}
                    <span className="showroom-fleet-unit">/hari</span>
                  </span>
                  {!car.available && <span className="badge badge-rose">Tidak tersedia</span>}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {specCar && (
        <CarSpecSheet car={specCar} onClose={() => setSpecCar(null)} onBook={handleBook} />
      )}

      {bookingCar && (
        <Suspense fallback={null}>
          <BookingModal
            car={bookingCar}
            bookings={bookings}
            onClose={() => setBookingCar(null)}
            onBookingSuccess={handleBookingSuccess}
          />
        </Suspense>
      )}

      {invoiceData && (
        <Suspense fallback={null}>
          <InvoiceModal
            booking={invoiceData.booking}
            car={invoiceData.car}
            onClose={() => setInvoiceData(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default ShowroomPage;
