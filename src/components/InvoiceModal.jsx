import React, { useEffect } from 'react';
import { X, CheckCircle2, MessageSquare, Printer, Calendar } from 'lucide-react';
import { buildWhatsAppBookingMessage } from '../domain/validation.js';
import { appConfig } from '../config/index.js';

const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const InvoiceModal = ({ booking, car, onClose }) => {
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
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{appConfig.appName}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Bukti Pemesanan Sewa Mobil</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Kode Booking</span>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }} className="tabular-nums">
                  {booking.id}
                </p>
              </div>
            </div>

            {/* Customer Details */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Nama Pelanggan:</span>
                <span style={{ fontWeight: 600 }}>{booking.customerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Nomor WhatsApp:</span>
                <span className="tabular-nums">{booking.customerPhone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>No. Identitas (KTP/SIM):</span>
                <span className="tabular-nums">{booking.customerIdCard}</span>
              </div>
            </div>

            {/* Vehicle & Rental Details */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                {booking.carName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={13} color="var(--accent-primary)" />
                  <span className="tabular-nums">{booking.startDate}</span> s/d <span className="tabular-nums">{booking.endDate}</span> (<span className="tabular-nums">{booking.costBreakdown.days}</span> Hari)
                </span>
                <span>•</span>
                <span>{booking.withDriver ? 'Driver Termasuk' : 'Lepas Kunci'}</span>
                <span>•</span>
                <span>{booking.withInsurance ? 'Proteksi Penuh' : 'Standar'}</span>
              </div>
            </div>

            {/* Price breakdown */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
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
              <div className="summary-row total" style={{ marginTop: '0.5rem' }}>
                <span>Total Tagihan</span>
                <span className="total-amount tabular-nums">{formatRupiah(booking.costBreakdown.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
              style={{ width: '100%', fontSize: '1rem', padding: '0.85rem' }}
            >
              <MessageSquare size={20} />
              Kirim Bukti ke WhatsApp Customer Service
            </a>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={handlePrint} style={{ flex: 1 }}>
                <Printer size={16} />
                Cetak / Simpan PDF
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
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

