# 🗺️ APP FLOW & SYSTEM SEQUENCE DIAGRAMS
# Platform: Conversational AI Commerce & Smart CRM (Next-Gen)
**Versi:** 1.0.0  
**Status:** Visual Blueprint / Ready for Implementation  
**Dokumen Pendukung:** `docs/prd/PRD-AI-CONVERSATIONAL-COMMERCE-CRM.md`, `docs/prd/TRD-AI-CONVERSATIONAL-COMMERCE-CRM.md`, & `docs/prd/SCHEMA-AI-CONVERSATIONAL-COMMERCE-CRM.md`  
**Lokasi File:** `docs/prd/APPFLOW-AI-CONVERSATIONAL-COMMERCE-CRM.md`

---

## 1. Master End-to-End User Journey

Diagram alur menyeluruh mulai dari lead pertama kali masuk (via Iklan Meta atau WhatsApp organik) hingga barang terkirim dan komisi CS tercatat otomatis.

```mermaid
flowchart TD
    Start([Lead Masuk via WhatsApp / Iklan Meta]) --> AdAttr{Ada Parameter Iklan Meta?}
    AdAttr -- Ya --> SaveAd[Simpan ID Iklan & Campaign ke Profil Lead]
    AdAttr -- Tidak --> SaveLead[Simpan / Ambil Profil Lead dari CRM]
    SaveAd --> RouteCS[Algoritma Pembagian Lead: Sticky CS / Round-Robin]
    SaveLead --> RouteCS
    
    RouteCS --> MsgType{Tipe Pesan Masuk?}
    MsgType -- Voice Note --> STT[Whisper AI Transkripsi Suara ke Teks]
    MsgType -- Teks Biasa --> AIIntent[AI RAG Parser & Knowledge Base]
    STT --> AIIntent
    
    AIIntent --> AskHuman{Perlu Eskalasi ke CS Manusia?}
    AskHuman -- Ya --> Escalation[CS Manusia Ambil Alih Obrolan]
    AskHuman -- Tidak --> AIChat[AI Menjawab Produk / Program / Rekening]
    
    AIChat --> Deal{Pelanggan Setuju Beli / Donasi?}
    Escalation --> Deal
    
    Deal -- Tidak / Berhenti Chat --> ProactiveQueue[Masuk Antrean Proactive AI Follow-Up 2 Jam]
    Deal -- Ya (Pilih Metode Bayar) --> PayMethod{Metode Pembayaran?}
    
    PayMethod -- Dynamic QRIS --> GenQRIS[Generate Dynamic QRIS EMVCo Instan]
    PayMethod -- Transfer Manual Bank --> SendBank[Kirim Rekening Bank Resmi + Instruksi]
    PayMethod -- COD (Bayar di Tempat) --> CODRisk[Kalkulasi Skor Risiko Anti-RTS AI]
    
    GenQRIS --> ScanPay[Pelanggan Scan via BCA Mobile / GoPay / ShopeePay]
    ScanPay --> PGWebhook[Webhook Payment Gateway Lunas]
    
    SendBank --> UploadProof[Pelanggan Kirim Bukti Transfer]
    UploadProof --> FraudCheck[Analisis Forensik Gambar ELA + Auto Match Mutasi Bank]
    FraudCheck -- Cocok --> AutoApprove[Status: LUNAS / Auto-Approved]
    FraudCheck -- Tidak Cocok / Mencurigakan --> FinanceQueue[Eskalasi ke Antrean Review Finance]
    FinanceQueue --> FinApproval{Finance Setujui?}
    FinApproval -- Ya --> AutoApprove
    FinApproval -- Ditolak --> RejectNotice[Kirim Notifikasi Penolakan ke Pelanggan]
    
    CODRisk -- Skor Aman (>=60) --> BookCourier[1-Click Booking Ekspedisi & Terbitkan Resi AWB]
    CODRisk -- Berisiko (<60) --> AskDP[Minta Uang Muka Ongkir / Ubah ke Transfer]
    
    PGWebhook --> AutoApprove
    AutoApprove --> GenInvoice[Generate Invoice PDF & Kurangi Stok Produk]
    AutoApprove --> SyncCAPI[Kirim Event Offline Purchase ke Meta CAPI]
    AutoApprove --> AddCommission[Catat Buku Besar Komisi CS]
    AutoApprove --> BookCourier
    
    BookCourier --> TrackCourier[Tracking Live Resi Kurir ke WhatsApp Pembeli]
    TrackCourier --> SuccessEnd([Transaksi Selesai & Laporan Terupdate])
```

