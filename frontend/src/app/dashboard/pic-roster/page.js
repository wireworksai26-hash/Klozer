"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  CalendarIcon,
  CrownIcon,
  CheckCircleIcon,
  UsersIcon,
  ClockIcon,
} from "@/components/icons";

export default function SupervisorPicRosterPage() {
  const { teamMembers } = useDashboard();
  const [selectedWeek, setSelectedWeek] = useState("minggu-ini");

  const [roster, setRoster] = useState([
    { day: "Senin, 31 Agu", shiftPagi: "Sarah Amalia (CS 1)", shiftSiang: "Budi Santoso (CS 2)", shiftMalam: "AI Autonomous Mode" },
    { day: "Selasa, 01 Sep", shiftPagi: "Budi Santoso (CS 2)", shiftSiang: "Sarah Amalia (CS 1)", shiftMalam: "AI Autonomous Mode" },
    { day: "Rabu, 02 Sep", shiftPagi: "Sarah Amalia (CS 1)", shiftSiang: "Rian Supervisor", shiftMalam: "AI Autonomous Mode" },
    { day: "Kamis, 03 Sep", shiftPagi: "Budi Santoso (CS 2)", shiftSiang: "Sarah Amalia (CS 1)", shiftMalam: "AI Autonomous Mode" },
    { day: "Jumat, 04 Sep", shiftPagi: "Sarah Amalia (CS 1)", shiftSiang: "Budi Santoso (CS 2)", shiftMalam: "AI Autonomous Mode" },
    { day: "Sabtu, 05 Sep", shiftPagi: "Rian Supervisor", shiftSiang: "Budi Santoso (CS 2)", shiftMalam: "AI Autonomous Mode" },
    { day: "Minggu, 06 Sep", shiftPagi: "Full AI Guard Mode", shiftSiang: "Sarah Amalia (CS 1)", shiftMalam: "AI Autonomous Mode" },
  ]);

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
            Pengaturan giliran jaga shift CS, alokasi round-robin chat masuk, dan jadwal standby AI di luar jam operasional.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Tambah / Edit Jadwal Roster...")}
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
          <div className="text-[24px] font-extrabold text-[#2545ff]">Sarah Amalia</div>
          <span className="text-[11.5px] font-bold text-emerald-600">CS Senior Bertugas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Shift Siang (15:00 - 21:00)</div>
          <div className="text-[24px] font-extrabold text-purple-700">Budi Santoso</div>
          <span className="text-[11.5px] font-bold text-purple-600">CS Junior Bertugas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#ede8e2] shadow-xs">
          <div className="text-[#8f95a8] text-[12px] font-bold uppercase mb-1">Shift Malam (21:00 - 08:00)</div>
          <div className="text-[24px] font-extrabold text-emerald-700">AI Autonomous</div>
          <span className="text-[11.5px] font-bold text-emerald-600">100% Ditangani Bot AI</span>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs">
        <h2 className="text-[17px] font-extrabold text-[#1e2640] mb-4">Jadwal Roster Mingguan</h2>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Hari & Tanggal</th>
                <th>Shift Pagi (08:00 - 15:00)</th>
                <th>Shift Siang (15:00 - 21:00)</th>
                <th>Shift Malam / Luar Jam Kerja</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r, idx) => (
                <tr key={idx} className="hover:bg-[#fcfbf9] transition-colors">
                  <td>
                    <span className="font-bold text-[#1e2640] text-[13.5px]">{r.day}</span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-blue-50 text-[#2545ff] border border-blue-100">
                      <UsersIcon className="w-3 h-3" />
                      <span>{r.shiftPagi}</span>
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                      <UsersIcon className="w-3 h-3" />
                      <span>{r.shiftSiang}</span>
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CheckCircleIcon className="w-3 h-3" />
                      <span>{r.shiftMalam}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
