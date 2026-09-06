-- ============================================================================
-- KLOZER SEED DATA - COMPREHENSIVE LOCAL & TESTING DATASET
-- Ready for MySQL 8.0 & phpMyAdmin Import
-- Password for all seeded users: Klozer123!
-- ============================================================================

-- 1. INSTITUTIONS
INSERT INTO `institutions` (`id`, `name`, `slug`, `mode`, `sector`, `phone_number`, `email`, `address`, `subscription_tier`, `blast_credit_quota`, `ai_token_quota`, `features_json`, `is_active`) VALUES
(1, 'Batik Mahakarya Solo', 'batik-mahakarya-solo', 'business', 'Fashion & Retail', '+62 812-3344-5566', 'owner@batikmahakarya.id', 'Jl. Slamet Riyadi No. 142, Surakarta, Jawa Tengah', 'pro', 5000, 1500000, '{"aiPersona": true, "aiAutoLabel": true, "printInvoice": true, "baileys": true, "instagram": true, "csBlast": true, "publicBooking": true, "stockManagement": true, "picFeature": true, "qrisPayment": true, "voiceNoteAi": true, "fraudOcr": true, "metaCapi": true}', 1),
(2, 'Lumiere Skincare Clinic', 'lumiere-skincare-clinic', 'business', 'Kecantikan & Skincare', '+62 819-8877-6655', 'admin@lumiereskin.com', 'Jl. Senopati No. 88, Kebayoran Baru, Jakarta Selatan', 'enterprise', 12000, 3000000, '{"aiPersona": true, "aiAutoLabel": true, "printInvoice": true, "baileys": true, "instagram": true, "csBlast": true, "publicBooking": true, "stockManagement": true, "picFeature": true, "qrisPayment": true, "voiceNoteAi": true, "fraudOcr": true, "metaCapi": true}', 1),
(3, 'Yayasan ZISWAF Peduli Umat', 'ziswaf-peduli-umat', 'ngo', 'Lembaga Sosial & ZISWAF', '+62 821-4455-6677', 'lazis@peduliumat.org', 'Jl. Teuku Umar No. 12, Bandung, Jawa Barat', 'enterprise', 25000, 5000000, '{"aiPersona": true, "aiAutoLabel": true, "printInvoice": true, "baileys": true, "instagram": true, "csBlast": true, "publicBooking": true, "stockManagement": false, "picFeature": true, "qrisPayment": true, "voiceNoteAi": true, "fraudOcr": true, "metaCapi": true}', 1),
(4, 'Geprek Juara', 'geprek-juara', 'business', 'Kuliner & F&B', '+62 812-9900-8800', 'spv@geprekjuara.id', 'Jl. Merdeka No. 45, Jakarta', 'pro', 5000, 1500000, '{"aiPersona": true, "aiAutoLabel": true, "printInvoice": true, "baileys": true, "instagram": true, "csBlast": true, "publicBooking": true, "stockManagement": true, "picFeature": true, "qrisPayment": true, "voiceNoteAi": true, "fraudOcr": true, "metaCapi": true}', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 2. USERS (Password: Klozer123! -> bcrypt hash: $2b$10$7ZkZfP0pP2oQz7.yT3q7ceBsm8O.zPz3WfO1GfZL8Cskq8z7DkLqK)
INSERT INTO `users` (`id`, `institution_id`, `name`, `email`, `password_hash`, `role`, `phone_number`, `commission_rate_percent`, `is_online`, `is_active`) VALUES
(1, 1, 'Platform Superadmin', 'superadmin@klozer.id', '$2b$10$Jg755LqZfT7Ua70.y18KueO3v4d8K.P6F5N.M2x.Y8UeG8x6Z6W8q', 'superadmin', '+62 811-0000-9999', 0.00, 1, 1),
(2, 1, 'Hendra Wijaya (Owner)', 'owner@batikmahakarya.id', '$2b$10$Jg755LqZfT7Ua70.y18KueO3v4d8K.P6F5N.M2x.Y8UeG8x6Z6W8q', 'owner', '+62 812-3344-5566', 0.00, 1, 1),
(3, 1, 'Siti Rahma (CS 1)', 'siti@batikmahakarya.id', '$2b$10$Jg755LqZfT7Ua70.y18KueO3v4d8K.P6F5N.M2x.Y8UeG8x6Z6W8q', 'cs', '+62 857-1122-3344', 5.00, 1, 1),
(4, 1, 'Budi Pratama (CS 2)', 'budi@batikmahakarya.id', '$2b$10$Jg755LqZfT7Ua70.y18KueO3v4d8K.P6F5N.M2x.Y8UeG8x6Z6W8q', 'cs', '+62 858-9988-7766', 5.00, 1, 1),
(5, 1, 'Ratna Sari (Finance)', 'finance@batikmahakarya.id', '$2b$10$Jg755LqZfT7Ua70.y18KueO3v4d8K.P6F5N.M2x.Y8UeG8x6Z6W8q', 'finance', '+62 813-7766-5544', 0.00, 0, 1),
(6, 4, 'SPV - Geprek Juara', 'spv@geprekjuara.id', '$2b$10$Jg755LqZfT7Ua70.y18KueO3v4d8K.P6F5N.M2x.Y8UeG8x6Z6W8q', 'owner', '+62 812-9900-8800', 0.00, 1, 1),
(7, 4, 'CS 1 - Geprek Juara', 'cs1@geprekjuara.id', '$2b$10$Jg755LqZfT7Ua70.y18KueO3v4d8K.P6F5N.M2x.Y8UeG8x6Z6W8q', 'cs', '+62 812-9900-8801', 5.00, 1, 1),
(8, 4, 'CS 2 - Geprek Juara', 'cs2@geprekjuara.id', '$2b$10$Jg755LqZfT7Ua70.y18KueO3v4d8K.P6F5N.M2x.Y8UeG8x6Z6W8q', 'cs', '+62 812-9900-8802', 5.00, 1, 1)
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`);

-- 3. PRODUCTS
INSERT INTO `products` (`id`, `institution_id`, `sku`, `name`, `category`, `description`, `selling_price`, `cost_price_hpp`, `stock_quantity`, `low_stock_threshold`, `weight_in_grams`, `is_active`) VALUES
(1, 1, 'BTK-SLK-01', 'Kemeja Batik Tulis Sutra Solo Premium', 'Pria', 'Batik tulis sutra asli dengan pewarnaan alami dan furing premium.', 650000.00, 380000.00, 42, 5, 350, 1),
(2, 1, 'BTK-DMS-02', 'Dress Tunik Katun Primisima Parang', 'Wanita', 'Tunik modern katun adem dengan kancing bungkus dan aksen pita.', 320000.00, 160000.00, 85, 10, 300, 1),
(3, 1, 'BTK-SAR-03', 'Sarung Batik Tulis Motif Mega Mendung', 'Unisex', 'Sarung santri dan formal kualitas ekspor katun candimekar.', 250000.00, 125000.00, 3, 5, 400, 1),
(4, 2, 'SKN-GLW-01', 'Lumiere Brightening Glow Serum 30ml', 'Skincare', 'Serum pencerah dengan Niacinamide 10% dan Alpha Arbutin.', 185000.00, 75000.00, 120, 15, 150, 1),
(5, 2, 'SKN-SUN-02', 'UV Barrier Sunscreen SPF 50 PA++++', 'Sun Care', 'Tabir surya ringan tanpa whitecast cocok untuk kulit sensitif.', 145000.00, 55000.00, 95, 10, 120, 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 4. PRODUCT VARIANTS
INSERT INTO `product_variants` (`id`, `product_id`, `variant_sku`, `variant_name`, `price_override`, `cost_price_override`, `stock_quantity`, `is_active`) VALUES
(1, 1, 'BTK-SLK-01-M', 'Ukuran M', 650000.00, 380000.00, 15, 1),
(2, 1, 'BTK-SLK-01-L', 'Ukuran L', 650000.00, 380000.00, 18, 1),
(3, 1, 'BTK-SLK-01-XL', 'Ukuran XL', 675000.00, 395000.00, 9, 1),
(4, 2, 'BTK-DMS-02-ALL', 'All Size Fit to XL', 320000.00, 160000.00, 85, 1)
ON DUPLICATE KEY UPDATE `variant_name`=VALUES(`variant_name`);

-- 5. PROGRAMS (Mode NGO)
INSERT INTO `programs` (`id`, `institution_id`, `name`, `category`, `target_amount`, `collected_amount`, `period_start`, `period_end`, `doa_template`, `is_published`) VALUES
(1, 3, 'Sedekah Subuh & Santunan 1.000 Yatim', 'yatim', 50000000.00, 32450000.00, '2026-01-01', '2026-12-31', 'Semoga Allah melipatgandakan pahala, melapangkan rezeki, dan menghapus dosa-dosa Bapak/Ibu sekeluarga.', 1),
(2, 3, 'Wakaf Sumur Air Bersih Pelosok', 'wakaf', 75000000.00, 48100000.00, '2026-01-01', '2026-12-31', 'Semoga wakaf ini menjadi amal jariyah yang pahalanya terus mengalir abadi tanpa putus. Aamiin.', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 6. OFFICIAL BANK ACCOUNTS
INSERT INTO `bank_accounts` (`id`, `institution_id`, `bank_code`, `account_number`, `account_holder`, `branch_office`, `transfer_instruction`, `is_manual_transfer`, `is_active`) VALUES
(1, 1, 'BCA', '8809123847', 'PT Batik Mahakarya Indonesia', 'KCU Slamet Riyadi Solo', 'Mohon transfer tepat sampai 3 digit terakhir untuk verifikasi otomatis.', 1, 1),
(2, 1, 'MANDIRI', '1380019283746', 'PT Batik Mahakarya Indonesia', 'KC Solo Sudirman', 'Simpan dan kirimkan struk m-banking ke chat.', 1, 1),
(3, 3, 'BSI', '7100223344', 'Yayasan Peduli Umat ZISWAF', 'KC Bandung Dago', 'Cantumkan nama program pada berita transfer.', 1, 1)
ON DUPLICATE KEY UPDATE `account_number`=VALUES(`account_number`);

-- 7. WAREHOUSES
INSERT INTO `warehouses` (`id`, `institution_id`, `name`, `contact_name`, `phone_number`, `city`, `province`, `postal_code`, `address_full`, `is_primary`) VALUES
(1, 1, 'Gudang Utama Solo', 'Bpk. Joko Susanto', '+62 813-2211-0099', 'Surakarta', 'Jawa Tengah', '57141', 'Jl. Pajajaran No. 4, Laweyan, Surakarta', 1),
(2, 2, 'Hub Jakarta Selatan', 'Ibu Maya Lestari', '+62 812-9988-7766', 'Jakarta Selatan', 'DKI Jakarta', '12180', 'Jl. Wijaya I No. 18, Kebayoran Baru, Jakarta Selatan', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 8. VOUCHERS
INSERT INTO `vouchers` (`id`, `institution_id`, `code`, `discount_type`, `discount_value`, `min_purchase_amount`, `max_discount_amount`, `usage_limit`, `used_count`, `is_active`) VALUES
(1, 1, 'BATIKLEBARAN', 'percentage', 10.00, 300000.00, 50000.00, 500, 84, 1),
(2, 1, 'ONGKIRFREE', 'fixed', 20000.00, 250000.00, 20000.00, 200, 45, 1)
ON DUPLICATE KEY UPDATE `code`=VALUES(`code`);

-- 9. LEADS (CRM)
INSERT INTO `leads` (`id`, `institution_id`, `phone_number`, `name`, `gender`, `city`, `province`, `postal_code`, `address_full`, `assigned_cs_id`, `status`, `risk_cod_score`, `total_spend`, `total_orders_count`, `last_contacted_at`) VALUES
(1, 1, '6281234567890', 'Ibu Dian Sastrowardoyo', 'Perempuan', 'Jakarta Selatan', 'DKI Jakarta', '12160', 'Jl. Wijaya Timur No. 45, Kebayoran Baru, Jakarta Selatan', 3, 'closing', 98, 938000.00, 1, CURRENT_TIMESTAMP),
(2, 1, '6285711223344', 'Bpk. Rahmat Hidayat', 'Laki-laki', 'Surabaya', 'Jawa Timur', '60293', 'Rungkut Asri Timur No. 12, Surabaya', 3, 'in_progress', 90, 0.00, 0, CURRENT_TIMESTAMP),
(3, 1, '6281987654321', 'Ibu Anisa Pohan', 'Perempuan', 'Bandung', 'Jawa Barat', '40132', 'Jl. Dago Asri No. 8, Bandung', 4, 'new_lead', 85, 0.00, 0, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE `phone_number`=VALUES(`phone_number`);

-- 10. CHAT MESSAGES
INSERT INTO `chat_messages` (`id`, `institution_id`, `lead_id`, `sender_type`, `sender_user_id`, `message_type`, `content_text`, `is_delivered`, `created_at`) VALUES
(1, 1, 1, 'customer', NULL, 'text', 'Halo kak, apakah Kemeja Batik Tulis Sutra Solo Premium ukuran L masih ready?', 1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 HOUR)),
(2, 1, 1, 'ai', NULL, 'text', 'Halo kak Dian! Iya kak, Kemeja Batik Tulis Sutra Solo Premium ukuran L sedang ready stok 18 pcs. Mau kami amankan sekarang kak?', 1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 119 MINUTE)),
(3, 1, 1, 'customer', NULL, 'text', 'Mau kak, sekalian Dress Tunik Katun Parang 1 pcs ya. Totalnya berapa?', 1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 110 MINUTE)),
(4, 1, 1, 'cs', 3, 'text', 'Siap kak Dian! Total pesanan kakak Rp 938.000 (sudah termasuk diskon voucher BATIKLEBARAN Rp 50.000). Pembayaran bisa via Dynamic QRIS instan ini ya kak.', 1, DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 105 MINUTE))
ON DUPLICATE KEY UPDATE `id`=VALUES(`id`);

-- 11. ORDERS
INSERT INTO `orders` (`id`, `institution_id`, `order_number`, `lead_id`, `customer_name`, `customer_phone`, `customer_city`, `customer_address_full`, `cs_user_id`, `subtotal_amount`, `discount_amount`, `shipping_fee`, `total_amount`, `total_cost_hpp`, `gross_profit`, `payment_method`, `fulfillment_type`, `status`, `review_status`, `created_at`) VALUES
(1, 1, 'ORD-20260829-1001', 1, 'Ibu Dian Sastrowardoyo', '6281234567890', 'Jakarta Selatan', 'Jl. Wijaya Timur No. 45, Kebayoran Baru, Jakarta Selatan', 3, 970000.00, 50000.00, 18000.00, 938000.00, 540000.00, 398000.00, 'qris', 'delivery', 'paid', 'approved', CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE `order_number`=VALUES(`order_number`);

-- 12. ORDER ITEMS
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `variant_id`, `item_name`, `item_sku`, `quantity`, `unit_price`, `unit_cost_hpp`, `subtotal_amount`) VALUES
(1, 1, 1, 2, 'Kemeja Batik Tulis Sutra Solo Premium - L', 'BTK-SLK-01-L', 1, 650000.00, 380000.00, 650000.00),
(2, 1, 2, 4, 'Dress Tunik Katun Primisima Parang', 'BTK-DMS-02-ALL', 1, 320000.00, 160000.00, 320000.00)
ON DUPLICATE KEY UPDATE `id`=VALUES(`id`);

-- 13. DYNAMIC QRIS TRANSACTIONS
INSERT INTO `qris_transactions` (`id`, `institution_id`, `order_id`, `reference_id`, `qris_string`, `amount`, `status`, `expires_at`) VALUES
(1, 1, 1, 'PAY-QRIS-20260829-1001', '00020101021226580014ID.LINKAJA.WWW011893600912384700000002081234567852045812530336054069380005802ID5920Batik Mahakarya Solo6008Surakarta62070703A016304ABCD', 938000.00, 'paid', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR))
ON DUPLICATE KEY UPDATE `reference_id`=VALUES(`reference_id`);

-- 14. CS COMMISSIONS
INSERT INTO `commissions` (`id`, `institution_id`, `order_id`, `user_id`, `calculated_rate_percent`, `commission_amount`, `status`) VALUES
(1, 1, 1, 3, 5.00, 46900.00, 'approved')
ON DUPLICATE KEY UPDATE `id`=VALUES(`id`);

-- ============================================================================
-- SEED DATA LOADED SUCCESSFULLY!
-- ============================================================================
