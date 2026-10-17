"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  CalendarIcon,
  CrownIcon,
  CheckCircleIcon,
  UsersIcon,
  ClockIcon,
  BotIcon,
  XIcon,
} from "@/components/icons";

export default function SupervisorPicRosterPage() {
  const { teamMembers = [], currentUser, activeInstitution } = useDashboard();
  const cleanInstName = currentUser?.institutionName || activeInstitution?.name || "Toko";
  const isDefaultDemo = cleanInstName.toLowerCase() === "batik mahakarya solo";

  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [newDay, setNewDay] = useState("Senin");
  const [newShiftPagi, setNewShiftPagi] = useState(teamMembers[0]?.name || "Staf CS 1");
  const [newShiftSiang, setNewShiftSiang] = useState(teamMembers[1]?.name || "Staf CS 2");
  const [newShiftMalam, setNewShiftMalam] = useState("AI Autonomous Mode");

  const [roster, setRoster] = useState(
    isDefaultDemo
      ? [
          { day: "Senin, 31 Agu", shiftPagi: "Sarah Amalia (CS 1)", shiftSiang: "Budi Santoso (CS 2)", shiftMalam: "AI Autonomous Mode" },
          { day: "Selasa, 01 Sep", shiftPagi: "Budi Santoso (CS 2)", shiftSiang: "Sarah Amalia (CS 1)", shiftMalam: "AI Autonomous Mode" },
        ]
      : []
  );

  const handleAddShift = (e) => {
    e.preventDefault();
    const newEntry = {
      day: newDay,
      shiftPagi: newShiftPagi,
      shiftSiang: newShiftSiang,
      shiftMalam: newShiftMalam,
    };
    setRoster([...roster, newEntry]);
    setShowAddShiftModal(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-micro font-bold uppercase tracking-wider bg-accent-100 text-accent-800 px-2.5 py-0.5 rounded-full border border-accent-200 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Manajemen Shift & Penugasan Staf</span>
            </span>
          </div>
          <h1 className="text-heading-md font-bold text-ink tracking-tight">
            Roster Jadwal Jaga PIC Staf CS
          </h1>
          <p className="text-label text-fg-muted">
            Pengaturan giliran jaga shift CS, alokasi round-robin chat masuk, dan jadwal standby AI di luar jam operasional ({cleanInstName}).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddShiftModal(true)}
          className="btn-primary !py-2.5 !px-5 text-label font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>+ Atur Shift Baru</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Shift Pagi (08:00 - 15:00)</div>
          <div className="text-subheading font-bold text-brand truncate">
            {roster.length > 0 ? roster[0].shiftPagi : "Belum Diatur"}
          </div>
          <span className={`text-micro font-bold ${roster.length > 0 ? "text-success-600" : "text-fg-subtle"}`}>
            {roster.length > 0 ? "CS Bertugas" : "Jadwal kosong"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Shift Siang (15:00 - 21:00)</div>
          <div className="text-subheading font-bold text-accent-700 truncate">
            {roster.length > 0 ? roster[0].shiftSiang : "Belum Diatur"}
          </div>
          <span className={`text-micro font-bold ${roster.length > 0 ? "text-accent-600" : "text-fg-subtle"}`}>
            {roster.length > 0 ? "CS Bertugas" : "Jadwal kosong"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-line shadow-xs">
          <div className="text-fg-subtle text-caption font-bold uppercase mb-1">Shift Malam (21:00 - 08:00)</div>
          <div className="text-subheading font-bold text-success-700">AI Autonomous</div>
          <span className="text-micro font-bold text-success-600">100% Ditangani Bot AI</span>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white p-6 rounded-2xl border border-line shadow-xs">
        <h2 className="text-body font-bold text-fg mb-4">Jadwal Roster Mingguan</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-label">
            <thead>
              <tr className="bg-canvas border-b border-line text-caption font-bold uppercase text-fg-muted">
                <th className="py-3 px-4">Hari & Tanggal</th>
                <th className="py-3 px-4">Shift Pagi (08:00 - 15:00)</th>
                <th className="py-3 px-4">Shift Siang (15:00 - 21:00)</th>
                <th className="py-3 px-4">Shift Malam / Luar Jam Kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-fg-muted">
                    <div className="flex flex-col items-center justify-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center mb-2">
                        <CalendarIcon className="w-5 h-5 text-brand" />
                      </div>
                      <div className="font-bold text-ink text-body-sm">Belum Ada Jadwal Roster Shift</div>
                      <p className="text-caption text-fg-muted mt-1">
                        Klik tombol <strong>+ Atur Shift Baru</strong> di atas untuk membuat jadwal penugasan staf CS toko Anda.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                roster.map((r, idx) => (
                  <tr key={idx} className="hover:bg-soft transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-fg text-label">{r.day}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-bold bg-brand-soft text-brand border border-brand-soft">
                        <UsersIcon className="w-3 h-3" />
                        <span>{r.shiftPagi}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-bold bg-accent-50 text-accent-700 border border-accent-100">
                        <UsersIcon className="w-3 h-3" />
                        <span>{r.shiftSiang}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-bold bg-success-50 text-success-700 border border-success-100">
                        <CheckCircleIcon className="w-3 h-3 text-success-600" />
                        <span>{r.shiftMalam}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Shift */}
      {showAddShiftModal && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-line animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h3 className="text-body font-bold text-fg">Atur Jadwal Shift Baru</h3>
              <button
                onClick={() => setShowAddShiftModal(false)}
                className="w-7 h-7 rounded-full bg-sunken text-fg-subtle hover:text-fg flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddShift} className="flex flex-col gap-3.5 text-label">
              <div>
                <label className="font-bold text-fg block mb-1">Hari & Tanggal *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Senin, 07 Sep"
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line text-label outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="font-bold text-fg block mb-1">Staf Shift Pagi (08:00 - 15:00)</label>
                <input
                  type="text"
                  value={newShiftPagi}
                  onChange={(e) => setNewShiftPagi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line text-label outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="font-bold text-fg block mb-1">Staf Shift Siang (15:00 - 21:00)</label>
                <input
                  type="text"
                  value={newShiftSiang}
                  onChange={(e) => setNewShiftSiang(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line text-label outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="font-bold text-fg block mb-1">Shift Malam (Luar Jam Kerja)</label>
                <input
                  type="text"
                  value={newShiftMalam}
                  onChange={(e) => setNewShiftMalam(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-line text-label outline-none focus:border-brand"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddShiftModal(false)}
                  className="flex-1 py-2.5 text-label font-bold text-fg-muted bg-sunken hover:bg-line rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 btn-primary !py-2.5 text-label font-bold">
                  Simpan Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
