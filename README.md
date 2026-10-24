# RentCar Pro

Aplikasi web sewa mobil modern, responsif, dan interaktif yang dibangun menggunakan standar rekayasa perangkat lunak **nodrift** (Layered Architecture: *Presentation → Domain → Data*).

---

## Fitur Utama

- **Katalog Armada Lengkap**: Pilihan kendaraan populer (Avanza, Innova Zenix Hybrid, Pajero Sport, Brio, Alphard, Ioniq 5 EV).
- **Filter, Pencarian & Urutan**: Filter kategori (MPV, SUV, City Car, Luxury, EV), transmisi, ketersediaan, dan batas harga harian; urutkan berdasarkan harga, rating, atau kapasitas.
- **Ketersediaan Berbasis Kalender**: Sistem menolak tanggal yang sudah terisi untuk unit yang sama, sehingga satu mobil tidak bisa dipesan ganda. Kartu armada menampilkan jadwal sewa berikutnya.
- **Kalkulator Biaya Sewa Real-Time**: Estimasi tarif dinamis berdasarkan rentang tanggal, opsi Lepas Kunci vs Dengan Sopir, Asuransi All-Risk, dan zona antar-jemput.
- **Form Pemesanan & Validasi**: Validasi nomor WhatsApp, KTP/SIM, tanggal lampau, dan persetujuan syarat sewa di sisi domain.
- **Invoice Voucher & WhatsApp Dispatch**: Cetak struk/voucher (dengan stylesheet khusus cetak) dan tautan satu-klik ke WhatsApp Customer Service.
- **Riwayat Pesanan**: Status otomatis (Terkonfirmasi / Sedang Berjalan / Selesai / Dibatalkan), pembatalan dengan konfirmasi inline, dan hapus per pesanan.
- **Panel Operasional Staf** (`#/admin`): Ringkasan pendapatan, tabel pesanan masuk, serta pengelolaan tarif dan status armada.
- **Sinkronisasi Antar-Tab & Notifikasi**: Pesanan yang masuk dari tab lain langsung muncul di panel staf tanpa reload, lengkap dengan lonceng notifikasi, penanda baris "Baru", dan tombol muat ulang manual.
- **Showroom 3D, Virtual & RPG** (`#/showroom`): Tiga cara melihat armada tanpa mengubah katalog. **Mode 3D** memutar dan memperbesar satu unit di atas panggung. **Mode Virtual** mengajak berjalan keliling showroom dengan sudut pandang orang pertama (WASD / tombol panah untuk berjalan, seret mouse untuk menoleh). **Mode RPG** memperlihatkan perjalanan yang sama dengan sudut pandang orang ketiga — ada karakter yang terlihat berjalan di depan kamera. Dekati mobil untuk membuka lembar spesifikasi, lalu sewa langsung dari sana. Pilihannya ada di tombol "Showroom 3D" pada halaman utama.
- **Penyimpanan Lokal (Offline-first)**: Seluruh data tersimpan di browser melalui `localStorage` — tidak butuh backend.

---

## Catatan Mockup

Aplikasi ini adalah **mockup front-end**. Beberapa hal sengaja disederhanakan:

- **Panel staf bukan autentikasi sungguhan.** PIN (`VITE_ADMIN_PIN`) ikut terkirim di bundle dan bisa dibaca siapa pun lewat DevTools. Gerbang PIN hanya mencegah pengunjung biasa masuk, bukan melindungi data. Kontrol akses nyata butuh verifikasi di sisi server.
- **Semua data ada di `localStorage`**, sehingga hanya berlaku di perangkat dan browser yang sama. Membuka di perangkat lain akan menampilkan katalog awal.
- **Notifikasi staf bersifat sementara.** Feed notifikasi hidup di memori tab dan hilang saat halaman di-reload — tidak ada server yang bisa mendorong notifikasi. Yang dijamin: staf yang sedang membuka panel diberi tahu saat itu juga.
- **Sinkronisasi hanya antar-tab di browser yang sama.** Panel staf dan katalog pada perangkat berbeda tidak saling mengetahui.
- **Pembayaran belum terintegrasi.** Konfirmasi dilakukan manual via WhatsApp.
- **Model 3D bukan kendaraan sebenarnya.** Showroom memakai [Kenney Car Kit](https://kenney.nl/assets/car-kit) (lisensi **CC0**, domain publik) — model low-poly bergaya yang dipetakan berdasarkan siluet bodi (van, SUV, hatchback, sedan), bukan replika Toyota/Honda berlisensi. Sama seperti foto katalog yang masih stok generik.
- **Showroom butuh WebGL.** Perangkat atau browser tanpa WebGL akan melihat pesan yang jelas beserta tautan ke katalog, bukan layar kosong. Bundle 3D dimuat terpisah, jadi pengunjung yang tidak membuka showroom tidak mengunduh Three.js sama sekali.
- **Mode Virtual & RPG butuh keyboard atau layar sentuh.** Di perangkat tanpa keduanya (misalnya TV box dengan remote), gunakan **Mode 3D** atau daftar unit di bawah panggung; keduanya bisa dioperasikan dengan pointer biasa.

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
│   ├── data/                # Data layer (carRepository, bookingRepository, mockCars, carModels, showroomLayout)
│   ├── domain/              # Domain services (availability, bookingStatus, catalog, rentalService, validation, showroomNavigation)
│   ├── components/          # Presentation layer (Navbar, CarCard, FilterBar, Modals)
│   │   └── showroom/        # Komponen 3D (stage, model mobil, kontrol kamera, spec sheet)
│   ├── pages/               # Screen assembly (CatalogPage, AdminPage, ShowroomPage)
│   ├── hooks/               # Reusable UI hooks (focus trap, hash route, storage sync)
│   ├── lib/                 # Pure formatting helpers (Rupiah, tanggal)
│   ├── styles/              # Design tokens, komponen, showroom, dan stylesheet cetak
│   ├── App.jsx              # Router tipis (katalog, panel staf, showroom)
│   └── main.jsx
├── public/
│   └── models/              # Model GLB Kenney (CC0) + Textures/colormap.png
├── .env.example             # Template konfigurasi environment
├── package.json
└── vite.config.js
```

---

## Cara Memakai Showroom 3D

1. Buka halaman utama, lalu klik **Showroom 3D** di bagian hero.
2. Pilih **Mode 3D** untuk memutar satu unit (seret untuk memutar, scroll untuk memperbesar), **Mode Virtual** untuk berjalan keliling dengan sudut pandang orang pertama, atau **Mode RPG** untuk berjalan dengan karakter dan sudut pandang orang ketiga.
3. Di Mode Virtual: **W A S D** atau tombol panah untuk berjalan, seret mouse untuk menoleh. Di Mode RPG: **W A S D** atau tombol panah untuk berjalan — karakter akan menghadap arah jalannya — seret mouse untuk memutar kamera mengelilingi karakter, dan scroll untuk menjauh atau mendekat. Di ponsel, gunakan tombol panah di kiri bawah layar dan seret layar untuk memutar kamera. Dekati sebuah mobil sampai muncul ajakan, lalu ketuk untuk membuka spesifikasinya.
4. Klik **Sewa Unit Ini** untuk membuka formulir booking yang sama dengan katalog.

Jika ingin mulai dari posisi awal, cukup muat ulang halaman.

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
- `VITE_ADMIN_PIN`: PIN gerbang panel staf `#/admin` (default: `2468`). **Bukan autentikasi** — lihat bagian Catatan Mockup.

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

