"use client";
import { useState } from "react";
import {
  FileTextIcon,
  CrownIcon,
  CheckCircleIcon,
  PackageIcon,
  DollarSignIcon,
  SlidersIcon,
} from "@/components/icons";

export default function SupervisorBomPage() {
  const [boms, setBoms] = useState([
    {
      id: "BOM-01",
      finishedProduct: "Kemeja Batik Tulis Sutra",
      category: "Fashion Pria",
      batchSize: "1 Pcs",
      totalHppCost: 285000,
      sellingPrice: 650000,
      marginPercent: "56.1%",
      materials: [
        { name: "Kain Sutra ATBM", qty: "2.5 Meter", cost: 180000 },
        { name: "Malam Lilin Batik Premium", qty: "200 Gram", cost: 25000 },
        { name: "Pewarna Alami Indigofera", qty: "1 Botol", cost: 35000 },
        { name: "Kancing Batok Kelapa Asli", qty: "7 Pcs", cost: 15000 },
        { name: "Ongkos Jahit & Finishing", qty: "1 Pcs", cost: 30000 },
      ],
    },
    {
      id: "BOM-02",
      finishedProduct: "Gamis Silk Exclusive Maroon",
      category: "Fashion Wanita",
      batchSize: "1 Pcs",
      totalHppCost: 210000,
      sellingPrice: 520000,
      marginPercent: "59.6%",
      materials: [
        { name: "Kain Silk Roberto Cavalli", qty: "3.2 Meter", cost: 140000 },
        { name: "Renda Brukat Bordir", qty: "1 Meter", cost: 30000 },
        { name: "Resleting Jepang YKK", qty: "1 Pcs", cost: 10000 },
        { name: "Ongkos Jahit Butik", qty: "1 Pcs", cost: 30000 },
      ],
    },
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <FileTextIcon className="w-3.5 h-3.5" />
              <span>Manufaktur & Resep Bahan Baku</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Bill of Materials (BOM) & HPP Produk
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Resep perakitan bahan mentah menjadi produk jadi, kalkulasi otomatis Harga Pokok Produksi (HPP), dan estimasi margin laba.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Tambah Resep BOM Baru...")}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <FileTextIcon className="w-4 h-4" />
          <span>+ Buat Resep BOM Baru</span>
        </button>
      </div>

      {/* BOM Cards */}
      <div className="flex flex-col gap-6">
        {boms.map((bom) => (
          <div key={bom.id} className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ede8e2]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-[17px] text-[#1e2640]">{bom.finishedProduct}</h2>
                  <span className="badge badge-lavender text-[11px]">{bom.category}</span>
                </div>
                <div className="text-[12px] text-[#8f95a8] mt-0.5">Kode Resep: {bom.id} • Ukuran Batch: {bom.batchSize}</div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[11px] text-[#8f95a8] block uppercase font-bold">Total HPP:</span>
                  <span className="font-extrabold text-[16px] text-[#1e2640]">
                    Rp {bom.totalHppCost.toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8f95a8] block uppercase font-bold">Harga Jual:</span>
                  <span className="font-extrabold text-[16px] text-[#2545ff]">
                    Rp {bom.sellingPrice.toLocaleString("id-ID")}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8f95a8] block uppercase font-bold">Margin Laba:</span>
                  <span className="badge badge-success text-[12px] font-extrabold">{bom.marginPercent}</span>
                </div>
              </div>
            </div>

            {/* Materials Breakdown Table */}
            <div className="table-wrapper !border !border-[#ede8e2]">
              <table>
                <thead>
                  <tr>
                    <th>Komponen Bahan Baku</th>
                    <th>Jumlah Pemakaian per Unit</th>
                    <th>Biaya Bahan Baku (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.materials.map((mat, idx) => (
                    <tr key={idx} className="hover:bg-[#fcfbf9]">
                      <td>
                        <span className="font-bold text-[#1e2640] text-[13px]">{mat.name}</span>
                      </td>
                      <td>
                        <span className="text-[12.5px] font-mono text-[#5a6380]">{mat.qty}</span>
                      </td>
                      <td>
                        <span className="font-extrabold text-[#1e2640] text-[13px]">
                          Rp {mat.cost.toLocaleString("id-ID")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
