"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  WarehouseIcon,
  CrownIcon,
  CheckCircleIcon,
  BuildingIcon,
  UsersIcon,
  PackageIcon,
  XIcon,
} from "@/components/icons";

export default function SupervisorWarehousesPage() {
  const { currentUser, activeInstitution, products } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [showAddModal, setShowAddModal] = useState(false);
  const [whName, setWhName] = useState("");
  const [whCity, setWhCity] = useState("Kota Utama");
  const [whPic, setWhPic] = useState(currentUser?.name || "Kepala Gudang");
  const [whCapacity, setWhCapacity] = useState("5,000 Pcs");

  const [warehouses, setWarehouses] = useState([
    {
      id: "WH-01",
      name: isDefaultDemo ? "Gudang Pusat & Workshop Solo" : `Gudang Utama ${cleanInstName}`,
      address: isDefaultDemo ? "Jl. Slamet Riyadi No. 142, Laweyan, Surakarta" : "Lokasi Pusat Operasional Toko",
      city: isDefaultDemo ? "Solo, Jawa Tengah" : "Pusat Operasional",
      pic: isDefaultDemo ? "Agus Setiawan" : (currentUser?.name || "Supervisor"),
      phone: "+62 812-xxxx-xxxx",
      skuCount: products.length,
      capacity: "Kapasitas Standar",
      status: "active",
    },
  ]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!whName.trim()) return;

    const newWh = {
      id: `WH-0${warehouses.length + 1}`,
      name: whName,
      address: "Alamat Hub / Gudang Baru",
      city: whCity,
      pic: whPic,
      phone: "+62 812-xxxx-xxxx",
      skuCount: 0,
      capacity: whCapacity,
      status: "active",
    };
    setWarehouses([...warehouses, newWh]);
    setShowAddModal(false);
    setWhName("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <WarehouseIcon className="w-3.5 h-3.5" />
              <span>Multi-Warehouse & Hub Distribusi</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Master Gudang & Lokasi Stok
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Kelola titik asal pengiriman paket, integrasi multi-gudang, dan alokasi stok per cabang wilayah.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <WarehouseIcon className="w-4 h-4" />
          <span>+ Tambah Gudang / Hub</span>
        </button>
      </div>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((wh) => (
          <div key={wh.id} className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-3">
                <div className="flex items-center gap-2">
                  <WarehouseIcon className="w-4 h-4 text-[#2545ff]" />
                  <span className="font-extrabold text-[15px] text-[#1e2640]">{wh.name}</span>
                </div>
                <span className="badge badge-success text-[11px]">Aktif</span>
              </div>

              <div className="flex flex-col gap-1.5 text-[12.5px]">
                <div className="text-[#5a6380]">{wh.address}</div>
                <div className="font-bold text-[#1e2640]">{wh.city}</div>
                <div className="text-[11.5px] text-[#8f95a8] mt-1">
                  Penanggungjawab (PIC): <strong>{wh.pic}</strong>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#ede8e2] flex items-center justify-between text-[12px]">
              <span className="text-[#8f95a8]">Produk Terdaftar:</span>
              <span className="font-bold text-[#2545ff]">{wh.skuCount} SKU</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Warehouse */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Tambah Gudang / Hub Cabang</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="block text-[12px] font-bold text-[#1e2640] mb-1">Nama Gudang / Hub *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hub Cabang Jakarta Barat"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13.5px] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1e2640] mb-1">Kota / Wilayah</label>
                <input
                  type="text"
                  value={whCity}
                  onChange={(e) => setWhCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13.5px] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1e2640] mb-1">Nama PIC Penanggungjawab</label>
                <input
                  type="text"
                  value={whPic}
                  onChange={(e) => setWhPic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13.5px] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-bold text-[#5a6380] bg-[#f5f4f2] hover:bg-[#ede8e2] rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 btn-primary !py-2.5 text-[13px] font-bold">
                  Simpan Gudang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
