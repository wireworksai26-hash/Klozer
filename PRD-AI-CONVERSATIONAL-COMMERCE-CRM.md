# 📑 PRODUCT REQUIREMENT DOCUMENT (PRD)
# Platform: Conversational AI Commerce & Smart CRM (Next-Gen)
**Versi:** 1.0.0  
**Status:** Draft / Ready for Review  
**Target Pasar:** UKM, Brand Retail/E-Commerce, Jasa, & Lembaga Sosial (Indonesia)  
**Dokumen Referensi:** `docs/prd/PRD-AI-CONVERSATIONAL-COMMERCE-CRM.md`

---

## 1. Executive Summary & Product Vision

### 1.1 Visi Produk
Membangun platform **Omnichannel Conversational AI Commerce & CRM Terpadu** yang mentransformasi ruang obrolan WhatsApp menjadi mesin penjualan, layanan pelanggan, dan operasional keuangan otomatis tanpa hambatan (*frictionless zero-touch commerce*).

### 1.2 Masalah Nyata di Indonesia
1. **Tingginya Drop-off Pembayaran di Chat**: Pembeli enggan mengetik nomor rekening manual dan kirim screenshot bukti transfer.
2. **Ketergantungan Pembeli pada Voice Note**: Sebagian besar pengguna di Indonesia suka mengirim pesan suara yang sering diabaikan atau lambat diproses oleh chatbot konvensional.
3. **Maraknya Penipuan Bukti Transfer Palsu**: Banyak toko online dan lembaga donasi merugi akibat struk transfer editan Canva/Photoshop.
4. **Tingginya Tingkat RTS (Return to Sender) pada Pesanan COD**: Seller menanggung biaya ongkir hangus karena pembeli menolak paket saat kurir tiba.
5. **Kebocoran Iklan Meta (Click to WhatsApp)**: Advertiser tidak tahu iklan/campaign mana yang benar-benar menghasilkan closing di chat WhatsApp.

### 1.3 Nilai Pembeda (The 7 Core Differentiators)
1. **In-Chat Dynamic QRIS**: Checkout instan tanpa input nominal & tanpa upload bukti transfer.
2. **AI Voice Note (Speech-to-Text & Text-to-Speech)**: Memahami dan membalas VN secara natural.
3. **Deep Fraud Detection & Auto Bank Mutation**: Verifikasi manipulasi gambar + pencocokan mutasi rekening otomatis detik itu juga.
4. **Proactive AI Sales Agent**: Follow-up cerdas untuk abandoned intent dan cross-selling.
5. **COD Protection & Shipping Aggregator**: AI mitigasi risiko COD + monetisasi cashback ongkir ekspedisi.
6. **Meta Ads Attribution & CAPI**: Melacak ROAS riil dari klik iklan Facebook/Instagram ke transaksi chat.
7. **Smart Lead Distribution & CS Commission**: Pembagian lead berbasis performa dan kalkulasi komisi otomatis.

---

## 2. Target Persona

| Persona | Peran & Deskripsi | Pain Points Utama | Kebutuhan Solusi |
|---|---|---|---|
| **Pemilik Bisnis (Owner / Brand)** | Pengambil keputusan, fokus pada efisiensi biaya, omzet, dan laporan | Biaya CS membengkak, iklan bocor, orderan malam hari tidak terlayani | Dashboard performa omzet real-time, AI 24/7, tracking ROAS iklan |
| **Customer Service (CS / Sales)** | Frontliner yang melayani chat harian pelanggan | Lelah membalas pertanyaan berulang, cek ongkir manual, hitung pesanan | AI Co-pilot, auto-generate invoice, pembagian lead yang adil |
| **Finance & Admin** | Bertanggung jawab atas verifikasi uang masuk | Rawan disusupi struk transfer palsu, repot rekonsiliasi mutasi bank | Auto-matching mutasi bank, maker-checker approval transaksi |
| **Pelanggan / Donatur (End-User)** | Pengguna akhir yang berinteraksi di WhatsApp | Ingin respons cepat, proses bayar instan, tidak mau ribet ketik rekening | Pembayaran QRIS 1-klik, dilayani via teks maupun voice note |

