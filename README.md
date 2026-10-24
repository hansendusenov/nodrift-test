# RentCar Pro

Aplikasi web sewa mobil modern, responsif, dan interaktif yang dibangun menggunakan standar rekayasa perangkat lunak **nodrift** (Layered Architecture: *Presentation → Domain → Data*).

---

## Fitur Utama

- **Katalog Armada Lengkap**: Pilihan kendaraan populer (Avanza, Innova Zenix Hybrid, Pajero Sport, Brio, Alphard, Ioniq 5 EV).
- **Filter Cepat & Pencarian**: Filter berdasarkan kategori (MPV, SUV, City Car, Luxury, EV), jenis transmisi (Matic/Manual), dan ketersediaan unit.
- **Kalkulator Biaya Sewa Real-Time**: Estimasi tarif dinamis berdasarkan rentang tanggal, opsi Lepas Kunci vs Dengan Sopir, dan Asuransi All-Risk.
- **Form Pemesanan & Validasi**: Validasi nomor WhatsApp dan KTP/SIM di sisi domain.
- **Invoice Voucher & WhatsApp Dispatch**: Cetak struk/voucher pemesanan dan tautan satu-klik untuk mengirim detail sewa langsung ke WhatsApp Customer Service.
- **Penyimpanan Lokal (Offline-first)**: Riwayat pemesanan tersimpan aman di browser melalui `localStorage`.

---

## Arsitektur & Struktur Folder

Aplikasi mematuhi prinsip *Clean Layer Separation* (`nodrift-standard`):

```
├── .agent-context/          # State & Blueprint sinkronisasi AI Agent (nodrift-sync)
│   ├── BLUEPRINT.md
│   ├── STATE.md
│   └── HISTORY.md
├── scripts/                 # Lifecycle scripts siap pakai
│   ├── dev.bat              # Menjalankan server development
│   ├── build.bat            # Kompilasi bundle produksi
│   ├── test.bat             # Menjalankan unit tests
│   └── lint.bat             # Pengecekan linter Oxlint
├── src/
│   ├── config/              # Central single-entrypoint konfigurasi (.env)
│   ├── data/                # Data layer (carRepository, bookingRepository, mockCars)
│   ├── domain/              # Domain services & validation (rentalService, validation)
│   ├── components/          # Presentation layer (Navbar, CarCard, FilterBar, Modals)
│   ├── hooks/               # Reusable UI hooks (focus trap for dialogs)
│   ├── styles/              # Design tokens & komponen CSS murni
│   ├── App.jsx              # Root assembly component
│   └── main.jsx
├── .env.example             # Template konfigurasi environment
├── package.json
└── vite.config.js
```

---

## Panduan Menjalankan


### 1. Prasyarat
- Node.js (v18 ke atas)
- npm

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment
Salin template `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Variabel yang tersedia:
- `VITE_APP_NAME`: Nama aplikasi (default: `RentCar Pro`).
- `VITE_WHATSAPP_CONTACT`: Nomor WhatsApp CS rental tanpa tanda `+` (contoh: `6281234567890`).
- `VITE_DEFAULT_CURRENCY`: Mata uang (default: `IDR`).

### 4. Menjalankan Server Development
Gunakan lifecycle script atau npm:
```bash
# Windows script:
.\scripts\dev.bat

# Atau via npm:
npm run dev
```
Buka browser di `http://localhost:5173`.

### 5. Menjalankan Unit Tests & Lint
```bash
# Menjalankan unit tests (Node built-in test runner):
npm test

# Menjalankan pengecekan linter:
npm run lint

# Kompilasi produksi:
npm run build
```

### 6. Menjalankan Hasil Build Produksi (Preview)
Setelah `npm run build` selesai, jalankan server preview:
```bash
# Windows script:
.\scripts\preview.bat

# Atau via npm:
npm run preview
```
Aplikasi hasil bundle produksi di folder `dist/` akan dapat diakses di `http://localhost:4173`.

