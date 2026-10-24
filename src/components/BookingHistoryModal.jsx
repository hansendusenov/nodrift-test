import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, History, Trash2, Calendar } from 'lucide-react';
import { bookingRepository } from '../data/bookingRepository.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const BookingHistoryModal = ({ isOpen, onClose, onViewInvoice }) => {
  const [clearedVersion, setClearedVersion] = useState(0);
  const containerRef = useRef(null);

  useFocusTrap(containerRef, isOpen);

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
      <div
        className="modal-container modal-container-lg"
        ref={containerRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="row-6">
            <History size={20} color="var(--accent-primary)" aria-hidden="true" />
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
            <div className="history-empty">
              <p className="history-empty-title">Belum ada riwayat booking.</p>
              <p className="history-empty-desc">
                Silakan pilih salah satu armada mobil dan buat pesanan pertama Anda.
              </p>
            </div>
          ) : (
            <div className="history-list">
              {bookings.map((b) => (
                <div key={b.id} className="history-item">
                  <div className="row-between">
                    <span className="history-item-code tabular-nums">
                      {b.id}
                    </span>
                    <span className="badge badge-emerald">Terkonfirmasi</span>
                  </div>

                  <div className="history-item-car">{b.carName}</div>

                  <div className="history-item-meta">
                    <span className="invoice-date-inline">
                      <Calendar size={13} color="var(--accent-primary)" aria-hidden="true" />
                      <span className="tabular-nums">{b.startDate}</span> s/d <span className="tabular-nums">{b.endDate}</span>
                    </span>
                    <span>•</span>
                    <span>{b.withDriver ? 'Dengan Sopir' : 'Lepas Kunci'}</span>
                    <span>•</span>
                    <span className="history-item-total tabular-nums">
                      Total: {formatRupiah(b.costBreakdown?.grandTotal || 0)}
                    </span>
                  </div>

                  <div className="history-item-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        onViewInvoice(b);
                      }}
                    >
                      Buka Voucher Invoice
                    </button>
                  </div>
                </div>
              ))}

              <div className="history-clear-row">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="link-button-danger"
                >
                  <Trash2 size={14} aria-hidden="true" /> Hapus Riwayat
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