---

## 2. Alur Fitur 1: In-Chat Dynamic QRIS & Instant Checkout Flow

Menjelaskan interaksi checkout otomatis di WhatsApp tanpa transfer manual dan tanpa unggah struk.

```mermaid
sequenceDiagram
    autonumber
    actor Pelanggan as 👤 Pelanggan (WhatsApp)
    participant WA as 💬 WhatsApp Cloud API
    participant BE as ⚙️ Backend Core
    participant PG as 💳 Payment Gateway (Xendit/Midtrans)
    participant DB as 🗄️ MySQL Database

    Pelanggan->>WA: "Saya mau pesan 2 pcs Kaos Hitam XL"
    WA->>BE: Webhook Inbound Message
    BE->>BE: AI Parse Intent (Deal & Checkout)
    BE->>DB: INSERT INTO orders (status='waiting_payment', amount=150000)
    BE->>PG: POST /qr_codes (amount: 150000, expires_in: 15 min)
    PG-->>BE: Return { qr_string, qr_image_url, expires_at }
    BE->>DB: INSERT INTO payments (status='pending', qr_string)
    BE->>WA: Send Image (Gambar QRIS) + Caption (Rincian & Countdown 15 Menit)
    WA->>Pelanggan: Tampilkan Gambar QRIS di WhatsApp
    
    Pelanggan->>PG: Scan QRIS via BCA Mobile / GoPay / OVO
    PG->>BE: Webhook POST /payments/webhook (payment.success)
    BE->>BE: Validasi Signature HMAC-SHA256
    BE->>DB: UPDATE payments SET status='paid', UPDATE orders SET status='paid'
    BE->>WA: Send Message: "✅ Pembayaran Rp 150.000 Lunas! Ini Nota Anda: https://inv.id/123"
    WA->>Pelanggan: Terima Konfirmasi Lunas & Invoice PDF (Detik itu juga)
```

---

## 3. Alur Fitur 2: AI Voice Note Inbound & Natural Voice Reply Flow

Menjelaskan pemrosesan pesan suara pembeli menjadi teks, konsultasi AI, hingga pembentukan suara balasan natural.

```mermaid
sequenceDiagram
    autonumber
    actor Pelanggan as 👤 Pelanggan
    participant WA as 💬 WhatsApp API
    participant Buffer as 📥 Media Buffer
    participant STT as 🎙️ Whisper STT (Speech-to-Text)
    participant Brain as 🧠 AI RAG Engine
    participant TTS as 🗣️ Neural TTS Synthesizer
    participant Encoder as 🎛️ Ffmpeg Opus Encoder

    Pelanggan->>WA: Kirim Voice Note (.ogg audio)
    WA->>Buffer: Download Audio Stream
    Buffer->>STT: POST /audio/transcriptions (Language: 'id')
    STT-->>Brain: Hasil Teks: "Kak paket laundry kiloan bedcover berapa harganya ya"
    
    Brain->>Brain: Cari di Basis Pengetahuan (Produk, Harga, SOP Toko)
    Brain-->>TTS: Jawaban Teks: "Halo kak! Cuci bedcover Rp 35.000 per pcs, selesai 2 hari ya."
    
    TTS->>Encoder: Generate Raw PCM / WAV Audio
    Encoder->>Encoder: Encode ke WhatsApp Voice Note Standard (OGG Opus 16kHz)
    Encoder->>WA: Kirim Outbound Audio Media (is_voice_note=true)
    WA->>Pelanggan: Muncul Bubble Voice Note Audio Ramah di Layar Pelanggan (< 4 detik)
```

---

## 4. Alur Fitur 3: Deep Fraud Detection & Auto Bank Mutation Flow

Menjelaskan verifikasi keamanan struk transfer manual untuk mencegah penipuan struk palsu.

