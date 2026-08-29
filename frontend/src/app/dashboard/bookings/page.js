"use client";
import { useState } from "react";
import {
  CalendarIcon,
  CrownIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  MessageSquareIcon,
} from "@/components/icons";

export default function SupervisorBookingsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("Fitting Baju & Pengukuran Custom");
  const [bookingDate, setBookingDate] = useState("30 Agu 2026");
  const [bookingTime, setBookingTime] = useState("14:00 WIB");
  const [picStaff, setPicStaff] = useState("Sarah Amalia");

  const [bookings, setBookings] = useState([
    {
      id: "BKG-201",
      customer: "Nadia Maharani",
      phone: "+62 813-8899-1122",
      service: "Fitting Baju Pengantin & Custom Jahit",
      date: "30 Agu 2026",
      time: "10:30 WIB",
      pic: "Sarah Amalia",
      status: "confirmed",
      waReminder: "Terkirim",
    },
    {
      id: "BKG-202",
      customer: "H. Sudirman",
      phone: "+62 811-2233-4455",
      service: "Konsultasi Pembuatan Seragam Batik 200 Pcs",
      date: "31 Agu 2026",
      time: "14:00 WIB",
      pic: "Rian Supervisor",
      status: "confirmed",
      waReminder: "Terjadwal (H-1)",
    },
    {
      id: "BKG-203",
      customer: "Clarissa Putri",
      phone: "+62 812-9988-4433",
      service: "Konsultasi Pemilihan Corak Batik Sutra",
      date: "28 Agu 2026",
      time: "16:00 WIB",
      pic: "Budi Santoso",
      status: "completed",
      waReminder: "Selesai",
    },
  ]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const newBkg = {
      id: `BKG-${Date.now().toString().slice(-3)}`,
      customer: customerName,
      phone: phone,
      service: service,
      date: bookingDate,
      time: bookingTime,
      pic: picStaff,
      status: "confirmed",
      waReminder: "Terjadwal Otomatis",
    };
    setBookings([newBkg, ...bookings]);
    setShowAddModal(false);
    setCustomerName("");
    setPhone("");
    alert("Janji temu booking berhasil dijadwalkan dan link konfirmasi terkirim ke WhatsApp pelanggan!");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Public Booking & Jadwal Layanan</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Manajemen Janji Temu & Booking Pelanggan
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Atur reservasi jadwal fitting, konsultasi VIP, dan survei dengan reminder otomatis via WhatsApp bot.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>+ Buat Booking Baru</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Booking Minggu Ini</div>
          <div className="text-[28px] font-extrabold text-[#2545ff]">8 Janji Temu</div>
          <span className="text-[11.5px] font-bold text-emerald-600">100% Konfirmasi WA</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Kehadiran (Show-Up Rate)</div>
          <div className="text-[28px] font-extrabold text-emerald-700">94.2%</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Tinggi karena Reminder H-1</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">PIC Terjadwal</div>
          <div className="text-[28px] font-extrabold text-purple-700">3 Staf Aktif</div>
          <span className="text-[11.5px] font-bold text-purple-600">Alokasi Round Robin</span>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Daftar Jadwal Reservasi</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Pelanggan & Kontak</th>
                <th>Layanan / Keperluan</th>
                <th>Waktu Booking</th>
                <th>PIC Staf Penanggungjawab</th>
                <th>Reminder WA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <div className="font-bold text-[#1e2640] text-[13.5px]">{b.customer}</div>
                    <div className="text-[11.5px] text-[#8f95a8] font-mono">{b.phone}</div>
                  </td>
                  <td>
                    <span className="text-[13px] font-semibold text-[#1e2640]">{b.service}</span>
                  </td>
                  <td>
                    <div className="font-bold text-[#2545ff] text-[13px]">{b.date}</div>
                    <div className="text-[11.5px] text-[#5a6380]">{b.time}</div>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                      <UsersIcon className="w-3 h-3" />
                      <span>{b.pic}</span>
                    </span>
                  </td>
                  <td>
                    <span className="text-[12px] font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      <span>{b.waReminder}</span>
                    </span>
                  </td>
                  <td>
                    {b.status === "confirmed" && <span className="badge badge-info text-[11px]">Terkonfirmasi</span>}
                    {b.status === "completed" && <span className="badge badge-success text-[11px]">Selesai</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Booking */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[500px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Jadwalkan Janji Temu Pelanggan</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center font-bold border-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nama Pelanggan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ibu Rina Hartono"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-semibold focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nomor WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="+62 812-xxxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] font-mono outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Layanan / Keperluan</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                >
                  <option value="Fitting Baju & Pengukuran Custom">Fitting Baju & Pengukuran Custom</option>
                  <option value="Konsultasi Pesanan Seragam Grosir">Konsultasi Pesanan Seragam Grosir</option>
                  <option value="Konsultasi Jenis Kulit & Produk VIP">Konsultasi Jenis Kulit & Produk VIP</option>
                  <option value="Survei Lokasi / Pengantaran Sampel">Survei Lokasi / Pengantaran Sampel</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1e2640] block mb-1">Tanggal</label>
                  <input
                    type="text"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1e2640] block mb-1">Jam Slot</label>
                  <input
                    type="text"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">PIC Staf Bertugas</label>
                <select
                  value={picStaff}
                  onChange={(e) => setPicStaff(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                >
                  <option value="Sarah Amalia">Sarah Amalia</option>
                  <option value="Budi Santoso">Budi Santoso</option>
                  <option value="Rian Supervisor">Rian Supervisor</option>
                </select>
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
                  Konfirmasi Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
