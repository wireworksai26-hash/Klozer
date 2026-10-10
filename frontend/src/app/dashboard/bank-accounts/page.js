"use client";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { api } from "@/utils/api";
import { XIcon } from "@/components/icons";

const input = "w-full bg-canvas border border-line rounded-xl p-2.5 text-ink outline-none font-medium focus:border-brand";
const EMPTY = { bank_code: "BCA", account_number: "", account_holder: "", branch_office: "", transfer_instruction: "" };

export default function BankAccountsPage() {
  const { notify, isManager } = useDashboard();
  const [banks, setBanks] = useState(null);
  const [form, setForm] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/bank-accounts");
      setBanks(res.items);
    } catch (err) {
      notify("error", err.message);
      setBanks([]);
    }
  }, [notify]);

  useEffect(() => {
    // Initial fetch on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const { id, ...body } = form;
    const clean = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== "" && v !== null));
    try {
      if (id) await api.put(`/bank-accounts/${id}`, clean);
      else await api.post("/bank-accounts", clean);
      notify("success", "Rekening tersimpan.");
      setForm(null);
      load();
    } catch (err) {
      notify("error", err.message);
    }
  };

  const toggle = async (b) => {
    try {
      await api.put(`/bank-accounts/${b.id}`, { is_active: !b.is_active });
      load();
    } catch (err) {
      notify("error", err.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/bank-accounts/${id}`);
      setConfirmId(null);
      load();
    } catch (err) {
      notify("error", err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Rekening Pembayaran</h1>
          <p className="text-body-sm text-fg-muted">Rekening aktif di sini boleh disebutkan AI kepada pelanggan untuk transfer manual. AI tidak akan menyebut rekening yang tidak terdaftar.</p>
        </div>
        {isManager && (
          <button onClick={() => setForm(EMPTY)} className="btn-primary !py-2 !px-4 text-body-sm font-bold">
            + Tambah Rekening
          </button>
        )}
      </div>

      {banks === null ? (
        <div className="text-fg-muted">Memuat...</div>
      ) : banks.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-line text-center text-fg-muted">Belum ada rekening. Tambahkan rekening agar AI dapat memberi tahu pelanggan tujuan transfer.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banks.map((b) => (
            <div key={b.id} className={`bg-white p-5 rounded-2xl border border-line ${b.is_active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-label font-bold text-brand uppercase">{b.bank_code}</div>
                  <div className="text-heading-md font-bold text-ink font-mono">{b.account_number}</div>
                  <div className="text-body-sm text-fg-muted">a.n. {b.account_holder}{b.branch_office ? ` • ${b.branch_office}` : ""}</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-caption font-bold ${b.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"}`}>{b.is_active ? "Aktif" : "Nonaktif"}</span>
              </div>
              {b.transfer_instruction && <p className="mt-3 text-label text-fg-muted">{b.transfer_instruction}</p>}
              {isManager && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-line">
                  <button onClick={() => setForm({ ...EMPTY, ...b, branch_office: b.branch_office || "", transfer_instruction: b.transfer_instruction || "" })} className="px-2.5 py-1 text-caption font-bold text-brand bg-brand-soft rounded-lg border-none cursor-pointer">Ubah</button>
                  <button onClick={() => toggle(b)} className="px-2.5 py-1 text-caption font-bold text-ink bg-canvas rounded-lg border border-line cursor-pointer">{b.is_active ? "Nonaktifkan" : "Aktifkan"}</button>
                  {confirmId === b.id ? (
                    <button onClick={() => remove(b.id)} className="px-2.5 py-1 text-caption font-bold text-white bg-red-600 rounded-lg border-none cursor-pointer">Yakin hapus?</button>
                  ) : (
                    <button onClick={() => setConfirmId(b.id)} className="px-2.5 py-1 text-caption font-bold text-red-600 bg-transparent rounded-lg border-none cursor-pointer">Hapus</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-2xl border border-line animate-scale-pop flex flex-col gap-3.5 text-body-sm">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="card-title">{form.id ? "Ubah Rekening" : "Tambah Rekening"}</h3>
              <button type="button" onClick={() => setForm(null)} className="w-7 h-7 rounded-full bg-canvas flex items-center justify-center border-none cursor-pointer" aria-label="Tutup">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-ink block mb-1">Bank *</label>
                <input required maxLength={20} className={input} value={form.bank_code} onChange={(e) => setForm({ ...form, bank_code: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="font-bold text-ink block mb-1">Nomor Rekening *</label>
                <input required className={`${input} font-mono`} value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">Atas Nama *</label>
              <input required maxLength={150} className={input} value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} />
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">Cabang</label>
              <input maxLength={100} className={input} value={form.branch_office} onChange={(e) => setForm({ ...form, branch_office: e.target.value })} />
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">Instruksi transfer</label>
              <textarea rows={2} maxLength={2000} className={input} value={form.transfer_instruction} onChange={(e) => setForm({ ...form, transfer_instruction: e.target.value })} placeholder="Contoh: kirim bukti transfer ke chat ini" />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button type="button" onClick={() => setForm(null)} className="btn-outline !py-2 !px-4">Batal</button>
              <button type="submit" className="btn-primary !py-2 !px-5 font-bold">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