---

## 3. Fitur Pembeda #1: In-Chat Dynamic QRIS & Instant Payment Engine

### 3.1 Deskripsi Fitur
Menghasilkan kode QRIS Dinamis berstandar EMVCo Nasional dengan nominal presisi (termasuk kode unik jika diperlukan) langsung di dalam chat WhatsApp, disertai deeplink e-wallet (BCA Mobile, GoPay, ShopeePay, OVO, Dana).

### 3.2 User Stories
* **Sebagai Pembeli**, saya ingin langsung scan QRIS dengan nominal yang sudah terkunci agar saya tidak perlu repot memasukkan angka dan kirim struk.
* **Sebagai Penjual**, saya ingin pesanan otomatis berubah menjadi "Lunas" detik itu juga saat pembeli membayar.

### 3.3 Spesifikasi Fungsional
1. **Trigger Pembayaran**:
   * Dipicu otomatis oleh AI saat mendeteksi *intent deal* atau manual oleh CS via panel samping chat.
2. **QRIS Generation**:
   * Memanggil Payment Gateway API (Xendit/Midtrans/OY/DOKU) untuk generate dynamic QR payload.
   * Merender gambar QRIS beresolusi tinggi dengan watermark logo bisnis dan countdown waktu berlaku (default 15 menit).
3. **Format Pengiriman Pesan WhatsApp**:
   * Gambar QRIS + Caption rincian item, total harga, batas waktu bayar, serta tautan bayar instan (*web checkout fallback*).
4. **Webhook Processing & Instant Settlement**:
   * Menerima webhook `payment.success` $\rightarrow$ memvalidasi HMAC signature $\rightarrow$ update order status ke `PAID` $\rightarrow$ trigger notifikasi WA konfirmasi lunas + link e-receipt PDF.

### 3.4 Kriteria Penerimaan (Acceptance Criteria)
* [ ] Waktu generate QRIS $\le 2$ detik sejak dipicu.
* [ ] Nominal tidak bisa dimanipulasi oleh pembeli (*exact match*).
* [ ] Status pesanan berubah lunas $\le 3$ detik setelah pembayaran dilakukan.
* [ ] Sistem memiliki *idempotency key* untuk mencegah dobel tagihan.

---

## 4. Fitur Pembeda #2: AI Voice Note Engine (Speech-to-Text & Text-to-Speech)

### 4.1 Deskripsi Fitur
Memproses pesan suara (Voice Note `.ogg` / `.mp3`) yang dikirim pembeli ke WhatsApp, mengekstrak maksud teksnya dengan pemahaman bahasa Indonesia/gaul/aksen daerah, dan membalas obrolan dengan teks dan/atau pesan suara audio natural.

### 4.2 Spesifikasi Fungsional
1. **Voice Ingestion & Transcription**:
   * Menerima media audio dari webhook WhatsApp $\rightarrow$ download stream audio ke buffer aman.
   * Transkripsi via Whisper Large-v3 / Deepgram Nova-2 dengan parameter `language: "id"`.
2. **Intent Parsing & Knowledge Search (RAG)**:
   * Hasil transkripsi diproses oleh engine AI untuk dicari konteksnya di basis pengetahuan (produk, harga, stok, FAQ).
3. **Voice Response Generation (TTS)**:
   * Menghasilkan audio balasan menggunakan neural voice model berbahasa Indonesia ramah (*warm & polite customer service tone*).
   * Mengonversi audio ke format OGG Opus standar WhatsApp Voice Note agar muncul visual *bubble voice note*.

### 4.3 Kriteria Penerimaan (Acceptance Criteria)
* [ ] Transkripsi akurat untuk bahasa Indonesia formal, slang/gaul, dan istilah belanja online (*misal: "sis", "gan", "ongkir", "cod"*).
* [ ] Total latency end-to-end (VN masuk $\rightarrow$ VN balasan keluar) $\le 4$ detik.
* [ ] Transkripsi teks tetap tersimpan di log percakapan agar dapat dibaca oleh supervisor.

