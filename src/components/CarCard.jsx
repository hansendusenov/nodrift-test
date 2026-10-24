import React from 'react';
import { Users, Briefcase, Cog, Star, CheckCircle2, XCircle, ArrowRight, CalendarClock } from 'lucide-react';
import { formatRupiah, formatDateID } from '../lib/format.js';
import { todayISO } from '../domain/bookingStatus.js';

export const CarCard = ({ car, upcomingBooking, onSelectCar }) => {
  const isAvailable = car.available;
  const mainFeature = car.features && car.features.length > 0 ? car.features[0] : null;

  // A unit can be flagged available and still be rented out on future dates
  const isBookedNow = Boolean(upcomingBooking) && upcomingBooking.startDate <= todayISO();

  return (
    <article className="car-card" aria-labelledby={`car-title-${car.id}`}>
      {/* Vehicle Visual Header */}
      <div className="card-image-wrap">
        <img
          src={car.imageUrl}
          alt={`Foto armada ${car.name}`}
          className="car-image"
          loading="lazy"
        />
        <div className="card-scrim-top" aria-hidden="true"></div>

        {/* Status Badges */}
        <div className="card-badge-container">
          <span className="badge badge-blue">{car.category}</span>
          {!isAvailable ? (
            <span className="badge badge-rose">
              <XCircle size={12} aria-hidden="true" /> Perawatan
            </span>
          ) : isBookedNow ? (
            <span className="badge badge-amber">
              <CalendarClock size={12} aria-hidden="true" /> Sedang Disewa
            </span>
          ) : (
            <span className="badge badge-emerald">
              <CheckCircle2 size={12} aria-hidden="true" /> Unit Siap
            </span>
          )}
        </div>

        {/* Rating & Trip Count */}
        <div className="card-rating-badge">
          <Star size={13} fill="currentColor" className="rating-star" aria-hidden="true" />
          <span className="tabular-nums">{car.rating}</span>
          <span className="rating-trip-count tabular-nums">({car.tripsCount})</span>
        </div>
      </div>

      {/* Vehicle Specification & Content */}
      <div className="card-body">
        <div className="car-header-row">
          <h3 id={`car-title-${car.id}`} className="car-name">{car.name}</h3>
          <p className="car-sub-info">
            Tahun <span className="tabular-nums">{car.year}</span> • Bahan Bakar {car.fuel}
          </p>
        </div>

        {/* Core Specs Grid */}
        <div className="specs-grid" role="group" aria-label="Spesifikasi kendaraan">
          <div className="spec-item">
            <Users size={16} className="spec-icon" aria-hidden="true" />
            <span className="spec-label tabular-nums">{car.seats} Kursi</span>
          </div>
          <div className="spec-item">
            <Briefcase size={16} className="spec-icon" aria-hidden="true" />
            <span className="spec-label tabular-nums">{car.luggage} Koper</span>
          </div>
          <div className="spec-item">
            <Cog size={16} className="spec-icon" aria-hidden="true" />
            <span className="spec-label">{car.transmission}</span>
          </div>
        </div>

        {/* Feature Highlight Pill */}
        {mainFeature && (
          <div className="card-feature-pill" title={car.features.join(', ')}>
            Fitur Unggulan: <strong>{mainFeature}</strong>
          </div>
        )}

        {/* Next booked window, so the customer knows before opening the form */}
        {upcomingBooking && (
          <p className="card-availability-note">
            <CalendarClock size={13} aria-hidden="true" />
            <span>
              Dipesan <span className="tabular-nums">{formatDateID(upcomingBooking.startDate)}</span> –{' '}
              <span className="tabular-nums">{formatDateID(upcomingBooking.endDate)}</span>
            </span>
          </p>
        )}

        {/* Price & Action Footer */}
        <div className="card-footer">
          <div className="price-box">
            <span className="price-sub">Tarif sewa mulai</span>
            <span className="price-amount tabular-nums">
              {formatRupiah(car.pricePerDay)}
              <span className="price-unit"> /hari</span>
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={!isAvailable}
            onClick={() => onSelectCar(car)}
            aria-label={
              !isAvailable
                ? `Unit ${car.name} sedang dalam perawatan`
                : `Sewa armada ${car.name}`
            }
          >
            <span>{isAvailable ? 'Sewa Sekarang' : 'Perawatan'}</span>
            {isAvailable && <ArrowRight size={15} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </article>
  );
};

export default CarCard;
