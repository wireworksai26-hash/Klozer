"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
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
  const [service, setService] = useState("Konsultasi & Layanan Bisnis");
  const [bookingDate, setBookingDate] = useState("Hari ini");
  const [bookingTime, setBookingTime] = useState("14:00 WIB");
  const [picStaff, setPicStaff] = useState("CS 1");
  const [bookings, setBookings] = useState([]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const newBkg = {
      id: `BKG-${Date.now().toString().slice(-4)}`,
      customer: customerName,
      phone: phone || "+62 812-xxxx-xxxx",
      service: service,
      date: bookingDate,
      time: bookingTime,
      pic: picStaff,
      status: "confirmed",
      waReminder: "Terkirim",
    };
    setBookings([newBkg, ...bookings]);
    setShowAddModal(false);
    setCustomerName("");
    setPhone("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Sistem Janji Temu & Reservasi</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Booking & Reservasi Pelanggan
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Kelola jadwal konsultasi, fitting, janji temu, dan penugasan PIC staf secara otomatis via WhatsApp Bot.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>+ Buat Jadwal Booking</span>
        </button>
      </div>

      {/* Dynamic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Total Reservasi Terdaftar</div>
          <div className="text-[28px] font-extrabold text-[#2545ff]">{bookings.length} Janji Temu</div>
          <span className={`text-[11.5px] font-bold ${bookings.length > 0 ? "text-emerald-600" : "text-[#8f95a8]"}`}>
            {bookings.length > 0 ? "100% Konfirmasi WA" : "Belum ada jadwal aktif"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Reminder WhatsApp Otomatis</div>
          <div className="text-[28px] font-extrabold text-emerald-700">H-1 & H-2 Jam</div>
          <span className="text-[11.5px] font-bold text-emerald-600">Notifikasi otomatis via Cloud API</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">PIC Staf Terjadwal</div>
          <div className="text-[28px] font-extrabold text-purple-700">{teamMembers.length} Staf Aktif</div>
          <span className="text-[11.5px] font-bold text-purple-600">Alokasi Round Robin</span>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Daftar Jadwal Reservasi</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-[#f9f8f6] border-b border-[#ede8e2] text-[12px] font-bold uppercase text-[#64748b]">
                <th className="py-3 px-4">Pelanggan & Kontak</th>
                <th className="py-3 px-4">Layanan / Keperluan</th>
                <th className="py-3 px-4">Waktu Booking</th>
                <th className="py-3 px-4">PIC Staf Penanggungjawab</th>
                <th className="py-3 px-4">Reminder WA</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e2]">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-2">
                        <CalendarIcon className="w-5 h-5 text-[#2545ff]" />
                      </div>
                      <div className="font-extrabold text-[#0c1754] text-[14px]">Belum Ada Jadwal Reservasi</div>
                      <p className="text-[12px] text-[#64748b] mt-1">
                        Janji temu baru dari calon pelanggan via WhatsApp akan otomatis tercatat di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1e2640] text-[13.5px]">{b.customer}</div>
                      <div className="text-[11.5px] text-[#8f95a8] font-mono">{b.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[13px] font-semibold text-[#1e2640]">{b.service}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#2545ff] text-[13px]">{b.date}</div>
                      <div className="text-[11.5px] text-[#5a6380]">{b.time}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        <UsersIcon className="w-3 h-3" />
                        <span>{b.pic}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[12px] font-medium text-emerald-600 flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" />
                        <span>{b.waReminder}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {b.status === "confirmed" && (
                        <span className="text-[11px] font-bold text-[#2545ff] bg-[#eaebf8] px-2.5 py-0.5 rounded-full">
                          Terkonfirmasi
                        </span>
                      )}
                      {b.status === "completed" && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Booking */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-[#ede8e2]">
            <h3 className="text-[18px] font-extrabold text-[#0c1754] mb-3">Buat Jadwal Booking Baru</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-[13px]">
              <div>
                <label className="block text-[12.5px] font-bold text-[#0c1754] mb-1">Nama Pelanggan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Pratama"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13.5px] text-[#0c1754] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[#0c1754] mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13.5px] text-[#0c1754] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-bold text-[#0c1754] mb-1">Layanan / Keperluan</label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13.5px] text-[#0c1754] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-bold text-[#0c1754] mb-1">Tanggal</label>
                  <input
                    type="text"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13px] text-[#0c1754] outline-none focus:border-[#2545ff]"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-[#0c1754] mb-1">Waktu</label>
                  <input
                    type="text"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#f0e9e1] bg-[#f9f8f6] text-[13px] text-[#0c1754] outline-none focus:border-[#2545ff]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-bold text-[#64748b] bg-[#f9f8f6] hover:bg-[#ede8e2] rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 btn-primary !py-2.5 text-[13px] font-bold">
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
