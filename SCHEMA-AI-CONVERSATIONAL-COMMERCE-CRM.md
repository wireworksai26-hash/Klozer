# 🗄️ DATABASE SCHEMA & ERD SPECIFICATION
# Platform: Conversational AI Commerce & Smart CRM (Next-Gen)
**Versi:** 1.0.0  
**RDBMS:** MySQL 8.0+ (InnoDB Engine, `utf8mb4_unicode_ci`)  
**Dokumen Pendukung:** `docs/prd/PRD-AI-CONVERSATIONAL-COMMERCE-CRM.md` & `docs/prd/TRD-AI-CONVERSATIONAL-COMMERCE-CRM.md`  
**Lokasi File:** `docs/prd/SCHEMA-AI-CONVERSATIONAL-COMMERCE-CRM.md`

---

## 1. Entity Relationship Diagram (ERD Overview)

```
 [ institutions ] (Tenants)
   ├──< [ users ] (Staff & RBAC) ───< [ cs_commission_ledgers ]
   ├──< [ products ] ───< [ product_variants ]
   ├──< [ programs ] (NGO ZISWAF)
   ├──< [ bank_accounts ] ───< [ bank_mutations ]
   ├──< [ payment_gateway_configs ]
   ├──< [ shipping_warehouses ]
   ├──< [ promos_vouchers ]
   └──< [ leads ] (CRM)
          ├──< [ leads_labels_map ] >─── [ lead_labels ]
          ├──< [ chat_messages ]
          ├──< [ proactive_followup_jobs ]
          ├──< [ meta_ad_referrals ]
          └──< [ orders ]
                 ├──< [ order_items ]
                 ├──< [ payments ] (QRIS / VA)
                 ├──< [ payment_proofs ] (Fraud OCR)
                 ├──< [ shipping_shipments ] ───< [ shipping_tracking_logs ]
                 └──< [ meta_capi_event_logs ]
```

---

## 2. Core Multi-Tenant & RBAC Tables

