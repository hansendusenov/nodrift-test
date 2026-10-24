import React, { useEffect, useRef } from 'react';
import { X, CheckCircle2, MessageSquare, Printer, Calendar } from 'lucide-react';
import { buildWhatsAppBookingMessage } from '../domain/validation.js';
import { appConfig } from '../config/index.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
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
            <span id="invoice-modal-title" className="invoice-badge-status">
              <CheckCircle2 size={16} /> Booking Berhasil Dibuat
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
                  <span className="tabular-nums">{booking.startDate}</span> s/d <span className="tabular-nums">{booking.endDate}</span> (<span className="tabular-nums">{booking.costBreakdown.days}</span> Hari)
                </span>
                <span>•</span>
                <span>{booking.withDriver ? 'Driver Termasuk' : 'Lepas Kunci'}</span>
                <span>•</span>
                <span>{booking.withInsurance ? 'Proteksi Penuh' : 'Standar'}</span>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="invoice-section-top-flush">
              <div className="summary-row">
                <span>Biaya Unit Mobil</span>
                <span className="tabular-nums">{formatRupiah(booking.costBreakdown.carSubtotal)}</span>
              </div>
              {booking.withDriver && (
                <div className="summary-row">
                  <span>Jasa Sopir</span>
                  <span className="tabular-nums">{formatRupiah(booking.costBreakdown.driverSubtotal)}</span>
                </div>
              )}
              {booking.withInsurance && (
                <div className="summary-row">
                  <span>Asuransi All-Risk</span>
                  <span className="tabular-nums">{formatRupiah(booking.costBreakdown.insuranceSubtotal)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Total Tagihan</span>
                <span className="total-amount tabular-nums">{formatRupiah(booking.costBreakdown.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="invoice-actions">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              <MessageSquare size={20} aria-hidden="true" />
              Kirim Bukti ke WhatsApp Customer Service
            </a>

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

