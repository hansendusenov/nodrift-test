import React, { useEffect, useRef } from 'react';
import { X, CheckCircle2, MessageSquare, Printer, Calendar, MapPin, Ban, Clock } from 'lucide-react';
import { buildWhatsAppBookingMessage } from '../domain/validation.js';
import { BOOKING_STATUS, BOOKING_STATUS_META, deriveBookingStatus } from '../domain/bookingStatus.js';
import { formatRupiah, formatDateID } from '../lib/format.js';
import { appConfig } from '../config/index.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

const STATUS_ICON = {
  [BOOKING_STATUS.CONFIRMED]: CheckCircle2,
  [BOOKING_STATUS.ONGOING]: Clock,
  [BOOKING_STATUS.COMPLETED]: CheckCircle2,
  [BOOKING_STATUS.CANCELLED]: Ban,
};

export const InvoiceModal = ({ booking, car, onClose }) => {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, Boolean(booking));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!booking) return null;

  const status = deriveBookingStatus(booking);
  const statusMeta = BOOKING_STATUS_META[status];
  const StatusIcon = STATUS_ICON[status] || CheckCircle2;
  const isCancelled = status === BOOKING_STATUS.CANCELLED;

  // A cancelled booking must not produce a confirmation message to the CS
  const waUrl = buildWhatsAppBookingMessage({
    whatsappContact: appConfig.whatsappContact,
    bookingId: booking.id,
    car: car || { name: booking.carName, year: booking.carYear, category: booking.carCategory, transmission: 'Auto' },
    costBreakdown: booking.costBreakdown,
    bookingData: {
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerIdCard: booking.customerIdCard,
      startDate: booking.startDate,
      endDate: booking.endDate,
      withDriver: booking.withDriver,
      withInsurance: booking.withInsurance,
      notes: booking.notes,
    },
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      <div
        className="modal-container modal-container-md"
        ref={containerRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="row-8">
            <span id="invoice-modal-title" className={`invoice-badge-status ${isCancelled ? 'is-cancelled' : ''}`}>
              <StatusIcon size={16} aria-hidden="true" /> {isCancelled ? 'Pesanan Dibatalkan' : 'Bukti Pemesanan'}
            </span>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Tutup invoice voucher"
          >
            <X size={20} />
          </button>
        </div>

        {/* Invoice Body */}
        <div className="modal-body">
          <div className="invoice-receipt">
            <div className="row-between-top">
              <div>
                <h3 className="invoice-brand-name">{appConfig.appName}</h3>
                <p className="invoice-brand-sub">Bukti Pemesanan Sewa Mobil</p>
              </div>
              <div className="text-end">
                <span className="invoice-code-label">Kode Booking</span>
                <p className="invoice-code-value tabular-nums">
                  {booking.id}
                </p>
                <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="invoice-section-top">
              <div className="invoice-detail-row">
                <span className="invoice-detail-label">Nama Pelanggan:</span>
                <span className="invoice-detail-value">{booking.customerName}</span>
              </div>
              <div className="invoice-detail-row">
                <span className="invoice-detail-label">Nomor WhatsApp:</span>
                <span className="tabular-nums">{booking.customerPhone}</span>
              </div>
              <div className="invoice-detail-row">
                <span className="invoice-detail-label">No. Identitas (KTP/SIM):</span>
                <span className="tabular-nums">{booking.customerIdCard}</span>
              </div>
            </div>

            {/* Vehicle & Rental Details */}
            <div className="invoice-vehicle-box">
              <div className="invoice-vehicle-name">
                {booking.carName}
              </div>
              <div className="invoice-vehicle-meta">
                <span className="invoice-date-inline">
                  <Calendar size={13} color="var(--accent-primary)" aria-hidden="true" />
                  <span className="tabular-nums">{formatDateID(booking.startDate)}</span> s/d{' '}
                  <span className="tabular-nums">{formatDateID(booking.endDate)}</span> (
                  <span className="tabular-nums">{booking.costBreakdown?.days || 1}</span> Hari)
                </span>
                <span aria-hidden="true">•</span>
                <span>{booking.withDriver ? 'Driver Termasuk' : 'Lepas Kunci'}</span>
                <span aria-hidden="true">•</span>
                <span>{booking.withInsurance ? 'Proteksi Penuh' : 'Standar'}</span>
              </div>
              {booking.costBreakdown?.pickupLabel && (
                <div className="invoice-vehicle-meta invoice-vehicle-meta-spaced">
                  <span className="invoice-date-inline">
                    <MapPin size={13} color="var(--accent-primary)" aria-hidden="true" />
                    {booking.costBreakdown.pickupLabel}
                  </span>
                </div>
              )}
              {booking.notes && (
                <p className="invoice-notes">Catatan: {booking.notes}</p>
              )}
            </div>

            {/* Price breakdown */}
            <div className="invoice-section-top-flush">
              <div className="summary-row">
                <span>Biaya Unit Mobil</span>
                <span className="tabular-nums">{formatRupiah(booking.costBreakdown?.carSubtotal)}</span>
              </div>
              {booking.withDriver && (
                <div className="summary-row">
                  <span>Jasa Sopir</span>
                  <span className="tabular-nums">{formatRupiah(booking.costBreakdown?.driverSubtotal)}</span>
                </div>
              )}
              {booking.withInsurance && (
                <div className="summary-row">
                  <span>Asuransi All-Risk</span>
                  <span className="tabular-nums">{formatRupiah(booking.costBreakdown?.insuranceSubtotal)}</span>
                </div>
              )}
              {Boolean(booking.costBreakdown?.pickupFee) && (
                <div className="summary-row">
                  <span>Antar / Jemput Unit</span>
                  <span className="tabular-nums">{formatRupiah(booking.costBreakdown?.pickupFee)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Total Tagihan</span>
                <span className="total-amount tabular-nums">{formatRupiah(booking.costBreakdown?.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="invoice-actions">
            {isCancelled ? (
              <p className="invoice-cancelled-note">
                Pesanan ini sudah dibatalkan. Hubungi customer service bila Anda ingin
                menjadwalkan ulang perjalanan.
              </p>
            ) : (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
              >
                <MessageSquare size={20} aria-hidden="true" />
                Kirim Bukti ke WhatsApp Customer Service
              </a>
            )}

            <div className="invoice-actions-row">
              <button type="button" className="btn btn-secondary" onClick={handlePrint}>
                <Printer size={16} aria-hidden="true" />
                Cetak / Simpan PDF
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
