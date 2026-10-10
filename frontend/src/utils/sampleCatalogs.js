// Optional starter catalogues a new tenant can import with one click ("Muat Template Produk").
// They are created as real products through the API only when the user asks; nothing is seeded automatically.

export const SAMPLE_PRODUCTS_BY_SECTOR = {
  culinary: [
    { name: "Paket Hemat Nasi + Ayam Geprek + Es Teh", sku: "TPL-KUL-01", category: "Paket Hemat", price: 22000, hpp: 12000, stock: 150, lowStock: 20 },
    { name: "Ayam Geprek Mozzarella", sku: "TPL-KUL-02", category: "Menu Spesial", price: 26000, hpp: 15000, stock: 80, lowStock: 10 },
    { name: "Ayam Geprek Sambal Matah", sku: "TPL-KUL-03", category: "Menu Utama", price: 21000, hpp: 11000, stock: 100, lowStock: 15 },
    { name: "Kulit Ayam Crispy", sku: "TPL-KUL-04", category: "Side Dish", price: 14000, hpp: 6000, stock: 120, lowStock: 20 },
    { name: "Es Teh Manis Jumbo", sku: "TPL-KUL-05", category: "Minuman", price: 5000, hpp: 1500, stock: 300, lowStock: 30 },
  ],
  fashion: [
    { name: "Kemeja Batik Tulis Premium", sku: "TPL-FSH-01", category: "Pria", price: 650000, hpp: 380000, stock: 42, lowStock: 5 },
    { name: "Dress Tunik Katun Parang", sku: "TPL-FSH-02", category: "Wanita", price: 320000, hpp: 160000, stock: 85, lowStock: 10 },
    { name: "Sarung Batik Tulis Mega Mendung", sku: "TPL-FSH-03", category: "Unisex", price: 250000, hpp: 125000, stock: 18, lowStock: 5 },
  ],
  skincare: [
    { name: "Brightening Glow Serum 30ml", sku: "TPL-SKN-01", category: "Serum", price: 185000, hpp: 75000, stock: 120, lowStock: 15 },
    { name: "Gentle Facial Cleanser 100ml", sku: "TPL-SKN-02", category: "Cleanser", price: 95000, hpp: 38000, stock: 90, lowStock: 10 },
  ],
  retail: [
    { name: "Produk Unggulan Toko", sku: "TPL-RTL-01", category: "Kategori Utama", price: 150000, hpp: 85000, stock: 50, lowStock: 10 },
    { name: "Paket Starter Bundling", sku: "TPL-RTL-02", category: "Paket Promo", price: 275000, hpp: 150000, stock: 35, lowStock: 5 },
  ],
};

export function templateForSector(sector = "") {
  const text = String(sector).toLowerCase();
  if (/culinary|kuliner|f&b|makanan|resto|cafe/.test(text)) return SAMPLE_PRODUCTS_BY_SECTOR.culinary;
  if (/fashion|pakaian|batik|busana/.test(text)) return SAMPLE_PRODUCTS_BY_SECTOR.fashion;
  if (/skincare|kecantikan|beauty/.test(text)) return SAMPLE_PRODUCTS_BY_SECTOR.skincare;
  return SAMPLE_PRODUCTS_BY_SECTOR.retail;
}
