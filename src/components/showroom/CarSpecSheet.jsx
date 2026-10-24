import React, { useEffect, useRef } from 'react';
import { X, Users, Fuel, Settings2, ShieldCheck, Check } from 'lucide-react';
import { formatRupiah } from '../../lib/format.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

/**
 * Specification sheet for a car inspected in the showroom.
 *
 * Why a sheet instead of jumping straight into the booking form
 * ------------------------------------------------------------
 * "Walk up to a car and look at it" is the whole point of the Virtual mode.
 * Opening a date form the moment a car is clicked skips the looking. This sheet
 * shows what the visitor walked over to see, and offers the booking action as a
 * deliberate second step.
 */
export function CarSpecSheet({ car, onClose, onBook }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const specs = [
    { icon: Users, label: 'Kapasitas', value: `${car.seats} kursi` },
    { icon: Settings2, label: 'Transmisi', value: car.transmission },
    { icon: Fuel, label: 'Bahan Bakar', value: car.fuel },
    { icon: ShieldCheck, label: 'Tahun', value: String(car.year) },
  ];

  return (
    <div className="spec-sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        ref={containerRef}
        className="spec-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="spec-sheet-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="spec-sheet-head">
          <div>
            <p className="spec-sheet-eyebrow">{car.category}</p>
            <h2 id="spec-sheet-title" className="spec-sheet-title">
              {car.name}
            </h2>
          </div>
          <button
            type="button"
            className="spec-sheet-close"
            onClick={onClose}
            aria-label="Tutup detail unit"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <dl className="spec-sheet-grid">
          {specs.map((spec) => {
            const Icon = spec.icon;
            return (
              <div key={spec.label} className="spec-sheet-item">
                <dt className="spec-sheet-label">
                  <Icon size={13} aria-hidden="true" />
                  {spec.label}
                </dt>
                <dd className="spec-sheet-value">{spec.value}</dd>
              </div>
            );
          })}
        </dl>

        {Array.isArray(car.features) && car.features.length > 0 && (
          <ul className="spec-sheet-features">
            {car.features.map((feature) => (
              <li key={feature} className="spec-sheet-feature">
                <Check size={12} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        )}

        <div className="spec-sheet-foot">
          <div>
            <p className="spec-sheet-price-label">Mulai dari</p>
            <p className="spec-sheet-price tabular-nums">
              {formatRupiah(car.pricePerDay)}
              <span className="spec-sheet-price-unit">/hari</span>
            </p>
          </div>
          <div className="spec-sheet-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Kembali
            </button>
            <button type="button" className="btn btn-primary" onClick={() => onBook(car)}>
              Sewa Unit Ini
            </button>
          </div>
        </div>

        {!car.available && (
          <p className="spec-sheet-unavailable" role="status">
            Unit ini sedang tidak tersedia. Hubungi CS untuk jadwal berikutnya.
          </p>
        )}
      </div>
    </div>
  );
}

export default CarSpecSheet;