---

## 5. Fitur Pembeda #3: Deep AI Fraud Detection & Auto Bank Mutation

### 5.1 Deskripsi Fitur
Sistem pertahanan berlapis untuk memverifikasi keabsahan pembayaran transfer manual:
1. **Analisis Forensik Gambar (Image Forensics AI)** untuk mendeteksi struk editan Canva/Photoshop.
2. **Pencocokan Mutasi Bank Otomatis (Auto-Reconciliation)** via API open finance / scraper mutasi aman.

### 5.2 Spesifikasi Fungsional
1. **Image Forensics Scanner**:
   * Membaca font, alignment teks, noise level analysis (ELA), dan metadata file.
   * Jika font nominal berbeda dari font resmi template m-banking (BCA/Mandiri/BRI/BSI) $\rightarrow$ sistem memberi badge `⚠️ Struk Terindikasi Editan`.
2. **Auto-Reconciliation Engine**:
   * Menangkap nominal, tanggal, dan nama pengirim dari struk transfer via OCR.
   * Melakukan kueri ke data mutasi rekening bank yang terhubung (BCA KlikBCA / Mandiri / BRI API).
   * Jika mutasi uang masuk ditemukan dengan nominal dan waktu yang cocok $\rightarrow$ status otomatis `Disetujui / Verified`.
   * Jika mutasi tidak ditemukan dalam 15 menit $\rightarrow$ status `Menunggu Verifikasi Manual Finance`.

### 5.3 Kriteria Penerimaan (Acceptance Criteria)
* [ ] Mampu mengenali format struk dari minimal 5 bank terbesar di Indonesia (BCA, Mandiri, BRI, BNI, BSI) + e-wallet (GoPay, OVO, ShopeePay, DANA).
* [ ] Memberikan skor keyakinan (*Confidence Score 0–100%*) pada setiap bukti transfer.
* [ ] Tidak pernah menyetujui transaksi jika mutasi bank belum terkonfirmasi masuk.

---

## 6. Fitur Pembeda #4: Proactive AI Sales & Follow-Up Engine

### 6.1 Deskripsi Fitur
Mesin penjualan proaktif yang mendeteksi lead yang berhenti merespons (*ghosting*) setelah menanyakan produk/harga/rekening, dan mengirimkan pesan follow-up personal secara otomatis pada waktu optimal.

### 6.2 Alur & Skenario Follow-Up
1. **Skenario 1: Tanya Rekening tapi Belum Bayar (Abandoned Checkout)**
   * *Trigger*: Pelanggan telah menerima rekening/QRIS namun belum ada pembayaran dalam 2 jam.
   * *Aksi AI*: Mengirim pesan ramah menanyakan apakah ada kendala pembayaran atau butuh bantuan transfer.
2. **Skenario 2: Tanya Produk tapi Berhenti Merespons (Consultation Abandoned)**
   * *Trigger*: 24 jam setelah obrolan konsultasi terakhir tanpa pesanan.
   * *Aksi AI*: Memberikan penawaran terbatas / benefit tambahan (*e.g., voucher free ongkir khusus hari ini*).
3. **Skenario 3: Pelanggan Lama yang Mulai Jenuh (Re-Engagement)**
   * *Trigger*: 30 hari tanpa pembelian untuk pelanggan yang sebelumnya pernah repeat order.
   * *Aksi AI*: Rekomendasi produk baru / pengingat restock kebutuhan rutin.

### 6.3 Anti-Spam & Fatigue Rules
* Maksimal follow-up otomatis: 2x per percakapan (mencegah komplain spam).
* Jam operasional pengiriman follow-up dibatasi antara pukul 08.30 – 20.30 WIB.
* Jika pelanggan membalas kata kunci penolakan (*"tidak jadi", "batal", "stop"*), AI otomatis berhenti mem-follow up dan mengubah status lead menjadi `Closed Lost`.

---

## 7. Fitur Pembeda #5: COD Protection & Multi-Ekspedisi Shipping Aggregator

