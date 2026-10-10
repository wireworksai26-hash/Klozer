"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { CheckCircleIcon, AlertTriangleIcon, PackageIcon, XIcon, ReceiptIcon } from "@/components/icons";
import ThermalPrintModal from "@/components/common/ThermalPrintModal";

export default function OrdersPage() {
  const { orders, addOrder, updateOrderStatus, deleteOrder, products, role, currentUser, activeInstitution, notify } = useDashboard();

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedThermalOrder, setSelectedThermalOrder] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form State for Manual Order Creation
  const [formData, setFormData] = useState({
    customer: "",
    phone: "",
    city: "Jakarta Selatan",
    selectedProduct: products[0]?.id || "",
    qty: 1,
    courier: "J&T Express",
    shippingFee: 12000,
    paymentMethod: "Dynamic QRIS",
    status: "waiting_payment",
  });

  const [orderKey, setOrderKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setOrderKey(crypto.randomUUID());
    setFormData({
      customer: "",
      phone: "+62 8",
      city: "Jakarta Selatan",
      selectedProduct: products[0]?.id || "",
      qty: 1,
      courier: "J&T Express",
      shippingFee: 12000,
      paymentMethod: "Dynamic QRIS",
      status: "waiting_payment",
    });
    setShowAddModal(true);
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (!formData.customer.trim()) return;
    if (formData.phone.replace(/\D/g, "").length < 9) {
      notify("error", "Isi nomor WhatsApp pelanggan yang valid agar nama pelanggan tersimpan.");
      return;
    }

    const matchedPrd = products.find((p) => p.id === formData.selectedProduct) || products[0];
    const subtotal = (matchedPrd?.price || 0) * Number(formData.qty);
    const total = subtotal + Number(formData.shippingFee);

    const payload = {
      customer: formData.customer,
      phone: formData.phone,
      city: formData.city,
      items: [
        {
          productId: matchedPrd?.id,
          name: matchedPrd?.name,
          qty: Number(formData.qty),
          price: matchedPrd?.price,
        },
      ],
      subtotal,
      shippingFee: Number(formData.shippingFee),
      total,
      paymentMethod: formData.paymentMethod,
      status: formData.status,
      courier: formData.courier,
    };

    if (submitting) return;
    setSubmitting(true);
    const created = await addOrder({ ...payload, idempotencyKey: orderKey });
    setSubmitting(false);
    // keep the form open on failure so nothing typed is lost; the error is shown by the dashboard
    if (created) setShowAddModal(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-caption font-bold bg-emerald-100 text-emerald-800">
            <CheckCircleIcon className="w-3 h-3" />
            <span>Lunas</span>
          </span>
        );
      case "processing":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-blue-100 text-brand">Diproses</span>;
      case "shipped":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-purple-100 text-purple-800">Dikirim</span>;
      case "waiting_payment":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-amber-100 text-amber-800">Menunggu Bayar</span>;
      case "cancelled":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-gray-200 text-gray-700">Dibatalkan</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Pesanan & Rekonsiliasi</h1>
          <p className="text-body-sm text-fg-muted">Daftar transaksi WhatsApp, verifikasi mutasi bayar, dan booking kurir ekspedisi.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-primary !py-2.5 !px-5 text-body-sm font-bold flex items-center gap-2 self-start sm:self-auto"
        >
          <span>+</span>
          <span>Buat Pesanan Manual</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-line shadow-xs flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-canvas border border-line rounded-full px-3.5 py-2 w-full sm:w-[320px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#646b84" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Cari order ID, pembeli, no WA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-body-sm text-ink placeholder:text-fg-subtle flex-1 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { key: "all", label: "Semua" },
              { key: "waiting_payment", label: "Menunggu Bayar" },
              { key: "paid", label: "Lunas" },
              { key: "processing", label: "Diproses" },
              { key: "shipped", label: "Dikirim" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-label font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-brand text-white border-brand"
                    : "bg-canvas text-fg-muted border-line hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-line shadow-[0_2px_12px_rgba(12,23,84,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas border-b border-line">
                <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">Order ID & Waktu</th>
                <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">Pembeli & Alamat</th>
                <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">Rincian Item</th>
                <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">Total & Metode</th>
                <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">Status</th>
                <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted">Ekspedisi & Resi</th>
                <th className="py-3.5 px-5 text-label font-bold uppercase text-fg-muted text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-body-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="flex flex-col items-center justify-center max-w-[360px] mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3">
                        <PackageIcon className="w-6 h-6 text-brand" />
                      </div>
                      <div className="font-bold text-ink text-body">Belum Ada Pesanan Masuk</div>
                      <p className="text-label text-fg-muted mt-1 mb-4">
                        Pesanan baru yang dibuat manual atau dikonfirmasi via WhatsApp QRIS akan otomatis tampil di sini.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="btn-primary !py-2 !px-4 text-label font-bold"
                      >
                        + Buat Pesanan Manual Pertama
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-soft transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-ink font-mono text-body-sm">{o.id}</div>
                      <div className="text-caption text-fg-subtle">{o.date}</div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-bold text-ink">{o.customer}</div>
                      <div className="text-caption text-fg-muted">{o.phone}</div>
                      <div className="text-caption text-fg-subtle">{o.city}</div>
                    </td>

                    <td className="py-4 px-5 max-w-[200px]">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="text-label font-medium text-charcoal">
                          {it.qty}x {it.name}
                        </div>
                      ))}
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-bold text-ink">Rp {o.total.toLocaleString("id-ID")}</div>
                      <div className="text-caption font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-full inline-block mt-0.5">
                        {o.paymentMethod}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      {getStatusBadge(o.status)}
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-medium text-charcoal text-label">{o.courier}</div>
                      {o.awb ? (
                        <span className="font-mono text-caption text-emerald-600 font-bold">Resi: {o.awb}</span>
                      ) : (
                        <span className="text-caption text-fg-subtle italic">Belum ada resi</span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {o.status === "waiting_payment" && (
                          <button
                            onClick={() => updateOrderStatus(o.id, "paid")}
                            className="px-2.5 py-1 text-caption font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                          >
                            Set Lunas
                          </button>
                        )}
                        {o.status === "paid" && (
                          <button
                            onClick={() => updateOrderStatus(o.id, "processing")}
                            className="px-2.5 py-1 text-caption font-bold text-brand bg-brand-soft hover:bg-brand hover:text-white rounded-lg transition-colors border border-brand/20 cursor-pointer"
                          >
                            Proses
                          </button>
                        )}
                        {o.status === "processing" && (
                          <button
                            onClick={() => {
                              const awb = (prompt("Masukkan nomor resi dari ekspedisi:", "") || "").trim();
                              if (awb) updateOrderStatus(o.id, "shipped", { awb });
                            }}
                            className="px-2.5 py-1 text-caption font-bold text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white rounded-lg transition-colors border border-purple-200 cursor-pointer"
                          >
                            Kirim Resi
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedThermalOrder(o)}
                          className="px-2.5 py-1 text-caption font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 cursor-pointer flex items-center gap-1"
                          title="Cetak Tiket Dapur / Struk Termal ESC/POS"
                        >
                          <ReceiptIcon className="w-3.5 h-3.5 text-amber-600" />
                          <span>Tiket Dapur</span>
                        </button>

                        <button
                          onClick={() => setSelectedInvoice(o)}
                          className="px-2.5 py-1 text-caption font-bold text-ink bg-canvas hover:bg-ink hover:text-white rounded-lg transition-colors border border-line cursor-pointer"
                        >
                          Invoice
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(o.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-md border-none cursor-pointer"
                          title="Batalkan / Hapus"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Manual Order */}
      {showAddModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-line animate-scale-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="card-title">Buat Pesanan Baru (Kasir Manual)</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-canvas hover:bg-brand-soft flex items-center justify-center text-fg-muted border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="flex flex-col gap-3.5 text-body-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink block mb-1">Nama Pembeli *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formData.customer}
                    onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium focus:border-brand"
                  />
                </div>
                <div>
                  <label className="font-bold text-ink block mb-1">Nomor WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="+62 812-xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium focus:border-brand"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ink block mb-1">Kota & Alamat Pengiriman</label>
                <input
                  type="text"
                  required
                  placeholder="Kecamatan, Kota, Provinsi"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-ink block mb-1">Pilih Produk</label>
                  <select
                    value={formData.selectedProduct}
                    onChange={(e) => setFormData({ ...formData, selectedProduct: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Rp {p.price.toLocaleString("id-ID")})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink block mb-1">Jumlah (Qty)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink block mb-1">Kurir Ekspedisi</label>
                  <select
                    value={formData.courier}
                    onChange={(e) => setFormData({ ...formData, courier: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium"
                  >
                    <option value="J&T Express">J&T Express (EZ)</option>
                    <option value="SiCepat REG">SiCepat REG</option>
                    <option value="JNE Regular">JNE Regular</option>
                    <option value="SAP Express COD">SAP Express COD</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink block mb-1">Ongkos Kirim (Rp)</label>
                  <input
                    type="number"
                    required
                    value={formData.shippingFee}
                    onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink block mb-1">Metode Pembayaran</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium"
                  >
                    <option value="Dynamic QRIS">Dynamic QRIS (1-Klik)</option>
                    <option value="BCA Transfer">BCA Virtual Account</option>
                    <option value="COD (Bayar di Tempat)">COD (Bayar di Tempat)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink block mb-1">Status Awal</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium"
                  >
                    <option value="paid">Lunas (Otomatis)</option>
                    <option value="waiting_payment">Menunggu Pembayaran</option>
                    <option value="processing">Sedang Diproses</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-line mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline !py-2 !px-4 text-body-sm"
                >
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="btn-primary !py-2 !px-5 text-body-sm font-bold disabled:opacity-60">
                  {submitting ? "Menyimpan..." : "Buat Pesanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Printable Invoice Preview */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-line animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div>
                <span className="text-caption font-bold uppercase tracking-wider text-brand">E-Receipt Resmi</span>
                <h3 className="card-title">Invoice #{selectedInvoice.id}</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-7 h-7 rounded-full bg-canvas hover:bg-brand-soft flex items-center justify-center text-fg-muted border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-body-sm">
              <div className="bg-canvas p-3 rounded-xl border border-line">
                <div className="text-fg-muted text-caption">Kepada:</div>
                <div className="font-bold text-ink">{selectedInvoice.customer} ({selectedInvoice.phone})</div>
                <div className="text-caption text-fg-muted">{selectedInvoice.city}</div>
              </div>

              <div className="divide-y divide-line border-y border-line py-2">
                {selectedInvoice.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between py-1.5">
                    <span>{it.qty}x {it.name}</span>
                    <span className="font-bold text-ink">Rp {(it.qty * it.price).toLocaleString("id-ID")}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5 text-fg-muted">
                  <span>Ongkir ({selectedInvoice.courier})</span>
                  <span>Rp {selectedInvoice.shippingFee.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between py-2 text-body font-bold text-ink">
                  <span>Total Tagihan</span>
                  <span className="text-brand">Rp {selectedInvoice.total.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-caption text-fg-subtle pt-1">
                <span>Metode: {selectedInvoice.paymentMethod}</span>
                <span>Petugas: {selectedInvoice.cs}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-line mt-4">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="btn-outline !py-2 !px-4 text-label"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  alert("Invoice PDF terkirim otomatis ke WhatsApp pembeli!");
                  setSelectedInvoice(null);
                }}
                className="btn-primary !py-2 !px-4 text-label font-bold"
              >
                Kirim via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[400px] p-5 shadow-2xl border border-line animate-scale-pop text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <h3 className="card-title mb-1.5">Batalkan Pesanan Ini?</h3>
            <p className="text-body-sm text-fg-muted mb-5">
              Pesanan #{deleteConfirmId} akan dibatalkan dan stok produk dikembalikan ke gudang.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-outline !py-2 !px-4 text-body-sm"
              >
                Kembali
              </button>
              <button
                onClick={() => {
                  deleteOrder(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-body-sm border-none cursor-pointer shadow-sm"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Print Modal */}
      <ThermalPrintModal
        isOpen={Boolean(selectedThermalOrder)}
        onClose={() => setSelectedThermalOrder(null)}
        order={selectedThermalOrder}
        storeName={currentUser?.institutionName || activeInstitution?.name || "Geprek Juara"}
      />

    </div>
  );
}
