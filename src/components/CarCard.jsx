import React from 'react';
import { Users, Briefcase, Cog, Star, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number);
};

export const CarCard = ({ car, onSelectCar, onToggleStatus }) => {
  const isAvailable = car.available;
  const mainFeature = car.features && car.features.length > 0 ? car.features[0] : null;

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
          {isAvailable ? (
            <span className="badge badge-emerald">
              <CheckCircle2 size={12} /> Unit Siap
            </span>
          ) : (
            <span className="badge badge-rose">
              <XCircle size={12} /> Sedang Disewa
            </span>
          )}
        </div>

        {/* Rating & Trip Count */}
        <div className="card-rating-badge">
          <Star size={13} fill="#fbbf24" color="#fbbf24" />
          <span className="tabular-nums">{car.rating}</span>
          <span style={{ opacity: 0.7 }} className="tabular-nums">({car.tripsCount})</span>
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
            aria-label={isAvailable ? `Sewa armada ${car.name}` : `Unit ${car.name} sedang tidak tersedia`}
            style={{
              opacity: isAvailable ? 1 : 0.55,
              cursor: isAvailable ? 'pointer' : 'not-allowed',
            }}
          >
            <span>{isAvailable ? 'Sewa Sekarang' : 'Habis'}</span>
            {isAvailable && <ArrowRight size={15} aria-hidden="true" />}
          </button>
        </div>

        {/* Discrete Admin Status Switcher */}
        <div style={{ marginTop: '0.65rem', textAlign: 'right' }}>
          <button
            type="button"
            onClick={() => onToggleStatus(car.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-subtle)',
              fontSize: '0.725rem',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: '0.2rem',
            }}
          >
            Status: {isAvailable ? 'Tandai Tersewa' : 'Tandai Siap'}
          </button>
        </div>
      </div>
    </article>
  );
};

export default CarCard;
