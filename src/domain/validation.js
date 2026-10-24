/**
 * Domain Validation for Rental Booking Requests.
 * Adheres to nodrift-standard Section 5: Validate at the boundary.
 */

export function validateBookingInput({
  customerName,
  customerPhone,
  customerIdCard,
  startDate,
  endDate,
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
  }

  if (!endDate) {
    errors.endDate = 'Tanggal selesai sewa wajib diisi.';
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      errors.endDate = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
    }
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
    ``,
    `*Rincian Biaya:*`,
    `- Sewa Mobil: Rp ${costBreakdown.carSubtotal.toLocaleString('id-ID')}`,
    bookingData.withDriver ? `- Jasa Sopir: Rp ${costBreakdown.driverSubtotal.toLocaleString('id-ID')}` : null,
    bookingData.withInsurance ? `- Asuransi: Rp ${costBreakdown.insuranceSubtotal.toLocaleString('id-ID')}` : null,
    `----------------------------------------`,
    `*TOTAL BIAYA: Rp ${costBreakdown.grandTotal.toLocaleString('id-ID')}*`,
    ``,
    `Mohon konfirmasi ketersediaan dan instruksi penjemputan unit. Terima kasih!`,
  ].filter(Boolean);

  const encoded = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${whatsappContact}?text=${encoded}`;
}
