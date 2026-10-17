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
  const { currentUser, activeInstitution, teamMembers } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [showAddModal, setShowAddModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("Konsultasi & Layanan Bisnis");
  const [bookingDate, setBookingDate] = useState("Hari ini");
  const [bookingTime, setBookingTime] = useState("14:00 WIB");
  const [picStaff, setPicStaff] = useState("CS 1");

  const [bookings, setBookings] = useState(
    isDefaultDemo
      ? [
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
        ]
      : []
  );

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
            <span className="text-micro font-bold uppercase tracking-wider bg-brand-soft text-brand px-2.5 py-0.5 rounded-full border border-brand-soft flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Sistem Janji Temu & Reservasi</span>
            </span>
          </div>
          <h1 className="text-heading-md font-bold text-ink tracking-tight">
            Booking & Reservasi Pelanggan
          </h1>
          <p className="text-label text-fg-muted">
            Kelola jadwal konsultasi, fitting, janji temu, dan penugasan PIC staf secara otomatis via WhatsApp Bot.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary !py-2.5 !px-5 text-label font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>+ Buat Jadwal Booking</span>
        </button>
      </div>

      {/* Dynamic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Total Reservasi Terdaftar</div>
          <div className="text-heading-md font-bold text-brand">{bookings.length} Janji Temu</div>
          <span className={`text-micro font-bold ${bookings.length > 0 ? "text-success-600" : "text-fg-subtle"}`}>
            {bookings.length > 0 ? "100% Konfirmasi WA" : "Belum ada jadwal aktif"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Reminder WhatsApp Otomatis</div>
          <div className="text-heading-md font-bold text-success-700">H-1 & H-2 Jam</div>
          <span className="text-micro font-bold text-success-600">Notifikasi otomatis via Cloud API</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">PIC Staf Terjadwal</div>
          <div className="text-heading-md font-bold text-accent-700">{teamMembers.length} Staf Aktif</div>
          <span className="text-micro font-bold text-accent-600">Alokasi Round Robin</span>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white p-6 rounded-2xl border border-line shadow-xs">
        <h2 className="text-body font-bold text-fg mb-4">Daftar Jadwal Reservasi</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-label">
            <thead>
              <tr className="bg-canvas border-b border-line text-caption font-bold uppercase text-fg-muted">
                <th className="py-3 px-4">Pelanggan & Kontak</th>
                <th className="py-3 px-4">Layanan / Keperluan</th>
                <th className="py-3 px-4">Waktu Booking</th>
                <th className="py-3 px-4">PIC Staf Penanggungjawab</th>
                <th className="py-3 px-4">Reminder WA</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-fg-muted">
                    <div className="flex flex-col items-center justify-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center mb-2">
                        <CalendarIcon className="w-5 h-5 text-brand" />
                      </div>
                      <div className="font-bold text-ink text-body-sm">Belum Ada Jadwal Reservasi</div>
                      <p className="text-caption text-fg-muted mt-1">
                        Janji temu baru dari calon pelanggan via WhatsApp akan otomatis tercatat di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-soft transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-fg text-label">{b.customer}</div>
                      <div className="text-micro text-fg-subtle font-mono">{b.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-label font-semibold text-fg">{b.service}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-brand text-label">{b.date}</div>
                      <div className="text-micro text-fg-muted">{b.time}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-bold bg-accent-50 text-accent-700 border border-accent-100">
                        <UsersIcon className="w-3 h-3" />
                        <span>{b.pic}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-caption font-medium text-success-600 flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" />
                        <span>{b.waReminder}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {b.status === "confirmed" && (
                        <span className="text-micro font-bold text-brand bg-brand-soft px-2.5 py-0.5 rounded-full">
                          Terkonfirmasi
                        </span>
                      )}
                      {b.status === "completed" && (
                        <span className="text-micro font-bold text-success-700 bg-success-50 px-2.5 py-0.5 rounded-full">
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
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-line">
            <h3 className="text-title font-bold text-ink mb-3">Buat Jadwal Booking Baru</h3>
            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-label">
              <div>
                <label className="block text-caption font-bold text-ink mb-1">Nama Pelanggan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Pratama"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-label text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-caption font-bold text-ink mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-label text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-caption font-bold text-ink mb-1">Layanan / Keperluan</label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-label text-ink outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-bold text-ink mb-1">Tanggal</label>
                  <input
                    type="text"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-label text-ink outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-caption font-bold text-ink mb-1">Waktu</label>
                  <input
                    type="text"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-canvas text-label text-ink outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-label font-bold text-fg-muted bg-canvas hover:bg-line rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 btn-primary !py-2.5 text-label font-bold">
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
