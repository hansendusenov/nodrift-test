import React, { useState, useMemo } from 'react';
import Navbar from '../components/Navbar.jsx';
import FilterBar from '../components/FilterBar.jsx';
import CarCard from '../components/CarCard.jsx';
import BookingModal from '../components/BookingModal.jsx';
import InvoiceModal from '../components/InvoiceModal.jsx';
import BookingHistoryModal from '../components/BookingHistoryModal.jsx';
import carRepository from '../data/carRepository.js';
import bookingRepository from '../data/bookingRepository.js';
import { BOOKING_STORAGE_KEY, FLEET_STORAGE_KEY } from '../data/storageKeys.js';
import { useStorageSync } from '../hooks/useStorageSync.js';
import { appConfig } from '../config/index.js';
import { selectCars, getPriceBounds } from '../domain/catalog.js';
import { groupBookingsByCar } from '../domain/availability.js';
import { todayISO } from '../domain/bookingStatus.js';
import {
  ShieldCheck,
  CheckCircle,
  Car,
  UserCheck,
  Headphones,
  History,
  ArrowRight,
  Box,
} from 'lucide-react';
import { ROUTES } from '../hooks/useHashRoute.js';

const CURRENT_YEAR = new Date().getFullYear();

export function CatalogPage() {
  const [cars, setCars] = useState(() => carRepository.getAll());
  const [bookings, setBookings] = useState(() => bookingRepository.getAll());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [transmissionFilter, setTransmissionFilter] = useState('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState('RECOMMENDED');
  const [maxPrice, setMaxPrice] = useState(0);

  // Modals
  const [bookingCar, setBookingCar] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Refresh fleet + calendar together: a booking changes both
  const refreshData = () => {
    setCars([...carRepository.getAll()]);
    setBookings([...bookingRepository.getAll()]);
  };

  // A booking made in another tab must show up here, and a price or
  // availability change made in the staff panel must be reflected too.
  useStorageSync({
    bookingKey: BOOKING_STORAGE_KEY,
    fleetKey: FLEET_STORAGE_KEY,
    onChange: refreshData,
  });

  const handleBookingSuccess = (booking, car) => {
    setBookingCar(null);
    setInvoiceData({ booking, car });
    refreshData();
  };

  const handleHistoryClose = () => {
    setIsHistoryOpen(false);
    // Cancelling from the history frees dates, so the catalog must re-read
    refreshData();
  };

  const priceBounds = useMemo(() => getPriceBounds(cars), [cars]);

  const filteredCars = useMemo(
    () =>
      selectCars({
        cars,
        searchTerm,
        category: selectedCategory,
        transmission: transmissionFilter,
        onlyAvailable,
        maxPrice,
        sortBy,
      }),
    [cars, searchTerm, selectedCategory, transmissionFilter, onlyAvailable, maxPrice, sortBy]
  );

  // carId -> its active bookings, so each card can show the next occupied window
  const bookingsByCar = useMemo(() => groupBookingsByCar(bookings), [bookings]);

  const activeFilterCount = [
    searchTerm.trim().length > 0,
    selectedCategory !== 'Semua',
    transmissionFilter !== 'ALL',
    onlyAvailable,
    maxPrice > 0,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Semua');
    setTransmissionFilter('ALL');
    setOnlyAvailable(false);
    setMaxPrice(0);
  };

  const availableCount = cars.filter((c) => c.available).length;
  const featuredCar = cars.find((c) => c.id === 'innova-zenix-2024') || cars[0];
  const today = todayISO();

  return (
    <div className="app-container">
      {/* 1. Navigation */}
      <Navbar
        availableCount={availableCount}
        totalCount={cars.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* 2. Hero Section (Asymmetric Functional Editorial) */}
      <section className="hero-section" aria-label="Hero Pengenalan Layanan">
        <div className="hero-grid">
          {/* Left Column: Headline & Value Prop */}
          <div className="hero-content">
            <div className="hero-kicker">
              <ShieldCheck size={16} className="hero-kicker-icon" aria-hidden="true" />
              <span>Rental Mobil Resmi & Terpercaya</span>
            </div>

            <h1 className="hero-title">
              Sewa Mobil Bersih & Terawat, <span className="hero-title-accent">Bebas Khawatir.</span>
            </h1>

            <p className="hero-description">
              Pilihan armada tahun muda (2023–2024) siap pakai untuk perjalanan bisnis, liburan keluarga, maupun antar-jemput bandara. Tersedia opsi Lepas Kunci dengan verifikasi mudah atau Dengan Sopir berpengalaman.
            </p>

            <div className="hero-actions">
              <a href="#katalog" className="btn btn-primary">
                <span>Pilih Armada Mobil</span>
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsHistoryOpen(true)}
              >
                <History size={16} aria-hidden="true" />
                <span>Riwayat Sewa</span>
              </button>
              <a href={ROUTES.SHOWROOM} className="btn btn-secondary">
                <Box size={16} aria-hidden="true" />
                <span>Showroom 3D</span>
              </a>
            </div>

            {/* Quick Guarantees */}
            <div className="hero-guarantee-row" role="list" aria-label="Jaminan Layanan">
              <div className="guarantee-item" role="listitem">
                <CheckCircle size={15} className="guarantee-icon" aria-hidden="true" />
                <span>Unit Disinfeksi Bersih</span>
              </div>
              <div className="guarantee-item" role="listitem">
                <CheckCircle size={15} className="guarantee-icon" aria-hidden="true" />
                <span>Asuransi All-Risk</span>
              </div>
              <div className="guarantee-item" role="listitem">
                <CheckCircle size={15} className="guarantee-icon" aria-hidden="true" />
                <span>Jaminan Unit Pengganti</span>
              </div>
            </div>
          </div>

          {/* Right Column: Featured Spotlight Card */}
          {featuredCar && (
            <div className="hero-featured-card">
              <div className="featured-card-header">
                <span className="featured-label">Pilihan Favorit Keluarga</span>
                <span className="badge badge-emerald">Unit Siap Pakai</span>
              </div>
              <div className="featured-image-wrap">
                <img
                  src={featuredCar.imageUrl}
                  alt={featuredCar.name}
                  className="featured-image"
                />
              </div>
              <div className="featured-card-body">
                <div>
                  <h3 className="featured-card-title">
                    {featuredCar.name}
                  </h3>
                  <p className="featured-card-meta">
                    Tahun {featuredCar.year} • {featuredCar.category} • {featuredCar.transmission}
                  </p>
                </div>

                <div className="featured-card-footer">
                  <div>
                    <span className="featured-price-label">Mulai dari</span>
                    <p className="featured-price-value tabular-nums">
                      Rp {featuredCar.pricePerDay.toLocaleString('id-ID')}
                      <span className="featured-price-unit">/hari</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setBookingCar(featuredCar)}
                  >
                    Sewa Unit Ini
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Service Pillars (Informasi Nyata, Bukan Buzzword) */}
      <section className="services-section" aria-label="Keunggulan Layanan">
        <div className="services-grid">
          <div className="service-card">
            <div className="service-icon-box" aria-hidden="true">
              <UserCheck size={20} />
            </div>
            <div>
              <h3 className="service-title">Lepas Kunci & Sopir</h3>
              <p className="service-desc">
                Pilih fleksibilitas mengemudi sendiri dengan verifikasi identitas ringkas, atau sewa bersama sopir ramah dan hafal rute.
              </p>
            </div>
          </div>

          <div className="service-card">
            <div className="service-icon-box" aria-hidden="true">
              <Car size={20} />
            </div>
            <div>
              <h3 className="service-title">Kondisi Unit Prima</h3>
              <p className="service-desc">
                Servis teratur di bengkel resmi, AC dingin, ban tebal, serta pembersihan interior sebelum unit diserahkan kepada Anda.
              </p>
            </div>
          </div>

          <div className="service-card">
            <div className="service-icon-box" aria-hidden="true">
              <Headphones size={20} />
            </div>
            <div>
              <h3 className="service-title">Layanan Tanggap 24/7</h3>
              <p className="service-desc">
                Dukungan customer service aktif via WhatsApp untuk konsultasi rute, invoice voucher, dan bantuan darurat di jalan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Filter and Search Bar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        transmissionFilter={transmissionFilter}
        onTransmissionChange={setTransmissionFilter}
        onlyAvailable={onlyAvailable}
        onToggleAvailable={setOnlyAvailable}
        sortBy={sortBy}
        onSortChange={setSortBy}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
        priceBounds={priceBounds}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
      />

      {/* 5. Fleet Catalog Grid */}
      <main id="katalog" className="catalog-section" aria-label="Katalog Armada Rental">
        <div className="catalog-header">
          <h2 className="catalog-title">
            Katalog Armada (<span className="tabular-nums">{filteredCars.length}</span>)
          </h2>
          <span className="catalog-counter">
            Menampilkan {filteredCars.length} dari {cars.length} kendaraan
          </span>
        </div>

        {filteredCars.length === 0 ? (
          <div className="surface-card empty-state">
            <p className="empty-state-title">
              Tidak ada kendaraan yang cocok dengan filter.
            </p>
            <p className="empty-state-desc">
              Coba longgarkan batas harga, reset filter kategori, atau ubah kata kunci pencarian Anda.
            </p>
            <button
              type="button"
              className="btn btn-secondary empty-state-action"
              onClick={resetFilters}
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          <div className="fleet-grid">
            {filteredCars.map((car) => {
              const carBookings = bookingsByCar.get(car.id) || [];
              // The first booking that has not finished yet drives the card note
              const upcomingBooking = carBookings.find((b) => b.endDate > today) || null;

              return (
                <CarCard
                  key={car.id}
                  car={car}
                  upcomingBooking={upcomingBooking}
                  onSelectCar={(c) => setBookingCar(c)}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* 6. Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div>
            <div className="footer-brand-row">
              <div className="brand-icon-box footer-brand-icon">
                <Car size={16} />
              </div>
              <span className="footer-brand-name">
                {appConfig.appName}
              </span>
            </div>
            <p className="footer-brand-desc">
              Layanan penyewaan kendaraan terpercaya dengan standar kebersihan, perawatan mekanis prima, dan transparansi tarif tanpa biaya tersembunyi.
            </p>
            <p className="footer-copyright">
              © {CURRENT_YEAR} {appConfig.appName}. Seluruh hak cipta dilindungi.
            </p>
          </div>

          <div>
            <h4 className="footer-col-title">Layanan Sewa</h4>
            <ul className="footer-links-list">
              <li>Sewa Lepas Kunci Harian</li>
              <li>Sewa Dengan Driver</li>
              <li>Antar-Jemput Bandara</li>
              <li>Perjalanan Dinas & Korporasi</li>
            </ul>
          </div>

          <div>
            <h4 className="footer-col-title">Bantuan & Kontak</h4>
            <ul className="footer-links-list">
              <li>WhatsApp CS: +{appConfig.whatsappContact}</li>
              <li>Jam Operasional: 07:00 - 22:00 WIB</li>
              <li>Wilayah: Jabodetabek & Sekitarnya</li>
              <li>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setIsHistoryOpen(true)}
                >
                  Buka Riwayat Booking Anda
                </button>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {/* 7. Modals */}
      {bookingCar && (
        <BookingModal
          car={bookingCar}
          bookings={bookings}
          onClose={() => setBookingCar(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {invoiceData && (
        <InvoiceModal
          booking={invoiceData.booking}
          car={invoiceData.car}
          onClose={() => setInvoiceData(null)}
        />
      )}

      <BookingHistoryModal
        isOpen={isHistoryOpen}
        onClose={handleHistoryClose}
        onViewInvoice={(b) => {
          setIsHistoryOpen(false);
          const relatedCar = carRepository.getById(b.carId);
          setInvoiceData({ booking: b, car: relatedCar });
        }}
      />
    </div>
  );
}

export default CatalogPage;
