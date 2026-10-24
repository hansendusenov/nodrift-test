import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Car,
  ArrowLeft,
  Lock,
  LogOut,
  Wallet,
  CalendarClock,
  TrendingUp,
  CheckCircle2,
  Ban,
  AlertCircle,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell.jsx';
import carRepository from '../data/carRepository.js';
import bookingRepository from '../data/bookingRepository.js';
import { BOOKING_STORAGE_KEY, FLEET_STORAGE_KEY } from '../data/storageKeys.js';
import { useStorageSync, useNotifications } from '../hooks/useStorageSync.js';
import { appConfig } from '../config/index.js';
import { formatRupiah, formatDateID } from '../lib/format.js';
import { findNewBookings, buildBookingNotification } from '../lib/bookingFeed.js';
import { todayISO, BOOKING_STATUS, BOOKING_STATUS_META, deriveBookingStatus } from '../domain/bookingStatus.js';
import { ROUTES } from '../hooks/useHashRoute.js';

const SESSION_KEY = 'rentcar_admin_session';

/**
 * Client-side PIN gate.
 * This is a mockup guard, not authentication: the PIN is in the bundle.
 * It only keeps casual visitors out of the staff panel.
 */
function useAdminSession() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const unlock = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Private mode may block storage; the session simply won't persist
    }
    setUnlocked(true);
  };

  const lock = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage failures on sign-out
    }
    setUnlocked(false);
  };

  return { unlocked, unlock, lock };
}

const AdminGate = ({ onUnlock, onBack }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === appConfig.adminPin) {
      onUnlock();
      return;
    }
    setError('PIN tidak sesuai. Coba lagi.');
    setPin('');
  };

  return (
    <div className="admin-gate">
      <form className="admin-gate-card surface-card" onSubmit={handleSubmit}>
        <div className="admin-gate-icon" aria-hidden="true">
          <Lock size={22} />
        </div>
        <h1 className="admin-gate-title">Panel Operasional Staf</h1>
        <p className="admin-gate-desc">
          Masukkan PIN staf untuk mengelola armada dan pesanan masuk.
        </p>

        {error && (
          <div role="alert" className="alert-danger">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="admin-pin-input" className="form-label">PIN Staf</label>
          <input
            id="admin-pin-input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            className={`form-input ${error ? 'error' : ''}`}
            value={pin}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              setPin(e.target.value);
              if (error) setError('');
            }}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary btn-cancel" onClick={onBack}>
            Kembali
          </button>
          <button type="submit" className="btn btn-primary btn-submit">
            Masuk
          </button>
        </div>

        <p className="admin-gate-note">
          Catatan demo: PIN bawaan ada di <code>.env.example</code> sebagai
          <code> VITE_ADMIN_PIN</code>. Proteksi ini hanya lapisan tampilan,
          bukan autentikasi sungguhan.
        </p>
      </form>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="admin-stat">
    <div className={`admin-stat-icon ${tone || ''}`} aria-hidden="true">
      <Icon size={18} />
    </div>
    <div>
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value tabular-nums">{value}</p>
    </div>
  </div>
);