### 7.1 Deskripsi Fitur
1. **AI Anti-RTS Score**: Menilai kelayakan pembeli sebelum pesanan COD disetujui untuk mengurangi risiko retur.
2. **One-Click Multi-Courier Booking**: Cek tarif ongkir semua ekspedisi lokal dan pemesanan pickup kurir dalam 1 dashboard.

### 7.2 Spesifikasi Fungsional
1. **AI COD Confirmation Flow**:
   * Saat pembeli memilih COD $\rightarrow$ AI mengirim pesan konfirmasi khusus meminta pembeli mengetuk tombol persetujuan komitmen bayar di tempat.
   * AI memvalidasi kelengkapan alamat (RT/RW, No Rumah, Kelurahan, Kecamatan, Kode Pos).
2. **Ekspedisi Partner Integration**:
   * Terintegrasi dengan agregator logistik (J&T, SiCepat, SAP Express, Ninja Van, Anteraja, JNE, Lion Parcel).
   * Menampilkan perbandingan ongkir (Reguler, Hemat/Kargo, Next Day, Same Day) secara instan di WhatsApp.
3. **Penerbitan Resi Otomatis (AWB)**:
   * Begitu disetujui $\rightarrow$ nomor resi terbit $\rightarrow$ label pengiriman PDF tercetak $\rightarrow$ kurir otomatis dipanggil (*Request Pickup*).
   * Nomor resi dan live tracking link dikirim otomatis ke WhatsApp pembeli.

---

## 8. Fitur Pembeda #6: Meta Ads (CTWA) Attribution & Offline CAPI Tracker

### 8.1 Deskripsi Fitur
Menghubungkan data iklan berbayar Meta (Facebook & Instagram Click-to-WhatsApp Ads) dengan data transaksi riil di dalam CRM, serta mengirimkan event konversi *Purchase* balik ke Meta Ads Manager secara otomatis.

### 8.2 Spesifikasi Fungsional
1. **Ad Referral Payload Capture**:
   * Saat user mengklik iklan WhatsApp Meta $\rightarrow$ webhook menerima metadata payload: `ad_id`, `campaign_id`, `adset_id`, `source_url`, `headline`.
   * Metadata diikatkan permanen ke profil lead di database CRM.
2. **Offline Conversions API (CAPI) Dispatcher**:
   * Saat CS / AI menandai order sebagai `LUNAS / COMPLETED`:
   * Sistem otomatis memanggil endpoint `POST https://graph.facebook.com/v20.0/{pixel_id}/events` dengan data:
     * `event_name: "Purchase"`
     * `value: <amount_in_idr>`
     * `currency: "IDR"`
     * `custom_data: { order_id, campaign_id, ad_id }`
     * `user_data: { ph: sha256(phone), em: sha256(email) }`
3. **Analytics Dashboard ROAS Riil**:
   * Menampilkan tabel performa: Nama Campaign, Biaya Iklan Meta, Jumlah Chat Masuk, Total Transaksi Lunas, Omzet Riil, dan Real ROAS (*Return on Ad Spend*).

---

## 10. Modul Master Data Management

Modul Master Data adalah fondasi data terpusat yang mengatur seluruh entitas bisnis dan diakses secara terpadu oleh CS, Tim Finance, AI Agent (RAG), dan sistem pembukuan.

```
                         ┌─────────────────────────────────────────────────────────┐
                         │              PUSAT MASTER DATA PER USAHA                │
                         └────────────────────────────┬────────────────────────────┘
                                                      │
         ┌───────────────────┬────────────────────────┼────────────────────────┬───────────────────┐
         ▼                   ▼                        ▼                        ▼                   ▼
  [ Master Produk ]  [ Master Rekening ]      [ Master CRM/Label ]     [ Master Kurir ]    [ Master Promo ]
   • SKU & Varian     • Akun Bank & VA         • Label Segmen           • Asal Gudang       • Diskon & Kuota
   • HPP & Harga      • Kredensial Gateway     • Kategori Lead          • Kurir Aktif       • Voucher Kode
   • Stok Real-time   • QRIS Dinamis           • Auto-Tag Criteria      • Opsi Layanan COD  • Min. Pembelian
```

