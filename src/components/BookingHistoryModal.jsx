import React, { useState, useEffect, useMemo } from 'react';
import { X, History, Trash2, Calendar } from 'lucide-react';
import { bookingRepository } from '../data/bookingRepository.js';

const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const BookingHistoryModal = ({ isOpen, onClose, onViewInvoice }) => {
  const [clearedVersion, setClearedVersion] = useState(0);

  // Derive bookings whenever modal is open or cleared
  const bookings = useMemo(() => {
    if (!isOpen || clearedVersion < 0) return [];
    return bookingRepository.getAll();
  }, [isOpen, clearedVersion]);


  // Handle ESC key close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClearHistory = () => {
    if (window.confirm('Hapus seluruh riwayat pesanan lokal?')) {
      bookingRepository.clear();
      setClearedVersion((prev) => prev + 1);
      onClose();
    }
  };


  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={20} color="var(--accent-primary)" />
            <h2 id="history-modal-title" className="modal-title">
              Riwayat Pesanan Anda (<span className="tabular-nums">{bookings.length}</span>)
            </h2>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Tutup riwayat pesanan"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: 600 }}>Belum ada riwayat booking.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Silakan pilih salah satu armada mobil dan buat pesanan pertama Anda.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {bookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-primary)' }}
                      className="tabular-nums"
                    >
                      {b.id}
                    </span>
                    <span className="badge badge-emerald">Terkonfirmasi</span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{b.carName}</div>

                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={13} color="var(--accent-primary)" />
                      <span className="tabular-nums">{b.startDate}</span> s/d <span className="tabular-nums">{b.endDate}</span>
                    </span>
                    <span>•</span>
                    <span>{b.withDriver ? 'Dengan Sopir' : 'Lepas Kunci'}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }} className="tabular-nums">
                      Total: {formatRupiah(b.costBreakdown?.grandTotal || 0)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => {
                        onViewInvoice(b);
                      }}
                    >
                      Buka Voucher Invoice
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fb7185',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Trash2 size={14} /> Hapus Riwayat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingHistoryModal;

