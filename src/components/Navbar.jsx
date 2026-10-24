import React from 'react';
import { Car, PhoneCall, History } from 'lucide-react';
import { appConfig } from '../config/index.js';

export const Navbar = ({ availableCount, totalCount, onOpenHistory }) => {
  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <a href="#" className="brand-logo" aria-label={`Beranda ${appConfig.appName}`}>
          <div className="brand-icon-box" aria-hidden="true">
            <Car size={20} />
          </div>
          <span>
            {appConfig.appName}
            <span className="brand-pro-tag">PRO</span>
          </span>
        </a>

        {/* Action Controls */}
        <div className="nav-actions">
          <div className="fleet-status-indicator">
            <span className="status-dot-pulse" aria-hidden="true"></span>
            <span>
              <strong className="tabular-nums">{availableCount}</strong>/{totalCount} Siap Pakai
            </span>
          </div>

          {onOpenHistory && (
            <button
              type="button"
              className="btn btn-secondary nav-action-btn"
              onClick={onOpenHistory}
              aria-label="Buka riwayat pemesanan sewa"
            >
              <History size={15} aria-hidden="true" />
              <span className="hide-on-mobile">Riwayat Booking</span>
            </button>
          )}

          <a
            href={`https://wa.me/${appConfig.whatsappContact}?text=Halo%20${encodeURIComponent(appConfig.appName)},%20saya%20ingin%20tanya%20sewa%20mobil`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary nav-action-btn"
            aria-label="Hubungi customer service via WhatsApp"
          >
            <PhoneCall size={15} aria-hidden="true" />
            <span className="hide-on-mobile">Bantuan CS</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
