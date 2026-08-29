"use client";
import { useState } from "react";
import {
  WarehouseIcon,
  CrownIcon,
  CheckCircleIcon,
  BuildingIcon,
  UsersIcon,
  PackageIcon,
} from "@/components/icons";

export default function SupervisorWarehousesPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [whName, setWhName] = useState("");
  const [whCity, setWhCity] = useState("Solo, Jawa Tengah");
  const [whPic, setWhPic] = useState("Agus Setiawan");
  const [whCapacity, setWhCapacity] = useState("5,000 Pcs");

  const [warehouses, setWarehouses] = useState([
    {
      id: "WH-01",
      name: "Gudang Pusat & Workshop Solo",
      address: "Jl. Slamet Riyadi No. 142, Laweyan, Surakarta",
      city: "Solo, Jawa Tengah",
      pic: "Agus Setiawan",
      phone: "+62 812-3344-5566",
      skuCount: 38,
      capacity: "10,000 Pcs (Terisi 65%)",
      status: "active",
    },
    {
      id: "WH-02",
      name: "Hub Distribusi Jakarta Timur",
      address: "Kawasan Industri Pulogadung Blok C-4, Jakarta Timur",
      city: "DKI Jakarta",
      pic: "Deni Rahman",
      phone: "+62 813-7788-9900",
      skuCount: 24,
      capacity: "4,000 Pcs (Terisi 40%)",
      status: "active",
    },
    {
      id: "WH-03",
      name: "Hub Transit Surabaya",
      address: "Jl. Rungkut Industri Raya No. 18, Surabaya",
      city: "Surabaya, Jawa Timur",
      pic: "Eko Prasetyo",
      phone: "+62 857-1122-3344",
      skuCount: 15,
      capacity: "2,500 Pcs (Terisi 20%)",
      status: "active",
    },
  ]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!whName.trim()) return;

    const newWh = {
      id: `WH-0${warehouses.length + 1}`,
      name: whName,
      address: "Alamat Gudang",
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
    alert("Gudang baru berhasil didaftarkan ke sistem inventaris!");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <WarehouseIcon className="w-3.5 h-3.5" />
              <span>Multi-Gudang & Logistik</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Master Data Gudang Penyimpanan Fisik
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Kelola lokasi gudang utama, hub transit pengiriman cepat, dan penanggungjawab gudang fisik instansi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <WarehouseIcon className="w-4 h-4" />
          <span>+ Tambah Gudang Baru</span>
        </button>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {warehouses.map((wh) => (
          <div key={wh.id} className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-3">
                <span className="badge badge-lavender text-[11px]">{wh.id}</span>
                <span className="badge badge-success text-[11px]">Aktif</span>
              </div>

              <h2 className="font-extrabold text-[16px] text-[#1e2640]">{wh.name}</h2>
              <p className="text-[12px] text-[#5a6380] mt-1">{wh.address}</p>

              <div className="mt-4 pt-3 border-t border-[#ede8e2] flex flex-col gap-2 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#8f95a8]">Kepala Gudang (PIC):</span>
                  <span className="font-bold text-[#1e2640]">{wh.pic}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8f95a8]">Kapasitas Terpakai:</span>
                  <span className="font-bold text-[#2545ff]">{wh.capacity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8f95a8]">Varian SKU Tersimpan:</span>
                  <span className="font-bold text-[#1e2640]">{wh.skuCount} SKU</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Warehouse */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Tambah Gudang Fisik Baru</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center font-bold border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nama Gudang / Hub *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hub Transit Bandung Barat"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-semibold focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Kota / Wilayah</label>
                <input
                  type="text"
                  value={whCity}
                  onChange={(e) => setWhCity(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nama PIC Gudang</label>
                <input
                  type="text"
                  value={whPic}
                  onChange={(e) => setWhPic(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ede8e2] mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-[13px] font-bold">
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
