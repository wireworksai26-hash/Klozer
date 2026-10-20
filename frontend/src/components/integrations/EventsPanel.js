"use client";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { Async, Card, EmptyState, SearchInput } from "@/components/ui";
import CodeBlock from "./CodeBlock";
import { groupEvents, useGroupLabel } from "./shared";

const VERIFY_SNIPPET = [
  "const crypto = require('crypto');",
  "",
  "function verifyKlozer(rawBody, header, secret) {",
  "  const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=')));",
  "  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');",
  "  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) <= 300;",
  "  const given = Buffer.from(parts.v1 || '');",
  "  const wanted = Buffer.from(expected);",
  "  return fresh && given.length === wanted.length && crypto.timingSafeEqual(given, wanted);",
  "}",
].join("\n");

function Verification() {
  const { t } = useDashboard();
  const rows = [
    [t("Header"), "X-Klozer-Signature: t=<unix>,v1=<hex>"],
    [t("Teks yang ditandatangani"), "<t>.<raw body>"],
    [t("Algoritma"), "HMAC-SHA256, hex"],
  ];
  return (
    <Card title={t("Cara memverifikasi tanda tangan")} description={t("Setiap permintaan membawa tanda tangan agar penerima tahu isinya asli dan belum diubah.")}>
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-1 gap-3 m-0">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 min-w-0">
              <dt className="text-label font-semibold text-fg">{label}</dt>
              <dd className="m-0">
                <code className="block px-3 py-2 bg-sunken border border-line rounded-xl font-mono text-label text-fg break-all">{value}</code>
              </dd>
            </div>
          ))}
        </dl>
        <ul className="m-0 pl-5 flex flex-col gap-1 text-label text-fg-muted">
          <li>{t("Pakai isi mentah permintaan, sebelum di-parse sebagai JSON.")}</li>
          <li>{t("Tolak bila t selisih lebih dari 5 menit dari waktu sekarang.")}</li>
          <li>{t("Bandingkan dengan perbandingan waktu-konstan.")}</li>
          <li>{t("X-Klozer-Event-Id sama di setiap percobaan: pakai untuk menghindari pemrosesan ganda.")}</li>
        </ul>
        <CodeBlock code={VERIFY_SNIPPET} label={t("Contoh kode Node.js untuk memverifikasi tanda tangan")} />
      </div>
    </Card>
  );
}

export default function EventsPanel({ catalog }) {
  const { t } = useDashboard();
  const groupLabel = useGroupLabel();
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="events-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="events-title" className="card-title">
            {t("Daftar event")}
          </h2>
          <SearchInput className="w-full sm:w-[280px]" aria-label={t("Cari event")} placeholder={t("Cari nama atau arti event")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Async query={catalog} loadingLabel={t("Memuat daftar event...")}>
          {(body) => {
            const filtered = body.data.filter((e) => !q || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
            const groups = groupEvents(filtered);
            if (!groups.length) {
              return (
                <div className="bg-white rounded-2xl border border-line">
                  <EmptyState icon="search" title={body.data.length ? t("Tidak ada event yang cocok") : t("Belum ada event")} body={body.data.length ? t("Coba kata lain, atau hapus pencarian untuk melihat semua event.") : undefined} />
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 gap-4">
                {groups.map((group) => (
                  <Card key={group.prefix} title={groupLabel(group.prefix)}>
                    <ul className="m-0 p-0 list-none divide-y divide-line">
                      {group.events.map((e) => (
                        <li key={e.name} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-baseline gap-x-6 gap-y-0.5">
                          <code className="font-mono text-label font-semibold text-fg break-all sm:w-[15rem] sm:flex-shrink-0">{e.name}</code>
                          <span className="text-label text-fg-muted">{e.description}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            );
          }}
        </Async>
      </section>
      <Verification />
    </div>
  );
}