### 10.1 Master Produk & Varian (Mode Bisnis)
* **Atribut Produk**: `ID`, `Nama Produk`, `Kategori`, `Deskripsi Singkat`, `Foto Produk (URL/File)`, `Status (Aktif/Arsip)`.
* **Varian Produk**: Mendukung multi-varian bertingkat (misal: *Warna, Ukuran, Kemasan*).
* **Harga & Margin**:
  * `Harga Jual (Selling Price)`
  * `Harga Modal / HPP (Cost of Goods Sold)`: Digunakan untuk laporan laba/rugi otomatis.
* **Manajemen Stok**:
  * `Stok Saat Ini`, `Batas Minimum Stok (Low Stock Alert)`
  * Pengurangan stok otomatis saat pesanan dibuat / lunas, dan pengembalian stok jika pesanan dibatalkan.
* **Dimensi & Berat Pengiriman**: `Berat (gram)`, `Panjang x Lebar x Tinggi (cm)` — diakses oleh kalkulator ongkir kurir.

### 10.2 Master Program Kebaikan & Doa (Mode NGO / Lembaga Sosial)
* **Atribut Program**: `Nama Program`, `Kategori (Zakat/Infak/Wakaf/Kemanusiaan)`, `Deskripsi & Landasan Dalil`, `Target Nominal Donasi`, `Batas Waktu Periode`, `Status Publikasi`.
* **Master Doa & Ucapan**: Doa spesifik per jenis donasi yang otomatis dibacakan oleh AI saat donatur mentransfer.

### 10.3 Master Rekening Bank & Payment Gateway
* **Rekening Bank Manual**: `Nama Bank`, `Nomor Rekening`, `Atas Nama (Pemilik)`, `Cabang`, `Instruksi Transfer`.
* **Konfigurasi Payment Gateway**: `Provider (Xendit/Midtrans/OY/DOKU)`, `API Key`, `Webhook Secret`, `Status Integrasi`.
* **Pengaturan Biaya Admin**: Opsi apakah biaya admin VA/QRIS dibebankan ke pembeli atau ditanggung oleh penjual.

### 10.4 Master Segmentasi, Label, & Tag CRM
* **Label Dasar**: `Lead Baru`, `Konsultasi`, `Follow-up`, `Closing`, `Repeat Order`, `Pelanggan Prioritas / VIP`, `Jenuh / Cold Lead`.
* **Kriteria AI Auto-Label**: Aturan teks bebas agar AI mengelompokkan pelanggan secara otomatis berdasarkan isi percakapan dan nilai transaksi.

### 10.5 Master Ekspedisi, Gudang, & Lokasi Pengiriman
* **Alamat Gudang Asal (Origin)**: `Nama Gudang`, `Alamat Lengkap`, `Kecamatan/Kota`, `Kode Pos`, `No. Telepon Kontak Gudang`.
* **Ekspedisi Aktif**: Toggle kurir aktif (J&T, SiCepat, JNE, Ninja, SAP, Anteraja, Lion Parcel).
* **Konfigurasi COD**: Toggle aktivasi pembayaran COD, batas maksimal nominal COD, dan persentase fee penanganan COD.

### 10.6 Master Promo, Diskon, & Voucher
* **Tipe Promo**: Potongan Nominal (*e.g., Rp 20.000*), Persentase (*e.g., 10%*), atau Gratis Ongkir.
* **Aturan Kuota**: `Batas Maksimal Penggunaan`, `Min. Belanja`, `Masa Berlaku (Start Date - End Date)`, `Kode Voucher Unik`.

---

## 11. Modul Laporan & Business Intelligence (Reporting Engine)

Modul Laporan menyediakan analitik mendalam untuk memantau kesehatan bisnis, efektivitas tim penjualan, perputaran stok, dan rekonsiliasi keuangan tanpa perlu kalkulasi spreadsheet manual.