```mermaid
flowchart TD
    A[Pelanggan Kirim Gambar Struk Transfer] --> B[OCR Scanner & Image Forensics ELA]
    B --> C[Ekstrak Nominal, Tanggal, & Bank Pengirim]
    B --> D[Analisis Pixel Gradient & Font Mismatch]
    
    D -- Terdeteksi Editan / Pixel Rusak --> E[Beri Label: ⚠️ Struk Terindikasi Editan]
    D -- Normal --> F[Lanjut Cek Mutasi]
    
    C --> F
    E --> G[Masuk Antrean Review Finance]
    
    F --> H{Query Mutasi Rekening Bank Real-time}
    H -- Uang Masuk Ditemukan (Nominal & Waktu Match) --> I[Status: Auto-Approved / LUNAS]
    H -- Uang Masuk Belum Ada dalam 15 Menit --> G
    
    G --> J[Staf Finance Buka Dashboard Approval]
    J --> K{Keputusan Finance}
    K -- Setujui --> I
    K -- Tolak (Bukti Palsu) --> L[Status: DITOLAK & Notifikasi ke Pelanggan]
    
    I --> M[Update Order PAID & Terbitkan Invoice]
```

---

## 5. Alur Fitur 4: Proactive AI Sales & Abandonment Follow-Up Flow

Menjelaskan alur follow-up cerdas agar lead yang *ghosting* kembali merespons tanpa merasa di-spam.

```mermaid
sequenceDiagram
    autonumber
    actor Pelanggan as 👤 Pelanggan
    participant WA as 💬 WhatsApp
    participant AI as 🧠 AI Engine
    participant Queue as ⏱️ BullMQ Delay Queue
    participant DB as 🗄️ Database

    Pelanggan->>WA: "Tanya harga produk A dong kak"
    AI->>Pelanggan: "Harga Rp 120.000 kak, mau kami bantu pesankan?"
    Note over Pelanggan, AI: Pelanggan tidak membalas lagi (Ghosting)
    
    AI->>Queue: Jadwalkan Job Follow-Up (Delay 2 Jam)
    
    Note over Queue: 2 Jam Berlalu...
    Queue->>DB: Cek Status Terkini: Apakah sudah bayar? Apakah ada chat baru?
    
    alt Pelanggan Sudah Bayar atau Sudah Chat Lagi
        DB-->>Queue: Status: CANCELLED (Batalkan Follow-Up)
    else Pelanggan Masih Belum Balas & Jam Kerja (08.30-20.30 WIB)
        DB-->>Queue: Status: OK to Send
        Queue->>WA: Kirim Pesan Ramah: "Halo Kak Budi, produknya masih kami simpan ya, ada yang bisa dibantu?"
        WA->>Pelanggan: Muncul Notifikasi Follow-up Personal di WhatsApp
    end
```

---

## 6. Alur Fitur 5: COD Anti-RTS Risk Scoring & Shipping Booking Flow

Menjelaskan alur pesanan COD (Cash on Delivery) dengan validasi risiko retur dan booking kurir 1-klik.

```mermaid
flowchart TD
    A[Pelanggan Memilih Metode COD] --> B[AI Validasi Kelengkapan Alamat RT/RW/No Rumah]
    B --> C[Hitung Skor Risiko Anti-RTS AI 0-100]
    
    C --> D{Apakah Skor >= 60 & Alamat Lengkap?}
    D -- Tidak (Risiko Tinggi RTS) --> E[AI Tawarkan Opsi DP Ongkir / Alihkan ke QRIS]
    D -- Ya (Aman) --> F[Kirim Permintaan Konfirmasi Komitmen Bayar ke Pembeli]
    
    F --> G[Pembeli Ketuk Tombol 'Setuju Bayar COD']
    G --> H[Panggil API Multi-Ekspedisi: Cek Tarif J&T / SiCepat / SAP]
    H --> I[CS / Sistem Klik '1-Click Request Pickup']
    I --> J[Nomor Resi AWB Terbit Otomatis]
    J --> K[Cetak Label PDF Pengiriman dengan Barcode AWB]
    J --> L[Kirim Nomor Resi & Link Live Tracking ke WhatsApp Pembeli]
    L --> M[Kurir Jemput Paket ke Gudang]
```

---

## 7. Alur Fitur 6: Meta Ads (CTWA) Attribution & CAPI Event Sync Flow