```sql
-- ============================================================================
-- 1. INSTITUTIONS (Tenants)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `institutions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `mode` ENUM('business', 'ngo') NOT NULL DEFAULT 'business',
  `phone_number` VARCHAR(30) NULL,
  `email` VARCHAR(120) NULL,
  `address` TEXT NULL,
  `subscription_tier` ENUM('starter', 'pro', 'enterprise') NOT NULL DEFAULT 'starter',
  `subscription_expires_at` DATETIME NULL,
  `blast_credit_quota` INT UNSIGNED NOT NULL DEFAULT 100,
  `ai_token_quota` BIGINT UNSIGNED NOT NULL DEFAULT 500000,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_institutions_mode` (`mode`),
  INDEX `idx_institutions_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. USERS (Staff & Role-Based Access Control)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('superadmin', 'supervisor', 'finance', 'cs', 'pic_warehouse') NOT NULL DEFAULT 'cs',
  `phone_number` VARCHAR(30) NULL,
  `commission_rate_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `commission_flat_idr` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `is_online` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_users_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  INDEX `idx_users_inst_role` (`institution_id`, `role`, `is_active`),
  INDEX `idx_users_online` (`institution_id`, `is_online`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Master Data Tables

```sql
-- ============================================================================
-- 3. PRODUCTS & VARIANTS (Mode Bisnis: SKU, HPP, Harga Jual, Dimensi)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `sku` VARCHAR(60) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `image_url` VARCHAR(500) NULL,
  `selling_price` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `cost_price_hpp` DECIMAL(14, 2) NOT NULL DEFAULT 0.00, -- Modal HPP untuk Laba Kotor
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `low_stock_threshold` INT NOT NULL DEFAULT 5,
  `weight_in_grams` INT UNSIGNED NOT NULL DEFAULT 200,
  `dimension_length_cm` INT UNSIGNED NOT NULL DEFAULT 10,
  `dimension_width_cm` INT UNSIGNED NOT NULL DEFAULT 10,
  `dimension_height_cm` INT UNSIGNED NOT NULL DEFAULT 5,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_products_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_inst_sku` (`institution_id`, `sku`),
  INDEX `idx_products_inst_active` (`institution_id`, `is_active`),
  INDEX `idx_products_category` (`institution_id`, `category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT UNSIGNED NOT NULL,
  `variant_sku` VARCHAR(80) NOT NULL,
  `variant_name` VARCHAR(120) NOT NULL, -- e.g. "Hitam - XL", "500 Gram"
  `price_override` DECIMAL(14, 2) NULL,
  `cost_price_override` DECIMAL(14, 2) NULL,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT `fk_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  INDEX `idx_variants_sku` (`variant_sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. PROGRAMS & DOA (Mode NGO: ZISWAF, Target Donasi, Doa Harian)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `programs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `category` ENUM('zakat', 'infak', 'wakaf', 'kemanusiaan', 'yatim', 'dakwah', 'pendidikan', 'lainnya') NOT NULL DEFAULT 'infak',
  `target_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `collected_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `period_start` DATE NULL,
  `period_end` DATE NULL,
  `doa_template` TEXT NULL, -- Doa spesifik yang otomatis dibacakan AI
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_programs_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  INDEX `idx_programs_inst_cat` (`institution_id`, `category`, `is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. BANK ACCOUNTS & GATEWAY CONFIGS (Rekening & Integrasi Payment)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `bank_code` VARCHAR(20) NOT NULL, -- e.g. 'BCA', 'MANDIRI', 'BRI', 'BSI'
  `account_number` VARCHAR(50) NOT NULL,
  `account_holder` VARCHAR(150) NOT NULL,
  `branch_office` VARCHAR(100) NULL,
  `transfer_instruction` TEXT NULL,
  `is_manual_transfer` TINYINT(1) NOT NULL DEFAULT 1,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT `fk_banks_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  INDEX `idx_banks_inst_active` (`institution_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_gateway_configs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `provider` ENUM('xendit', 'midtrans', 'oy', 'doku') NOT NULL,
  `encrypted_api_key` TEXT NOT NULL,
  `encrypted_webhook_secret` TEXT NOT NULL,
  `qris_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `va_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `fee_charged_to_customer` TINYINT(1) NOT NULL DEFAULT 0, -- 0: Ditanggung Toko, 1: Dibayar Pembeli
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT `fk_pg_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_inst_pg_provider` (`institution_id`, `provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. SHIPPING WAREHOUSES & PROMOS (Gudang Asal Kurir & Voucher Diskon)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `shipping_warehouses` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `phone_number` VARCHAR(30) NOT NULL,
  `address_line` TEXT NOT NULL,
  `subdistrict` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `province` VARCHAR(100) NOT NULL,
  `postal_code` VARCHAR(10) NOT NULL,
  `couriers_active_json` JSON NULL, -- e.g. ["jnt", "sicepat", "jne", "sap"]
  `cod_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `is_default` TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT `fk_warehouse_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promos_vouchers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `discount_type` ENUM('fixed', 'percentage', 'free_shipping') NOT NULL DEFAULT 'fixed',
  `discount_value` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `min_spend_idr` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `max_discount_idr` DECIMAL(12, 2) NULL,
  `max_uses_total` INT UNSIGNED NOT NULL DEFAULT 100,
  `used_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `valid_from` DATETIME NOT NULL,
  `valid_until` DATETIME NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT `fk_promos_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_inst_voucher_code` (`institution_id`, `code`),
  INDEX `idx_vouchers_validity` (`institution_id`, `valid_from`, `valid_until`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. CRM, Leads, & Conversational Engine Tables

```sql
-- ============================================================================
-- 7. LEADS & CRM LABELS (Kontak Pelanggan / Donatur)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `leads` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `phone_number` VARCHAR(30) NOT NULL, -- Format E.164 (628...)
  `name` VARCHAR(150) NULL,
  `gender` ENUM('Laki-laki', 'Perempuan') NULL,
  `birth_date` DATE NULL,
  `address_full` TEXT NULL,
  `assigned_cs_id` INT UNSIGNED NULL,
  `status` ENUM('new', 'in_progress', 'closing', 'repeat', 'idle', 'closed_lost') NOT NULL DEFAULT 'new',
  `risk_cod_score` TINYINT UNSIGNED NOT NULL DEFAULT 100, -- 0 (Risiko Tinggi RTS) - 100 (Sangat Aman)
  `meta_ad_id` VARCHAR(100) NULL, -- ID Iklan Facebook/Instagram asal
  `meta_campaign_id` VARCHAR(100) NULL,
  `last_contacted_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_leads_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_leads_cs` FOREIGN KEY (`assigned_cs_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  UNIQUE KEY `uk_inst_lead_phone` (`institution_id`, `phone_number`),
  INDEX `idx_leads_cs_status` (`institution_id`, `assigned_cs_id`, `status`),
  INDEX `idx_leads_ad_attribution` (`institution_id`, `meta_ad_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lead_labels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `color_hex` VARCHAR(10) NOT NULL DEFAULT '#046B54',
  `auto_label_criteria` TEXT NULL, -- Kriteria AI Auto-Label
  CONSTRAINT `fk_labels_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leads_labels_map` (
  `lead_id` INT UNSIGNED NOT NULL,
  `label_id` INT UNSIGNED NOT NULL,
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`lead_id`, `label_id`),
  CONSTRAINT `fk_map_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_map_label` FOREIGN KEY (`label_id`) REFERENCES `lead_labels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. CHAT MESSAGES & PROACTIVE FOLLOW-UP JOBS (Log Obrolan & Voice Note)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `lead_id` INT UNSIGNED NOT NULL,
  `sender_type` ENUM('customer', 'cs', 'ai_agent') NOT NULL,
  `sender_user_id` INT UNSIGNED NULL,
  `message_type` ENUM('text', 'voice_note', 'image', 'qris_invoice', 'document_receipt') NOT NULL DEFAULT 'text',
  `content_text` TEXT NULL,
  `voice_audio_url` VARCHAR(500) NULL,
  `voice_transcription` TEXT NULL, -- Hasil Speech-to-Text Whisper
  `tokens_used` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_delivered` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_chat_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  INDEX `idx_chat_lead_time` (`lead_id`, `created_at`),
  INDEX `idx_chat_inst_time` (`institution_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `proactive_followup_jobs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `lead_id` INT UNSIGNED NOT NULL,
  `step_number` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `trigger_reason` ENUM('abandoned_qris', 'abandoned_consultation', 're_engagement') NOT NULL,
  `scheduled_at` DATETIME NOT NULL,
  `executed_at` DATETIME NULL,
  `status` ENUM('pending', 'sent', 'cancelled_by_payment', 'cancelled_by_reply') NOT NULL DEFAULT 'pending',
  CONSTRAINT `fk_followup_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  INDEX `idx_followup_schedule` (`status`, `scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. Orders, Payments, & Fraud Verification Tables

```sql
-- ============================================================================
-- 9. ORDERS & ORDER ITEMS (Pesanan & Transaksi)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `order_number` VARCHAR(60) NOT NULL UNIQUE, -- e.g. "ORD-20260829-001"
  `lead_id` INT UNSIGNED NOT NULL,
  `cs_user_id` INT UNSIGNED NULL,
  `subtotal_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `shipping_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `admin_fee` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_cost_hpp` DECIMAL(14, 2) NOT NULL DEFAULT 0.00, -- Total HPP Modal
  `gross_profit` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,   -- Laba Bersih Transaksi
  `payment_method` ENUM('qris', 'va', 'bank_transfer', 'cod', 'cash') NOT NULL DEFAULT 'qris',
  `fulfillment_type` ENUM('delivery', 'pickup', 'manual_service') NOT NULL DEFAULT 'delivery',
  `status` ENUM('waiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled') NOT NULL DEFAULT 'waiting_payment',
  `review_status` ENUM('not_required', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'not_required',
  `reviewed_by_user_id` INT UNSIGNED NULL,
  `reviewed_at` DATETIME NULL,
  `rejection_reason` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_orders_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orders_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`),
  CONSTRAINT `fk_orders_cs` FOREIGN KEY (`cs_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_orders_inst_status` (`institution_id`, `status`),
  INDEX `idx_orders_inst_created` (`institution_id`, `created_at`),
  INDEX `idx_orders_review` (`institution_id`, `review_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NULL,
  `variant_id` INT UNSIGNED NULL,
  `program_id` INT UNSIGNED NULL, -- Jika transaksi mode NGO
  `item_name` VARCHAR(200) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `unit_cost_hpp` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  CONSTRAINT `fk_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. PAYMENTS, BANK MUTATIONS, & FRAUD DETECTION (QRIS, VA, & OCR Forensics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED NOT NULL,
  `payment_reference` VARCHAR(100) NOT NULL UNIQUE,
  `provider` ENUM('xendit', 'midtrans', 'oy', 'doku', 'manual') NOT NULL,
  `payment_type` ENUM('qris', 'va_bca', 'va_mandiri', 'va_bri', 'va_bni', 'va_permata', 'manual_transfer') NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `fee_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `qr_string` TEXT NULL,
  `qr_image_url` VARCHAR(500) NULL,
  `va_number` VARCHAR(60) NULL,
  `status` ENUM('pending', 'paid', 'expired', 'failed') NOT NULL DEFAULT 'pending',
  `paid_at` DATETIME NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payments_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  INDEX `idx_payments_ref` (`payment_reference`),
  INDEX `idx_payments_inst_status` (`institution_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bank_mutations` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `bank_account_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(14, 2) NOT NULL,
  `type` ENUM('CR', 'DB') NOT NULL, -- CR: Uang Masuk, DB: Keluar
  `description_raw` TEXT NOT NULL,
  `sender_name` VARCHAR(150) NULL,
  `transaction_date` DATETIME NOT NULL,
  `is_reconciled` TINYINT(1) NOT NULL DEFAULT 0,
  `matched_order_id` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_mutations_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mutations_bank` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE CASCADE,
  INDEX `idx_mutations_recon` (`institution_id`, `is_reconciled`, `type`, `amount`, `transaction_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_proofs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `ocr_extracted_amount` DECIMAL(14, 2) NULL,
  `ocr_extracted_date` DATETIME NULL,
  `ocr_extracted_bank` VARCHAR(60) NULL,
  `is_suspicious` TINYINT(1) NOT NULL DEFAULT 0,
  `confidence_score` TINYINT UNSIGNED NOT NULL DEFAULT 0, -- 0 - 100%
  `fraud_reasons_json` JSON NULL, -- e.g. ["Font mismatch in amount area", "Edited pixel noise"]
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_proofs_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 6. Shipping & Logistics Tables

```sql
-- ============================================================================
-- 11. SHIPPING SHIPMENTS & TRACKING LOGS (Kurir, AWB, Cashback, & COD)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `shipping_shipments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL UNIQUE,
  `courier_code` VARCHAR(30) NOT NULL, -- e.g. 'jnt', 'sicepat', 'jne', 'sap'
  `service_name` VARCHAR(50) NOT NULL, -- e.g. 'EZ', 'SIUNT', 'REG'
  `awb_number` VARCHAR(100) NULL,      -- Nomor Resi
  `shipping_fee_customer` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `shipping_fee_real` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `cashback_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- Komisi cashback ongkir
  `is_cod` TINYINT(1) NOT NULL DEFAULT 0,
  `cod_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `cod_status` ENUM('none', 'pending_courier', 'collected_by_courier', 'settled_to_merchant', 'returned_rts') NOT NULL DEFAULT 'none',
  `shipping_status` ENUM('draft', 'pickup_requested', 'in_transit', 'delivered', 'returned_rts', 'cancelled') NOT NULL DEFAULT 'draft',
  `label_pdf_url` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_shipments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  INDEX `idx_shipments_awb` (`awb_number`),
  INDEX `idx_shipments_status` (`shipping_status`, `cod_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shipping_tracking_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `shipment_id` INT UNSIGNED NOT NULL,
  `status_code` VARCHAR(50) NOT NULL,
  `status_description` VARCHAR(255) NOT NULL,
  `location_city` VARCHAR(100) NULL,
  `event_timestamp` DATETIME NOT NULL,
  CONSTRAINT `fk_logs_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipping_shipments` (`id`) ON DELETE CASCADE,
  INDEX `idx_tracking_shipment_time` (`shipment_id`, `event_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 7. Marketing Attribution & Commission Ledgers

```sql
-- ============================================================================
-- 12. META ADS CAPI & CS COMMISSION LEDGERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS `meta_ad_referrals` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `lead_id` INT UNSIGNED NOT NULL,
  `ad_id` VARCHAR(100) NOT NULL,
  `campaign_id` VARCHAR(100) NULL,
  `adset_id` VARCHAR(100) NULL,
  `headline` VARCHAR(255) NULL,
  `source_url` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_adref_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_adref_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  INDEX `idx_adref_ad` (`institution_id`, `ad_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `meta_capi_event_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED NOT NULL,
  `event_name` VARCHAR(50) NOT NULL DEFAULT 'Purchase',
  `event_payload_json` JSON NOT NULL,
  `response_status_code` INT NOT NULL,
  `response_body` TEXT NULL,
  `is_success` TINYINT(1) NOT NULL DEFAULT 1,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_capi_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_capi_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cs_commission_ledgers` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `institution_id` INT UNSIGNED NOT NULL,
  `cs_user_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED NOT NULL,
  `commission_amount` DECIMAL(14, 2) NOT NULL,
  `calculation_basis` ENUM('percentage', 'flat_per_order', 'flat_per_item') NOT NULL,
  `is_settled` TINYINT(1) NOT NULL DEFAULT 0,
  `settled_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_commission_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_commission_cs` FOREIGN KEY (`cs_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_commission_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  INDEX `idx_commission_cs_settled` (`cs_user_id`, `is_settled`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
