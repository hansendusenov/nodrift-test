import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, History, Trash2, Calendar, Ban, FileText } from 'lucide-react';
import { bookingRepository } from '../data/bookingRepository.js';
import { formatRupiah, formatDateID } from '../lib/format.js';
import {
  BOOKING_STATUS,
  BOOKING_STATUS_META,
  canCancelBooking,
  deriveBookingStatus,
  sortBookingsByRelevance,
} from '../domain/bookingStatus.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

export const BookingHistoryModal = ({ isOpen, onClose, onViewInvoice }) => {
  const [version, setVersion] = useState(0);
  const [pendingAction, setPendingAction] = useState(null);
  const containerRef = useRef(null);

  useFocusTrap(containerRef, isOpen);

  // Re-read storage whenever the modal opens or an action changes it
  const bookings = useMemo(() => {
    if (!isOpen) return [];
    return sortBookingsByRelevance(bookingRepository.getAll());
    // `version` is the invalidation token for the storage read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, version]);

  // Handle ESC key close
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Escape dismisses the inline confirmation first, then the dialog
        setPendingAction(null);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const refresh = () => setVersion((prev) => prev + 1);

  const handleCancel = (bookingId) => {
    bookingRepository.cancel(bookingId);
    setPendingAction(null);
    refresh();
  };

  const handleDelete = (bookingId) => {
    bookingRepository.remove(bookingId);
    setPendingAction(null);
    refresh();
  };

  const handleClearAll = () => {
    bookingRepository.clear();
    setPendingAction(null);
    refresh();
    onClose();
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
              {bookings.map((b) => {
                const status = deriveBookingStatus(b);
                const meta = BOOKING_STATUS_META[status];
                const cancellable = canCancelBooking(b);
                const isCancelled = status === BOOKING_STATUS.CANCELLED;
                const isPending = pendingAction?.id === b.id;

                return (
                  <div key={b.id} className={`history-item ${isCancelled ? 'is-cancelled' : ''}`}>
                    <div className="row-between">
                      <span className="history-item-code tabular-nums">
                        {b.id}
                      </span>
                      <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
                    </div>

                    <div className="history-item-car">{b.carName}</div>

                    <div className="history-item-meta">
                      <span className="invoice-date-inline">
                        <Calendar size={13} color="var(--accent-primary)" aria-hidden="true" />
                        <span className="tabular-nums">{formatDateID(b.startDate)}</span> s/d{' '}
                        <span className="tabular-nums">{formatDateID(b.endDate)}</span>
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{b.withDriver ? 'Dengan Sopir' : 'Lepas Kunci'}</span>
                      <span aria-hidden="true">•</span>
                      <span className="history-item-total tabular-nums">
                        Total: {formatRupiah(b.costBreakdown?.grandTotal || 0)}
                      </span>
                    </div>

                    {/* Inline confirmation keeps the destructive step local,
                        so a misclick cannot delete a booking outright. */}
                    {isPending ? (
                      <div className="history-confirm" role="alert">
                        <p className="history-confirm-text">
                          {pendingAction.type === 'cancel'
                            ? 'Batalkan pesanan ini? Tanggal unit akan dilepas kembali.'
                            : 'Hapus pesanan ini dari riwayat secara permanen?'}
                        </p>
                        <div className="history-item-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPendingAction(null)}
                          >
                            Tidak
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() =>
                              pendingAction.type === 'cancel'
                                ? handleCancel(b.id)
                                : handleDelete(b.id)
                            }
                          >
                            Ya, {pendingAction.type === 'cancel' ? 'Batalkan' : 'Hapus'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="history-item-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onViewInvoice(b)}
                        >
                          <FileText size={14} aria-hidden="true" />
                          Lihat Invoice
                        </button>
                        {cancellable && (
                          <button
                            type="button"
                            className="btn btn-ghost-danger btn-sm"
                            onClick={() => setPendingAction({ id: b.id, type: 'cancel' })}
                          >
                            <Ban size={14} aria-hidden="true" />
                            Batalkan
                          </button>
                        )}
                        {!cancellable && (
                          <button
                            type="button"
                            className="btn btn-ghost-danger btn-sm"
                            onClick={() => setPendingAction({ id: b.id, type: 'delete' })}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            Hapus
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="history-clear-row">
                {pendingAction?.type === 'clear' ? (
                  <div className="history-confirm history-confirm-block">
                    <p className="history-confirm-text">
                      Hapus seluruh riwayat pesanan lokal? Tindakan ini tidak bisa dibatalkan.
                    </p>
                    <div className="history-item-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPendingAction(null)}
                      >
                        Tidak
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={handleClearAll}
                      >
                        Ya, Hapus Semua
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingAction({ id: null, type: 'clear' })}
                    className="link-button-danger"
                  >
                    <Trash2 size={14} aria-hidden="true" /> Hapus Semua Riwayat
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingHistoryModal;
