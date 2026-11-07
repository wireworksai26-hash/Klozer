"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAction } from "@/hooks/useApi";
import { api } from "@/utils/api";
import { Button, Modal, TextField } from "@/components/ui";
import { QRIS_ACCEPT, fileToBase64, qrisFileProblem } from "./qrisFile";

/** What the server says about reading the code in the picture, as one line for the owner. */
export function qrisReadNotice(read, t) {
  return read?.ok
    ? { type: "success", text: t("QRIS terbaca atas nama {name}. Untuk setiap pesanan, nominalnya diisi otomatis.", { name: read.merchantName || "-" }) }
    : { type: "error", text: `${t("QRIS tersimpan, tetapi belum bisa dibuat dinamis.")} ${read?.reason || ""}`.trim() };
}

/**
 * Add the shop's own QRIS merchant (GoPay Merchant and the like): its name, an id, and the static QRIS picture. Klozer
 * reads the code in the picture and, for each order, makes a copy with the order total filled in.
 */
export default function QrisMerchantModal({ onClose, onDone }) {
  const { t, notify } = useDashboard();
  const { run, pending } = useAction();
  const [name, setName] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [file, setFile] = useState(null);
  const [problem, setProblem] = useState("");

  const pick = (e) => {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setProblem(picked ? qrisFileProblem(picked) || "" : "");
  };

  const submit = async (e) => {
    e.preventDefault();
    const issue = qrisFileProblem(file);
    if (issue) return setProblem(issue);
    const created = await run(() =>
      api.post("/bank-accounts", {
        bank_code: "QRIS",
        account_number: merchantId.trim() || "QRIS",
        account_holder: name.trim(),
        transfer_instruction: "Bayar dengan scan QRIS, nominal sudah terisi. Setelah bayar, kirim bukti pembayaran ke chat ini.",
      })
    );
    if (!created.ok) return;
    const uploaded = await run(async () => api.put(`/bank-accounts/${created.data.data.id}/qris`, { fileBase64: await fileToBase64(file), fileName: file.name }));
    onDone();
    if (!uploaded.ok) {
      notify("error", t("Merchant tersimpan, tetapi gambarnya belum terunggah. Buka kartunya lalu unggah ulang."));
      return;
    }
    const notice = qrisReadNotice(uploaded.data.qrisRead, t);
    notify(notice.type, notice.text);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Tambah QRIS Merchant")}
      description={t("Untuk GoPay Merchant atau QRIS toko lain. Unggah QRIS statis, nanti dijadikan dinamis per pesanan.")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("Batal")}
          </Button>
          <Button loading={pending} disabled={!name.trim() || !file || Boolean(problem)} onClick={submit}>
            {t("Simpan dan unggah")}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("Nama merchant")} hint={t("Seperti tertulis di aplikasi GoPay Merchant atau di QRIS.")} required maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label={t("ID merchant atau nomor GoPay (opsional)")} maxLength={50} value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
        <div>
          <label htmlFor="qris-file" className="text-label font-semibold text-fg block mb-1">{t("Gambar QRIS statis")}</label>
          <input id="qris-file" type="file" accept={QRIS_ACCEPT} onChange={pick} className="block w-full text-body-sm" />
          <p className="text-caption text-fg-muted mt-1">{t("PNG atau JPG yang jelas dan tidak terpotong, maksimal 1,5 MB. Unduh dari aplikasi GoPay Merchant.")}</p>
          {problem ? <p role="alert" className="text-caption text-danger-700 mt-1">{t(problem)}</p> : null}
        </div>
        <div className="rounded-xl bg-sunken border border-line p-3.5 text-caption text-fg-muted flex flex-col gap-1">
          <span className="font-bold text-fg">{t("Cara kerjanya")}</span>
          <span>{t("Klozer membaca kode di gambar, lalu untuk setiap pesanan membuat QRIS baru dengan nominal pesanan sudah terisi. Pembeli tinggal scan dan bayar.")}</span>
          <span>{t("Uangnya masuk langsung ke akun merchant Anda. GoPay Merchant tidak memberi kabar ke Klozer, jadi pembayaran dikonfirmasi tim setelah pembeli mengirim bukti.")}</span>
        </div>
      </form>
    </Modal>
  );
}
