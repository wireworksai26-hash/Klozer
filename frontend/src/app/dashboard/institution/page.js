"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import {
  BuildingIcon,
  CrownIcon,
  CheckCircleIcon,
  UsersIcon,
  ClockIcon,
  ShieldCheckIcon,
  XIcon,
} from "@/components/icons";

export default function SupervisorInstitutionPage() {
  const { activeInstitution, teamMembers, addTeamMember, deleteTeamMember, currentUser } = useDashboard();
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Customer Service Junior");

  const cleanName = currentUser?.institutionName || activeInstitution?.name || "Bisnis Saya";
  const cleanEmail = currentUser?.email || activeInstitution?.email || "kontak@bisnis.id";
  const cleanOwner = currentUser?.name || activeInstitution?.owner || "Owner / Pengelola";

  const [institutionData, setInstitutionData] = useState({
    name: cleanName,
    sector: activeInstitution?.sector || "Retail & Perdagangan",
    owner: cleanOwner,
    email: cleanEmail,
    phone: activeInstitution?.phone || "+62 812-xxxx-xxxx",
    address: "Lokasi Kantor / Toko Utama",
    operatingHoursStart: "08:00",
    operatingHoursEnd: "21:00",
    outOfHoursAiMode: true,
  });

  const [toastMsg, setToastMsg] = useState("");

  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    addTeamMember({
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
    });
    setShowAddUserModal(false);
    setNewUserName("");
    setNewUserEmail("");
    setToastMsg(`Akun staf baru berhasil dibuat untuk ${newUserName}!`);
    setTimeout(() => setToastMsg(""), 4000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#2545ff] px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5">
              <BuildingIcon className="w-3.5 h-3.5" />
              <span>Profil & Manajemen Akun Toko</span>
            </span>
          </div>
          <h1 className="text-[26px] font-extrabold text-[#0c1754] tracking-tight">
            Kelola Institusi & Akun Pengguna Tim
          </h1>
          <p className="text-[13.5px] text-[#64748b]">
            Atur identitas profil bisnis, jam kerja operasional CS, dan kelola user tim (tambah/hapus CS, Finance, SPV).
          </p>
        </div>

        {toastMsg && (
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-[12.5px] font-bold flex items-center gap-2 animate-scale-pop self-start sm:self-auto shadow-xs">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Institution Profile Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-4">
          <div className="pb-3 border-b border-[#ede8e2]">
            <h2 className="text-[17px] font-extrabold text-[#1e2640]">Profil Bisnis & Operasional</h2>
            <p className="text-[12px] text-[#64748b]">Data identitas yang digunakan pada invoice dan bot.</p>
          </div>

          <div className="flex flex-col gap-3 text-[13px]">
            <div>
              <label className="font-bold text-[#1e2640] block mb-1">Nama Toko / Instansi</label>
              <input
                type="text"
                value={institutionData.name}
                onChange={(e) => setInstitutionData({ ...institutionData, name: e.target.value })}
                className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] font-semibold outline-none focus:border-[#2545ff]"
              />
            </div>

            <div>
              <label className="font-bold text-[#1e2640] block mb-1">Sektor Industri</label>
              <input
                type="text"
                value={institutionData.sector}
                onChange={(e) => setInstitutionData({ ...institutionData, sector: e.target.value })}
                className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-[#1e2640] block mb-1">Alamat Kantor / Toko</label>
              <textarea
                rows={2}
                value={institutionData.address}
                onChange={(e) => setInstitutionData({ ...institutionData, address: e.target.value })}
                className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none text-[12.5px]"
              />
            </div>

            <div className="pt-3 border-t border-[#ede8e2]">
              <span className="font-bold text-[#1e2640] block mb-2">Jam Kerja Operasional CS:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#8f95a8] uppercase font-bold block mb-1">Jam Mulai:</label>
                  <input
                    type="time"
                    value={institutionData.operatingHoursStart}
                    onChange={(e) => setInstitutionData({ ...institutionData, operatingHoursStart: e.target.value })}
                    className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2 font-bold text-[#1e2640] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#8f95a8] uppercase font-bold block mb-1">Jam Selesai:</label>
                  <input
                    type="time"
                    value={institutionData.operatingHoursEnd}
                    onChange={(e) => setInstitutionData({ ...institutionData, operatingHoursEnd: e.target.value })}
                    className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2 font-bold text-[#1e2640] outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setToastMsg("Profil instansi berhasil diperbarui!");
                setTimeout(() => setToastMsg(""), 4000);
              }}
              className="btn-primary !py-2.5 text-[13px] font-bold mt-2 cursor-pointer"
            >
              Simpan Profil Instansi
            </button>
          </div>
        </div>

        {/* Right: Team Members & Access Management */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#ede8e2] shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2]">
            <div>
              <h2 className="text-[17px] font-extrabold text-[#1e2640]">Daftar Pengguna Tim (Staf & CS)</h2>
              <p className="text-[12px] text-[#64748b]">Kelola kredensial login, peran jabatan, dan penugasan chat.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddUserModal(true)}
              className="btn-primary !py-2 !px-4 text-[12.5px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Tambah User Baru</span>
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nama Staf</th>
                  <th>Email Login</th>
                  <th>Peran Jabatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-[#fcfbf9] transition-colors">
                    <td>
                      <div className="font-bold text-[#1e2640] text-[13.5px]">{member.name}</div>
                    </td>
                    <td>
                      <span className="text-[12.5px] font-mono text-[#5a6380]">{member.email}</span>
                    </td>
                    <td>
                      <span className="badge badge-lavender text-[11px] font-bold">{member.role}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => deleteTeamMember(member.id)}
                        className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[11.5px] font-bold border-none cursor-pointer"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Add User */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-[#0c1754]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-[#ede8e2] animate-scale-pop">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e2] mb-4">
              <h3 className="text-[17px] font-extrabold text-[#1e2640]">Tambah Anggota Tim Baru</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="w-7 h-7 rounded-full bg-[#f5f4f2] text-[#8f95a8] hover:text-[#1e2640] flex items-center justify-center border-none cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Anggara"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-semibold focus:border-[#2545ff]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Email Login *</label>
                <input
                  type="email"
                  required
                  placeholder="rian.cs@brand.id"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#1e2640] block mb-1">Peran Jabatan</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-[#f5f4f2] border border-[#ede8e2] rounded-xl p-2.5 text-[#1e2640] outline-none font-bold"
                >
                  <option value="Customer Service Junior">Customer Service Junior</option>
                  <option value="Customer Service Senior">Customer Service Senior</option>
                  <option value="Supervisor (SPV)">Supervisor (SPV)</option>
                  <option value="Finance & Rekonsiliasi">Finance & Rekonsiliasi</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#ede8e2] mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="btn-outline !py-2 !px-4 text-[13px]"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary !py-2 !px-5 text-[13px] font-bold">
                  Simpan Staf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