```
                          ┌────────────────────────────────────────────────────────┐
                          │               DASHBOARD LAPORAN BISNIS                 │
                          └───────────────────────────┬────────────────────────────┘
                                                      │
         ┌───────────────────┬────────────────────────┼────────────────────────┬───────────────────┐
         ▼                   ▼                        ▼                        ▼                   ▼
  [ Laporan Omzet ]   [ Performa CS ]          [ Logistik & COD ]       [ Rekonsiliasi ]    [ ROAS Iklan ]
   • Pendapatan        • Closing Rate %         • Tingkat Retur (RTS)    • Uang Masuk Bank   • Ad Spend vs Sales
   • Laba Kotor (HPP)  • Response Time          • Total Ongkir & Resi    • Fee MDR Gateway   • Real CAPI ROAS
   • Rata-rata Order   • Komisi Sales           • Cashback Ekspedisi     • Status Piutang    • Cost Per Closing
```

### 11.1 Laporan Penjualan & Pendapatan Riil
* **Metrik Kunci**: Total Omzet Kotor, Total HPP, Laba Kotor (*Gross Profit*), Total Transaksi Sukses, Rata-rata Nilai Transaksi (*Average Order Value / AOV*).
* **Filter Interaktif**: Berdasarkan rentang tanggal, metode pembayaran (QRIS/VA/Transfer/COD), kategori produk, atau kanal penjualan.
* **Grafik Tren**: Visualisasi omzet harian, mingguan, dan perbandingan bulan ke bulan (*MoM Growth*).

### 11.2 Laporan Performa CS & Komisi Penjualan
* **Metrik Efisiensi CS**:
  * *First Response Time (FRT)*: Kecepatan rata-rata CS membalas chat pertama.
  * *Average Handling Time (AHT)*: Durasi penyelesaian percakapan hingga closing.
  * *Total Chat Handled*: Jumlah obrolan yang dilayani per staf CS.
* **Metrik Penjualan CS**:
  * *Total Closing*: Jumlah transaksi lunas per CS.
  * *Closing Rate %*: Persentase chat baru yang berhasil dikonversi menjadi penjualan.
  * *Total Omzet CS*: Nominal penjualan yang dihasilkan masing-masing CS.
  * *Kalkulasi Komisi CS*: Rekapitulasi hak komisi berdasarkan aturan komisi master per produk/omzet.

### 11.3 Laporan Logistik, Ekspedisi, & Retur COD
* **Volume Pengiriman**: Total paket dikirim per kurir (J&T, SiCepat, dll).
* **Metrik Monitoring COD**:
  * *Tingkat Keberhasilan COD*: Persentase paket COD yang sukses dibayar pembeli saat sampai.
  * *Tingkat Retur / RTS %*: Persentase paket COD yang ditolak pembeli dan kembali ke gudang.
  * *Nilai Kerugian RTS*: Estimasi kerugian ongkir hangus dari paket retur.
* **Laporan Cashback Ongkir**: Total akumulasi pendapatan komisi/cashback ongkir dari ekspedisi partner yang menjadi revenue tambahan pemilik platform/toko.

### 11.4 Laporan Rekonsiliasi Keuangan & Settlement Payment Gateway
* **Pencocokan Mutasi Bank**: Rekapitulasi transaksi sistem vs mutasi bank riil (terverifikasi otomatis vs pending manual).
* **Laporan Pemotongan Fee**: Rincian biaya MDR payment gateway (QRIS 0.7%, VA flat fee) vs nominal bersih (*Net Settlement*) yang masuk ke rekening utama.
* **Laporan Piutang & Invoice**: Daftar tagihan yang belum dibayar (*unpaid/overdue*).

### 11.5 Laporan Efektivitas Iklan Meta (Click-to-WhatsApp Attribution)
* **Attribution Dashboard**:
  * Menghubungkan ID Iklan Facebook/Instagram dengan nomor invoice WhatsApp.
  * Menampilkan: *Biaya Iklan (Ad Spend)*, *Chat Masuk (Inbound Leads)*, *Cost Per Lead (CPL)*, *Closing Deals*, *Real Revenue*, dan *Real ROAS*.
