import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Calendar, UserCheck, Shield, Car, AlertCircle } from 'lucide-react';
import { calculateRentalCost } from '../domain/rentalService.js';
import { validateBookingInput } from '../domain/validation.js';
import { bookingRepository } from '../data/bookingRepository.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

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

  // Trap focus inside the dialog and restore it to the trigger on close
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true);

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
      <div
        className="modal-container"
        ref={containerRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="row-6">
            <Car size={20} color="var(--accent-primary)" aria-hidden="true" />
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
            <div role="alert" className="alert-danger">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Selected Car Banner */}
          <div className="selected-car-banner">
            <img
              src={car.imageUrl}
              alt={`Foto kendaraan ${car.name}`}
              className="selected-car-thumb"
            />
            <div>
              <h4 className="selected-car-name">{car.name}</h4>
              <p className="selected-car-meta">
                {car.category} • <span className="tabular-nums">{formatRupiah(car.pricePerDay)}</span> / hari
              </p>
            </div>
          </div>

          {/* Date Picker Range */}
          <div className="grid-2col">
            <div className="form-group">
              <label htmlFor="start-date-input" className="form-label">
                <Calendar size={14} className="form-label-icon" aria-hidden="true" /> Tanggal Mulai
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
                <Calendar size={14} className="form-label-icon" aria-hidden="true" /> Tanggal Selesai
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
          <div className="stack-6">
            <label className={`option-box ${withDriver ? 'active' : ''}`}>
              <div className="option-box-main">
                <UserCheck size={18} color={withDriver ? 'var(--accent-primary)' : 'var(--text-muted)'} aria-hidden="true" />
                <div>
                  <div className="option-box-title">Sewa Dengan Sopir</div>
                  <div className="option-box-desc">
                    Driver profesional +<span className="tabular-nums">{formatRupiah(car.driverFeePerDay)}</span>/hari
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                className="option-checkbox option-checkbox-driver"
                checked={withDriver}
                onChange={(e) => setWithDriver(e.target.checked)}
              />
            </label>

            <label className={`option-box ${withInsurance ? 'active' : ''}`}>
              <div className="option-box-main">
                <Shield size={18} color={withInsurance ? 'var(--semantic-success)' : 'var(--text-muted)'} aria-hidden="true" />
                <div>
                  <div className="option-box-title">Asuransi All-Risk Protection</div>
                  <div className="option-box-desc">
                    Ganti rugi lecet & kecelakaan +<span className="tabular-nums">{formatRupiah(50000)}</span>/hari
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                className="option-checkbox option-checkbox-insurance"
                checked={withInsurance}
                onChange={(e) => setWithInsurance(e.target.checked)}
              />
            </label>
          </div>

          {/* Customer Information */}
          <div className="stack-12-top">
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

            <div className="grid-2col">
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
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-submit"
              disabled={isSubmitting}
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

