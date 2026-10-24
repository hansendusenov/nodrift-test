import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Calendar, UserCheck, Shield, Car, AlertCircle } from 'lucide-react';
import { calculateRentalCost } from '../domain/rentalService.js';
import { validateBookingInput } from '../domain/validation.js';
import { bookingRepository } from '../data/bookingRepository.js';

const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

const getInitialDates = () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const dayAfter = new Date(now.getTime() + 3 * 86400000);
  return {
    today: now.toISOString().slice(0, 10),
    tomorrow: tomorrow.toISOString().slice(0, 10),
    dayAfter: dayAfter.toISOString().slice(0, 10),
  };
};

export const BookingModal = ({ car, onClose, onBookingSuccess }) => {
  const [initialDates] = useState(getInitialDates);
  const [startDate, setStartDate] = useState(initialDates.tomorrow);
  const [endDate, setEndDate] = useState(initialDates.dayAfter);
  const [withDriver, setWithDriver] = useState(false);
  const [withInsurance, setWithInsurance] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Input refs for auto-focusing first invalid field
  const customerNameRef = useRef(null);
  const customerPhoneRef = useRef(null);
  const customerIdCardRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  // Close on Escape key (nodrift-ui Section 6)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Customer Form State
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerIdCard: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState({});

  // Dynamic cost calculation via domain service
  const cost = useMemo(() => {
    return calculateRentalCost({
      pricePerDay: car.pricePerDay,
      driverFeePerDay: car.driverFeePerDay,
      startDate,
      endDate,
      withDriver,
      withInsurance,
    });
  }, [car, startDate, endDate, withDriver, withInsurance]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateBookingInput({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerIdCard: formData.customerIdCard,
      startDate,
      endDate,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      // Move focus to first invalid field (nodrift-ui Section 5.4)
      const refMap = {
        customerName: customerNameRef,
        customerPhone: customerPhoneRef,
        customerIdCard: customerIdCardRef,
        startDate: startDateRef,
        endDate: endDateRef,
      };
      const firstErrorKey = Object.keys(validation.errors)[0];
      if (firstErrorKey && refMap[firstErrorKey]?.current) {
        refMap[firstErrorKey].current.focus();
      }
      return;
    }

    try {
      setIsSubmitting(true);
      const savedBooking = bookingRepository.create({
        carId: car.id,
        carName: car.name,
        carCategory: car.category,
        carYear: car.year,
        startDate,
        endDate,
        withDriver,
        withInsurance,
        costBreakdown: cost,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        customerIdCard: formData.customerIdCard.trim(),
        notes: formData.notes.trim(),
      });

      onBookingSuccess(savedBooking, car);
    } catch (err) {
      console.error('[BookingModal] Failed to create booking:', err);
      setSubmitError('Terjadi kesalahan saat memproses pesanan Anda. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Car size={20} color="var(--accent-primary)" />
            <h2 id="booking-modal-title" className="modal-title">Form Sewa Mobil</h2>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Tutup dialog pemesanan"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="modal-body" noValidate>
          {submitError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid var(--accent-rose)',
                borderRadius: 'var(--radius-md)',
                color: '#fb7185',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{submitError}</span>
            </div>
          )}

          {/* Selected Car Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.85rem 1rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)'
          }}>
            <img
              src={car.imageUrl}
              alt={`Foto kendaraan ${car.name}`}
              style={{ width: 68, height: 48, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
            />
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{car.name}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {car.category} • <span className="tabular-nums">{formatRupiah(car.pricePerDay)}</span> / hari
              </p>
            </div>
          </div>

          {/* Date Picker Range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="start-date-input" className="form-label">
                <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Tanggal Mulai
              </label>
              <input
                id="start-date-input"
                ref={startDateRef}
                type="date"
                className={`form-input ${formErrors.startDate ? 'error' : ''}`}
                min={initialDates.today}
                value={startDate}
                aria-invalid={Boolean(formErrors.startDate)}
                aria-describedby={formErrors.startDate ? 'start-date-error' : undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {formErrors.startDate && (
                <span id="start-date-error" className="form-error">{formErrors.startDate}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="end-date-input" className="form-label">
                <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} /> Tanggal Selesai
              </label>
              <input
                id="end-date-input"
                ref={endDateRef}
                type="date"
                className={`form-input ${formErrors.endDate ? 'error' : ''}`}
                min={startDate || initialDates.today}
                value={endDate}
                aria-invalid={Boolean(formErrors.endDate)}
                aria-describedby={formErrors.endDate ? 'end-date-error' : undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {formErrors.endDate && (
                <span id="end-date-error" className="form-error">{formErrors.endDate}</span>
              )}
            </div>
          </div>


          {/* Options: Driver & Insurance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div
              className={`option-box ${withDriver ? 'active' : ''}`}
              onClick={() => setWithDriver(!withDriver)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWithDriver(!withDriver); } }}
              aria-pressed={withDriver}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <UserCheck size={18} color={withDriver ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sewa Dengan Sopir</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Driver profesional +<span className="tabular-nums">{formatRupiah(car.driverFeePerDay)}</span>/hari
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={withDriver}
                onChange={() => {}}
                aria-label="Pilih opsi sewa dengan sopir"
                style={{ accentColor: 'var(--accent-primary)', width: 18, height: 18 }}
              />
            </div>

            <div
              className={`option-box ${withInsurance ? 'active' : ''}`}
              onClick={() => setWithInsurance(!withInsurance)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setWithInsurance(!withInsurance); } }}
              aria-pressed={withInsurance}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={18} color={withInsurance ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Asuransi All-Risk Protection</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ganti rugi lecet & kecelakaan +<span className="tabular-nums">{formatRupiah(50000)}</span>/hari
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={withInsurance}
                onChange={() => {}}
                aria-label="Pilih perlindungan asuransi All-Risk"
                style={{ accentColor: 'var(--accent-emerald)', width: 18, height: 18 }}
              />
            </div>
          </div>

          {/* Customer Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
            <div className="form-group">
              <label htmlFor="customer-name-input" className="form-label">Nama Lengkap Penyewa *</label>
              <input
                id="customer-name-input"
                ref={customerNameRef}
                type="text"
                autoComplete="name"
                className={`form-input ${formErrors.customerName ? 'error' : ''}`}
                placeholder="Contoh: Budi Santoso"
                value={formData.customerName}
                aria-invalid={Boolean(formErrors.customerName)}
                aria-describedby={formErrors.customerName ? 'customer-name-error' : undefined}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
              />
              {formErrors.customerName && (
                <span id="customer-name-error" className="form-error">{formErrors.customerName}</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="customer-phone-input" className="form-label">Nomor WhatsApp *</label>
                <input
                  id="customer-phone-input"
                  ref={customerPhoneRef}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={`form-input ${formErrors.customerPhone ? 'error' : ''}`}
                  placeholder="Contoh: 081234567890"
                  value={formData.customerPhone}
                  aria-invalid={Boolean(formErrors.customerPhone)}
                  aria-describedby={formErrors.customerPhone ? 'customer-phone-error' : undefined}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                />
                {formErrors.customerPhone && (
                  <span id="customer-phone-error" className="form-error">{formErrors.customerPhone}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="customer-idcard-input" className="form-label">No. KTP / SIM *</label>
                <input
                  id="customer-idcard-input"
                  ref={customerIdCardRef}
                  type="text"
                  inputMode="numeric"
                  className={`form-input ${formErrors.customerIdCard ? 'error' : ''}`}
                  placeholder="3201xxxxxx"
                  value={formData.customerIdCard}
                  aria-invalid={Boolean(formErrors.customerIdCard)}
                  aria-describedby={formErrors.customerIdCard ? 'customer-idcard-error' : undefined}
                  onChange={(e) => handleInputChange('customerIdCard', e.target.value)}
                />
                {formErrors.customerIdCard && (
                  <span id="customer-idcard-error" className="form-error">{formErrors.customerIdCard}</span>
                )}
              </div>

            </div>

            <div className="form-group">
              <label htmlFor="customer-notes-input" className="form-label">Catatan Tambahan (Opsional)</label>
              <input
                id="customer-notes-input"
                type="text"
                className="form-input"
                placeholder="Lokasi antar jemput khusus / permintaan khusus"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Cost Summary Box */}
          <div className="cost-summary-card">
            <div className="summary-row">
              <span>Sewa Mobil (<span className="tabular-nums">{cost.days}</span> hari)</span>
              <span className="tabular-nums">{formatRupiah(cost.carSubtotal)}</span>
            </div>
            {withDriver && (
              <div className="summary-row">
                <span>Jasa Sopir (<span className="tabular-nums">{cost.days}</span> hari)</span>
                <span className="tabular-nums">{formatRupiah(cost.driverSubtotal)}</span>
              </div>
            )}
            {withInsurance && (
              <div className="summary-row">
                <span>Asuransi All-Risk (<span className="tabular-nums">{cost.days}</span> hari)</span>
                <span className="tabular-nums">{formatRupiah(cost.insuranceSubtotal)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total Estimasi Biaya</span>
              <span className="total-amount tabular-nums">{formatRupiah(cost.grandTotal)}</span>
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ flex: 2 }}
            >
              {isSubmitting ? 'Memproses...' : 'Konfirmasi & Buat Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;