export function AdminPage() {
  const { unlocked, unlock, lock } = useAdminSession();
  // Bumping this counter forces a re-render; the data is re-read from storage
  // on every render, so there is no second copy of the truth to keep in sync.
  const [, setVersion] = useState(0);
  const { notifications, push, dismiss, clear } = useNotifications();

  const cars = carRepository.getAll();
  const bookings = bookingRepository.getAll();
  const today = todayISO();

  const refresh = () => setVersion((prev) => prev + 1);

  // Ids already on screen. A booking that appears here but not in this set
  // arrived from another tab, so it deserves a notification.
  const knownIdsRef = useRef(null);
  // Ids that arrived while this panel was open, so the table can mark them
  const [newIds, setNewIds] = useState(() => new Set());
  // Transient banner confirming a background reload actually happened
  const [syncNotice, setSyncNotice] = useState(null);

  const announceNew = (incoming) => {
    for (const booking of incoming) {
      push(buildBookingNotification(booking, formatDateID));
    }
  };

  // Cross-tab sync: a customer booking in another tab must appear here without
  // a manual reload, and must raise a notification.
  useStorageSync({
    bookingKey: BOOKING_STORAGE_KEY,
    fleetKey: FLEET_STORAGE_KEY,
    onChange: (change) => {
      const nextBookings = bookingRepository.getAll();
      const known = knownIdsRef.current;

      if (change === 'bookings' && known) {
        const added = findNewBookings(
          [...known].map((id) => ({ id })),
          nextBookings
        );
        if (added.length > 0) {
          announceNew(added);
          setNewIds((prev) => {
            const next = new Set(prev);
            for (const booking of added) next.add(booking.id);
            return next;
          });
        }
      }

      knownIdsRef.current = new Set(nextBookings.map((booking) => booking.id));
      setSyncNotice(
        change === 'fleet'
          ? 'Data armada diperbarui dari tab lain.'
          : 'Pesanan diperbarui dari tab lain.'
      );
      refresh();
    },
  });

  // Seed the known-id set on first render, then keep it current. Runs after
  // render so the very first paint does not notify about existing bookings.
  useEffect(() => {
    knownIdsRef.current = new Set(bookings.map((booking) => booking.id));
  }, [bookings]);

  // Auto-dismiss the sync banner so it does not linger forever
  useEffect(() => {
    if (!syncNotice) return undefined;
    const timer = setTimeout(() => setSyncNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [syncNotice]);

  const stats = useMemo(() => {
    const active = bookings.filter((b) => {
      const status = deriveBookingStatus(b, today);
      return status !== BOOKING_STATUS.CANCELLED;
    });

    const revenue = active.reduce((sum, b) => sum + (b.costBreakdown?.grandTotal || 0), 0);
    const ongoing = active.filter((b) => deriveBookingStatus(b, today) === BOOKING_STATUS.ONGOING).length;

    return {
      revenue,
      ongoing,
      totalBookings: active.length,
      fleetReady: cars.filter((c) => c.available).length,
    };
  }, [bookings, cars, today]);

  if (!unlocked) {
    return <AdminGate onUnlock={unlock} onBack={() => { window.location.hash = ROUTES.CATALOG; }} />;
  }

  const sortedBookings = [...bookings].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  );

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="row-6">
          <div className="brand-icon-box" aria-hidden="true">
            <Car size={18} />
          </div>
          <div>
            <h1 className="admin-title">Panel Operasional</h1>
            <p className="admin-subtitle">{appConfig.appName} · data lokal perangkat ini</p>
          </div>
        </div>
        <div className="row-6">
          <NotificationBell
            notifications={notifications}
            onClear={clear}
            onDismiss={dismiss}
          />
          <a href={ROUTES.CATALOG} className="btn btn-secondary nav-action-btn">
            <ArrowLeft size={15} aria-hidden="true" />
            <span className="hide-on-mobile">Kembali ke Katalog</span>
          </a>
          <button type="button" className="btn btn-secondary nav-action-btn" onClick={lock}>
            <LogOut size={15} aria-hidden="true" />
            <span className="hide-on-mobile">Keluar</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        {syncNotice && (
          <div className="admin-sync-banner" role="status">
            <RefreshCw size={15} aria-hidden="true" />
            <span>{syncNotice}</span>
          </div>
        )}
        {/* Stats */}
        <section className="admin-stats" aria-label="Ringkasan Operasional">
          <StatCard icon={Wallet} label="Estimasi Pendapatan" value={formatRupiah(stats.revenue)} tone="tone-blue" />
          <StatCard icon={CalendarClock} label="Sedang Berjalan" value={stats.ongoing} tone="tone-amber" />
          <StatCard icon={TrendingUp} label="Total Pesanan Aktif" value={stats.totalBookings} tone="tone-emerald" />
          <StatCard icon={Car} label="Unit Siap" value={`${stats.fleetReady}/${cars.length}`} tone="tone-blue" />
        </section>

        {/* Bookings table */}
        <section className="admin-section" aria-labelledby="admin-bookings-title">
          <div className="admin-section-head">
            <h2 id="admin-bookings-title" className="admin-section-title">
              Pesanan Masuk (<span className="tabular-nums">{bookings.length}</span>)
            </h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                refresh();
                setSyncNotice('Data dimuat ulang.');
              }}
            >
              <RefreshCw size={13} aria-hidden="true" />
              Muat Ulang
            </button>
          </div>

          {sortedBookings.length === 0 ? (
            <div className="admin-empty">
              <Inbox size={20} aria-hidden="true" />
              <p>Belum ada pesanan yang masuk.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Kode</th>
                    <th scope="col">Penyewa</th>
                    <th scope="col">Armada</th>
                    <th scope="col">Periode</th>
                    <th scope="col">Total</th>
                    <th scope="col">Status</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBookings.map((booking) => {
                    const status = deriveBookingStatus(booking, today);
                    const meta = BOOKING_STATUS_META[status];
                    const canCancel =
                      status === BOOKING_STATUS.CONFIRMED || status === BOOKING_STATUS.ONGOING;
                    const isNew = newIds.has(booking.id);

                    return (
                      <tr key={booking.id} className={isNew ? 'admin-row-new' : undefined}>
                        <td className="admin-cell-code tabular-nums">
                          {booking.id}
                          {isNew && <span className="admin-new-tag">Baru</span>}
                        </td>
                        <td>
                          <span className="admin-cell-strong">{booking.customerName}</span>
                          <span className="admin-cell-sub tabular-nums">{booking.customerPhone}</span>
                        </td>
                        <td>{booking.carName}</td>
                        <td className="tabular-nums">
                          {formatDateID(booking.startDate)} – {formatDateID(booking.endDate)}
                        </td>
                        <td className="tabular-nums">{formatRupiah(booking.costBreakdown?.grandTotal)}</td>
                        <td>
                          <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            {canCancel ? (
                              <button
                                type="button"
                                className="btn btn-ghost-danger btn-sm"
                                onClick={() => {
                                  bookingRepository.cancel(booking.id);
                                  refresh();
                                }}
                              >
                                <Ban size={13} aria-hidden="true" /> Batalkan
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  bookingRepository.remove(booking.id);
                                  refresh();
                                }}
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Fleet management */}
        <section className="admin-section" aria-labelledby="admin-fleet-title">
          <h2 id="admin-fleet-title" className="admin-section-title">
            Kelola Armada (<span className="tabular-nums">{cars.length}</span>)
          </h2>

          <div className="admin-fleet-list">
            {cars.map((car) => (
              <div key={car.id} className="admin-fleet-row">
                <img
                  src={car.imageUrl}
                  alt=""
                  className="admin-fleet-thumb"
                  loading="lazy"
                />
                <div className="admin-fleet-main">
                  <p className="admin-cell-strong">{car.name}</p>
                  <p className="admin-cell-sub">
                    {car.category} • {car.year} • {car.transmission}
                  </p>
                </div>

                <div className="admin-fleet-price">
                  <label htmlFor={`price-${car.id}`} className="admin-field-label">Tarif / hari</label>
                  <input
                    id={`price-${car.id}`}
                    type="number"
                    className="form-input admin-price-input tabular-nums"
                    min={0}
                    step={50000}
                    value={car.pricePerDay}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next) || next < 0) return;
                      carRepository.updatePrice(car.id, next);
                      refresh();
                    }}
                  />
                </div>

                <button
                  type="button"
                  className={`btn btn-sm ${car.available ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => {
                    carRepository.toggleAvailability(car.id);
                    refresh();
                  }}
                >
                  {car.available ? (
                    <>
                      <CheckCircle2 size={13} aria-hidden="true" /> Siap
                    </>
                  ) : (
                    <>
                      <Ban size={13} aria-hidden="true" /> Perawatan
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminPage;
