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
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Manajemen Shift & Penugasan Staf</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Roster Jadwal Jaga PIC Staf CS
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Pengaturan giliran jaga shift CS, alokasi round-robin chat masuk, dan jadwal standby AI di luar jam operasional ({cleanInstName}).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddShiftModal(true)}
          className="btn-primary !py-2.5 !px-5 text-[13.5px] font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>+ Atur Shift Baru</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Shift Pagi (08:00 - 15:00)</div>
          <div className="text-[22px] font-extrabold text-[#2545ff] truncate">
            {roster.length > 0 ? roster[0].shiftPagi : "Belum Diatur"}
          </div>
          <span className={`text-[11.5px] font-bold ${roster.length > 0 ? "text-emerald-600" : "text-[#8f95a8]"}`}>
            {roster.length > 0 ? "CS Bertugas" : "Jadwal kosong"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Shift Siang (15:00 - 21:00)</div>
          <div className="text-[22px] font-extrabold text-purple-700 truncate">
            {roster.length > 0 ? roster[0].shiftSiang : "Belum Diatur"}
          </div>
          <span className={`text-[11.5px] font-bold ${roster.length > 0 ? "text-purple-600" : "text-[#8f95a8]"}`}>
            {roster.length > 0 ? "CS Bertugas" : "Jadwal kosong"}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Shift Malam (21:00 - 08:00)</div>
          <div className="text-[22px] font-extrabold text-emerald-700">AI Autonomous</div>
          <span className="text-[11.5px] font-bold text-emerald-600">100% Ditangani Bot AI</span>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Jadwal Roster Mingguan</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-[#f9f8f6] border-b border-[#ede8e2] text-[12px] font-bold uppercase text-[#64748b]">
                <th className="py-3 px-4">Hari & Tanggal</th>
                <th className="py-3 px-4">Shift Pagi (08:00 - 15:00)</th>
                <th className="py-3 px-4">Shift Siang (15:00 - 21:00)</th>
                <th className="py-3 px-4">Shift Malam / Luar Jam Kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ede8e2]">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[#64748b]">
                    <div className="flex flex-col items-center justify-center max-w-[340px] mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-[#eaebf8] text-[#2545ff] flex items-center justify-center mb-2">
                        <CalendarIcon className="w-5 h-5 text-[#2545ff]" />
                      </div>
                      <div className="font-extrabold text-[#0c1754] text-[14px]">Belum Ada Jadwal Roster Shift</div>
                      <p className="text-[12px] text-[#64748b] mt-1">
                        Klik tombol <strong>+ Atur Shift Baru</strong> di atas untuk membuat jadwal penugasan staf CS toko Anda.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                roster.map((r, idx) => (
                  <tr key={idx} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#1e2640] text-[13.5px]">{r.day}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-blue-50 text-[#2545ff] border border-blue-100">
                        <UsersIcon className="w-3 h-3" />
                        <span>{r.shiftPagi}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                        <UsersIcon className="w-3 h-3" />
                        <span>{r.shiftSiang}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
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
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Atur Jadwal Shift Baru</h3>
              <button
                onClick={() => setShowAddShiftModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddShift} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Hari & Tanggal *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Senin, 07 Sep"
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13.5px] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Staf Shift Pagi (08:00 - 15:00)</label>
                <input
                  type="text"
                  value={newShiftPagi}
                  onChange={(e) => setNewShiftPagi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13.5px] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Staf Shift Siang (15:00 - 21:00)</label>
                <input
                  type="text"
                  value={newShiftSiang}
                  onChange={(e) => setNewShiftSiang(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13.5px] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Shift Malam (Luar Jam Kerja)</label>
                <input
                  type="text"
                  value={newShiftMalam}
                  onChange={(e) => setNewShiftMalam(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ede8e2] text-[13.5px] outline-none focus:border-[#2545ff]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddShiftModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-bold text-[#5a6380] bg-[#f5f4f2] hover:bg-[#ede8e2] rounded-xl border-none cursor-pointer"
                >
                  Batal
                </button>
                <button type="submit" className="flex-1 btn-primary !py-2.5 text-[13px] font-bold">
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
