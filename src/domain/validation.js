/**
 * Domain Validation for Rental Booking Requests.
 * Adheres to nodrift-standard Section 5: Validate at the boundary.
 */

import { todayISO } from './bookingStatus.js';

/**
 * Validates a booking request before it reaches storage.
 *
 * @param {object} params
 * @param {string} params.customerName
 * @param {string} params.customerPhone
 * @param {string} params.customerIdCard
 * @param {string} params.startDate
 * @param {string} params.endDate
 * @param {boolean} [params.agreeToTerms] Customer must accept the rental terms.
 * @param {string} [params.pickupOptionId] Delivery zone; must exist in PICKUP_OPTIONS.
 * @param {string[]} [params.pickupOptionIds] Allowed zone ids, injected by the caller.
 * @param {string} [params.today] Reference date for the past-date rule.
 * @returns {{isValid: boolean, errors: object}}
 */
export function validateBookingInput({
  customerName,
  customerPhone,
  customerIdCard,
  startDate,
  endDate,
  agreeToTerms = false,
  pickupOptionId = 'DEPOT',
  pickupOptionIds = ['DEPOT'],
  today = todayISO(),
}) {
  const errors = {};

  if (!customerName || customerName.trim().length < 3) {
    errors.customerName = 'Nama lengkap minimal 3 karakter.';
  }

  const phoneRegex = /^[0-9+\s-]{9,16}$/;
  if (!customerPhone || !phoneRegex.test(customerPhone.trim())) {
    errors.customerPhone = 'Nomor WhatsApp tidak valid (minimal 9 digit).';
  }

  if (!customerIdCard || customerIdCard.trim().length < 6) {
    errors.customerIdCard = 'Nomor identitas KTP/SIM minimal 6 digit.';
  }

  if (!startDate) {
    errors.startDate = 'Tanggal mulai sewa wajib diisi.';
  } else if (startDate < today) {
    errors.startDate = 'Tanggal mulai tidak boleh di masa lalu.';
  }

  if (!endDate) {
    errors.endDate = 'Tanggal selesai sewa wajib diisi.';
  }

  if (startDate && endDate) {
    if (endDate < startDate) {
      errors.endDate = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
    }
  }

  if (!pickupOptionIds.includes(pickupOptionId)) {
    errors.pickupOptionId = 'Pilih lokasi pengambilan unit yang tersedia.';
  }

  if (!agreeToTerms) {
    errors.agreeToTerms = 'Anda harus menyetujui syarat & ketentuan sewa.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Generates formatted WhatsApp message URI for frictionless rental confirmation.
 */
export function buildWhatsAppBookingMessage({
  whatsappContact,
  bookingId,
  car,
  costBreakdown,
  bookingData,
}) {
  const lines = [
    `*KONFIRMASI SEWA MOBIL - ${bookingId}*`,
    `----------------------------------------`,
    `*Penyewa:* ${bookingData.customerName}`,
    `*No. WhatsApp:* ${bookingData.customerPhone}`,
    `*No. Identitas:* ${bookingData.customerIdCard}`,
    ``,
    `*Armada:* ${car.name} (${car.year})`,
    `*Kategori:* ${car.category} | ${car.transmission}`,
    `*Periode:* ${bookingData.startDate} s/d ${bookingData.endDate} (${costBreakdown.days} hari)`,
    `*Layanan:* ${bookingData.withDriver ? 'Dengan Sopir' : 'Lepas Kunci'}`,
    `*Asuransi:* ${bookingData.withInsurance ? 'Perlindungan Penuh' : 'Standar'}`,
    `*Pengambilan:* ${costBreakdown.pickupLabel || 'Ambil di Depot'}`,
    bookingData.notes ? `*Catatan:* ${bookingData.notes}` : null,
    ``,
    `*Rincian Biaya:*`,
    `- Sewa Mobil: Rp ${costBreakdown.carSubtotal.toLocaleString('id-ID')}`,
    bookingData.withDriver ? `- Jasa Sopir: Rp ${costBreakdown.driverSubtotal.toLocaleString('id-ID')}` : null,
    bookingData.withInsurance ? `- Asuransi: Rp ${costBreakdown.insuranceSubtotal.toLocaleString('id-ID')}` : null,
    costBreakdown.pickupFee ? `- Antar/Jemput: Rp ${costBreakdown.pickupFee.toLocaleString('id-ID')}` : null,
    `----------------------------------------`,
    `*TOTAL BIAYA: Rp ${costBreakdown.grandTotal.toLocaleString('id-ID')}*`,
    ``,
    `Mohon konfirmasi ketersediaan dan instruksi penjemputan unit. Terima kasih!`,
  ].filter(Boolean);

  const encoded = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${whatsappContact}?text=${encoded}`;
}