Menjelaskan pelacakan omzet riil dari iklan Facebook/Instagram Ads (*Click to WhatsApp*) hingga sinkronisasi konversi balik ke Meta Ads Manager.

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Pengguna Facebook / Instagram
    participant Meta as 📱 Meta Ads Platform
    participant WA as 💬 WhatsApp API
    participant BE as ⚙️ Backend Core
    participant CAPI as 📊 Meta Conversions API (CAPI)
    participant Dash as 📈 Owner Dashboard

    User->>Meta: Klik Iklan "Beli Sekarang (Click to WhatsApp)"
    Meta->>WA: Buka Chat WA dengan Referral Payload (ad_id: 120208, campaign_id: 7788)
    WA->>BE: Webhook Inbound Message (Tangkapsemua Parameter Iklan)
    BE->>BE: Ikat Ad ID & Campaign ID ke Profil Lead CRM
    
    Note over User, BE: Terjadi Konsultasi & Pembayaran Lunas
    
    BE->>BE: Order Status Berubah menjadi 'PAID' (Nilai: Rp 250.000)
    BE->>CAPI: POST /v20.0/{pixel_id}/events (Event: 'Purchase', Value: 250000, Ad_ID: 120208)
    CAPI-->>BE: 200 OK (Event Berhasil Diterima Meta)
    
    BE->>Dash: Update Laporan ROAS Riil (Ad Spend Rp 50.000 -> Closing Rp 250.000 -> ROAS 5x)
    Dash-->>Dash: Pemilik Usaha Melihat Iklan Mana yang Benar-Benar Untung
```

---

## 8. Alur Fitur 7: Multi-CS Lead Distribution & Commission Flow

Menjelaskan alur pembagian antrean kontak ke staf CS secara adil dan perhitungan komisi otomatis di akhir bulan.

```mermaid
flowchart TD
    A[Lead Baru Masuk ke WhatsApp] --> B{Apakah Lead Pernah Ditangani CS Tertentu? (Sticky Routing)}
    B -- Ya & CS Sedang Online --> C[Alokasikan Langsung ke CS Lama Tersebut]
    B -- Tidak / CS Lama Offline --> D[Cek Daftar CS yang Sedang Aktif / Shift Online]
    
    D --> E[Hitung Beban Chat Aktif & Closing Rate Tiap CS]
    E --> F[Pilih CS dengan Antrean Paling Sedikit & Performa Terbaik]
    F --> G[Tugaskan Lead ke CS Terpilih]
    G --> H[Kirim Notifikasi Push ke HP / Web Dashboard CS]
    
    H --> I[CS Melayani dan Melakukan Closing Penjualan]
    I --> J[Transaksi Ditandai LUNAS]
    J --> K[Sistem Otomatis Hitung Komisi CS Sesuai Aturan Master]
    K --> L[Catat ke Tabel cs_commission_ledgers]
    L --> M[Rekapitulasi Komisi Siap Dicairkan di Akhir Bulan]
```

---

## 9. Alur Maker-Checker Financial Approval & Invoice Dispatch

Menjelaskan alur pencatatan transaksi manual oleh CS, persetujuan oleh tim Finance, hingga pengiriman nota otomatis ke pembeli.

```mermaid
sequenceDiagram
    autonumber
    actor CS as 👨‍💼 Customer Service (CS)
    participant System as ⚙️ Sistem CRM
    actor Fin as 👩‍💼 Tim Finance / Supervisor
    actor Buyer as 👤 Pembeli (WhatsApp)

    CS->>System: Input Draft Transaksi Manual (Custom Produk, Ongkir, Diskon)
    System->>System: Set Status: review_status='pending' (Belum Masuk Laporan Omzet)
    System->>Fin: Kirim Notifikasi: "Ada 1 Transaksi Perlu Review"
    
    Fin->>System: Buka Halaman Approval Finance & Cek Bukti Pembayaran
    
    alt Finance Menolak Transaksi
        Fin->>System: Klik 'Tolak' (Masukkan Alasan: "Bukti transfer tidak masuk rekening")
        System->>CS: Notifikasi Transaksi Ditolak ke CS Pembuat
    else Finance Menyetujui Transaksi
        Fin->>System: Klik 'Setujui Transaksi'
        System->>System: Set review_status='approved', Masuk ke Laporan Omzet Resmi
        System->>System: Generate File Nota / Invoice Resmi PDF
        System->>Buyer: Kirim Pesan WhatsApp: "Halo! Transaksi Anda Telah Dikonfirmasi. Nota: [Download PDF]"
        Buyer-->>Buyer: Pembeli Menerima Nota Resmi Terverifikasi
    end
```