* **Status Pengiriman CAPI**: Log riwayat pengiriman event offline conversion ke Meta Pixel (Status: *Delivered / Failed / Retried*).

### 11.6 Laporan Utilisasi AI vs Human Agent
* **Tingkat Otomasi AI**: Persentase percakapan yang selesai dilayani 100% oleh AI tanpa eskalasi ke manusia.
* **Konsumsi Token & Biaya AI**: Jumlah token LLM yang terpakai dan biaya operasional AI per institusi.
* **Top Pertanyaan Pelanggan (FAQ Analytics)**: Analisis topik/produk yang paling sering ditanyakan namun belum terdaftar di basis pengetahuan RAG.

### 11.7 Export Data & Penjadwalan Laporan
* Dukungan ekspor data ke format **Excel (.xlsx)**, **CSV**, dan cetak dokumen **PDF**.
* Fitur *Scheduled Report*: Pengiriman ringkasan laporan harian/mingguan otomatis ke WhatsApp / Email Owner setiap pukul 21.00 WIB.

---

## 12. Role-Based Access Control (RBAC) & Security Matrix

Sistem menerapkan arsitektur *Multi-Tenant Role-Based Access Control* ketat untuk memastikan integritas data, keamanan saldo/rekening, dan kerahasiaan kontak pelanggan.

```
                           ┌────────────────────────────────────────────────────────┐
                           │               STRUKTUR HIERARKI ROLE                   │
                           └───────────────────────────┬────────────────────────────┘
                                                       │
         ┌───────────────────┬─────────────────────────┼────────────────────────┬───────────────────┐
         ▼                   ▼                         ▼                        ▼                   ▼
  [ Superadmin ]     [ Supervisor / Owner ]       [ Finance ]                 [ CS / Sales ]      [ PIC Gudang ]
   • Master Platform  • Pemilik Toko / Direktur    • Verifikasi Mutasi         • Chat & Melayani   • Packing Paket
   • Manajemen Tenant • Akses Laporan Penuh        • Approval Transaksi        • Buat Pesanan      • Request Pickup
   • Setting Kuota    • Kelola Tim & Persona AI    • Terbitkan Invoice         • Follow-up Lead    • Update No Resi
```

### 12.1 Deskripsi Peran (Role Definitions)

1. **Superadmin (Platform Provider / System Administrator)**:
   * Mengelola multi-tenant (institusi/klien), master lisensi langganan, master payment gateway pusat, WhatsApp Cloud API gateway, dan monitoring server.
2. **Supervisor / Owner (Pemilik Bisnis / Direktur Lembaga)**:
   * Memiliki kendali penuh di tingkat tenant: melihat seluruh laporan keuangan & performa CS, konfigurasi AI persona, blast campaign, master produk, dan pengaturan komisi.
3. **Finance & Accounting**:
   * Bertanggung jawab atas aliran kas masuk: memverifikasi bukti transfer, mencocokkan mutasi bank, menyetujui transaksi (*maker-checker*), menerbitkan faktur/invoice resmi, dan ekspor data pembukuan.
4. **Customer Service (CS / Sales Agent)**:
   * Frontliner yang hanya dapat melihat kontak & chat yang ditugaskan kepadanya (*kecuali diizinkan global*), membuat pesanan/draft transaksi, memicu invoice, dan memproses follow-up lead.
5. **PIC / Warehouse Staff (Petugas Gudang & Pengiriman)**:
   * Khusus menangani pemenuhan barang fisik: mencetak label alamat/resi, mengubah status pesanan ke *Packing/Ready to Pickup*, dan menyerahkan paket ke kurir ekspedisi.

---

### 12.2 Matriks Izin Akses (Permission Matrix Table)

