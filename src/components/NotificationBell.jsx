/**
 * Notification bell and panel for the staff view.
 *
 * Kept in its own file so `AdminPage.jsx` exports only the page component,
 * which keeps React Fast Refresh working.
 */
import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';

export const NotificationBell = ({ notifications, onClear, onDismiss }) => {
  const [open, setOpen] = useState(false);
  const count = notifications.length;

  return (
    <div className="notif-wrap">
      <button
        type="button"
        className="btn btn-secondary nav-action-btn notif-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          count > 0
            ? `Notifikasi operasional, ${count} belum dibaca`
            : 'Notifikasi operasional, tidak ada yang baru'
        }
      >
        <Bell size={15} aria-hidden="true" />
        <span className="hide-on-mobile">Notifikasi</span>
        {count > 0 && (
          <span className="notif-count tabular-nums" aria-hidden="true">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel" role="region" aria-label="Daftar notifikasi">
          <div className="notif-panel-head">
            <span className="notif-panel-title">Notifikasi</span>
            {count > 0 && (
              <button type="button" className="link-button" onClick={onClear}>
                Bersihkan
              </button>
            )}
          </div>

          {count === 0 ? (
            <p className="notif-empty">Belum ada aktivitas baru.</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((item) => (
                <li key={item.id} className="notif-item">
                  <div className="notif-item-main">
                    <p className="notif-item-title">{item.title}</p>
                    {item.detail && <p className="notif-item-detail">{item.detail}</p>}
                    <p className="notif-item-time tabular-nums">
                      {new Date(item.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="notif-item-dismiss"
                    onClick={() => onDismiss(item.id)}
                    aria-label={`Tutup notifikasi ${item.title}`}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