| Modul / Fitur | Superadmin | Supervisor / Owner | Finance | CS / Sales | PIC Gudang |
|---|:---:|:---:|:---:|:---:|:---:|
| **Dashboard & Laporan Omzet** | Full Global | Full Tenant | View Financial | View Own Sales | No Access |
| **Laporan Komisi Tim CS** | Full Global | Full Access | Full Access | View Own Only | No Access |
| **Chat WhatsApp & Inbox** | No Access (Privasi) | Full (All CS) | View Only | Own Leads Only | No Access |
| **Takeover Chat dari AI** | No Access | Yes | No | Yes | No |
| **Master Produk & Stok (Edit/Hapus)** | Full Global | Full Tenant | View Only | View Only | Update Stok Only |
| **Pencatatan Pesanan / Transaksi** | Full Global | Create/Edit/Delete | Create/Edit | Create/Draft | View Only |
| **Approval Keuangan (Maker-Checker)** | Full Access | Yes | Yes (Utama) | No Access | No Access |
| **Cetak Nota & Label Resi Kurir** | Full Access | Yes | Yes | Yes | Yes (Utama) |
| **Kirim Broadcast / WA Blasting** | Full Global | Yes | No Access | Request Only | No Access |
| **Pengaturan AI & Basis Data (RAG)** | Full Global | Full Tenant | No Access | No Access | No Access |
| **Export Data ke Excel/CSV** | Full Global | Yes | Yes | No Access | No Access |
| **Manajemen User & Role Staff** | Full Global | Full Tenant | No Access | No Access | No Access |

---

## 13. Non-Functional Requirements (NFR)

1. **Kecepatan & Latensi (Performance)**:
   * Waktu respons AI pesan teks: $\le 1.8$ detik.
   * Waktu respons Voice Note: $\le 4.0$ detik.
   * Waktu generate QRIS & Invoice: $\le 2.0$ detik.
2. **Ketersediaan & Reliabilitas (Reliability)**:
   * Target SLA Uptime: 99.9%.
   * Retry mechanism dengan *exponential backoff* untuk webhook WhatsApp dan Payment Gateway.
3. **Keamanan & Privasi Data (Security)**:
   * Seluruh API dilindungi JWT Authentication & Role-Based Access Control (RBAC).
   * Enkripsi data sensitif (API keys, webhook tokens, data kontak pelanggan) menggunakan AES-256 di database.
   * Verifikasi HMAC-SHA256 signature pada seluruh incoming webhook.

---

## 14. Monetization Strategy & Pricing Model

```
                               ┌──────────────────────────────────────────────┐
                               │             STRUKTUR MONETISASI              │
                               └──────────────────────┬───────────────────────┘
                                                      │
              ┌────────────────────────┬──────────────┴──────────────┬────────────────────────┐
              ▼                        ▼                             ▼                        ▼
     [ 1. SaaS Langganan ]    [ 2. Biaya Transaksi ]        [ 3. Komisi Ongkir ]     [ 4. Pay-As-You-Go ]
       • Starter: 199k/bln      • QRIS: Rp 750/trx            • Cashback 15-25%        • Kuota WA Broadcast
       • Pro: 499k/bln          • VA: Rp 2.500/trx            dari total ongkir        • Kuota Token AI
       • Extra CS: 75k/seat     • CC: 2.9% + Rp 2.000         ekspedisi partner        • Add-on Meta CAPI
```

---

## 15. Roadmap & Urutan Rilis Produk (Phase Milestone)

* **Fase 1 (Core Foundation & Quick Cashflow)**:
  * In-Chat Dynamic QRIS Engine
  * Lead CRM & CS Multi-Seat Management (RBAC)
  * Master Data (Produk, Rekening, Label)
  * RAG AI CS Text Agent
* **Fase 2 (Differentiator Killer & High Retention)**:
  * Deep Fraud Detection (OCR & Bank Mutation Verification)
  * Shipping Aggregator & COD Anti-RTS Protection
  * Proactive AI Sales Follow-Up
  * Laporan Komprehensif (Sales, CS Performance, Finance Reconciliation)
* **Fase 3 (Advanced Scale & Enterprise Moat)**:
  * AI Voice Note (Speech-to-Text & Text-to-Speech)
  * Meta Ads CAPI Attribution Dashboard
  * Visual Workflow Canvas Automation

