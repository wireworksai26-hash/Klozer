"use client";
import { Fragment, useMemo, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useFormat } from "@/hooks/useFormat";
import Icon from "@/components/icons/Icon";
import { Badge, Button, EmptyState, ErrorState, LoadingState, SelectField, TableShell } from "@/components/ui";
import KeyValue from "./KeyValue";
import { AGENT_TOOL_NAMES, useAgentText } from "./labels";
import { usePagedList } from "./usePagedList";

const ALL_TOOLS = ["check_stock", "lookup_order", "create_task", "handoff_to_human", ...AGENT_TOOL_NAMES];

/** What agents did besides answering: each tool request with its outcome. A row opens to show what was sent and received. */
export default function ToolActivity({ agents }) {
  const { t } = useDashboard();
  const { dateTime, number } = useFormat();
  const text = useAgentText();
  const [filters, setFilters] = useState({ tool: "", ok: "", agentId: "" });
  const [open, setOpen] = useState(null);
  const query = useMemo(() => ({ tool: filters.tool, ok: filters.ok, agentId: filters.agentId }), [filters]);
  const list = usePagedList("/ai/agents/tool-calls", { query });
  const setFilter = (key) => (e) => {
    setOpen(null);
    setFilters((f) => ({ ...f, [key]: e.target.value }));
  };
  const filtered = Boolean(filters.tool || filters.ok || filters.agentId);

  const filterBar = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-line rounded-2xl p-4">
      <SelectField label={t("Alat")} value={filters.tool} onChange={setFilter("tool")} placeholder={t("Semua alat")} options={ALL_TOOLS.map((name) => ({ value: name, label: text.toolLabel(name) }))} />
      <SelectField
        label={t("Hasil")}
        value={filters.ok}
        onChange={setFilter("ok")}
        placeholder={t("Semua hasil")}
        options={[
          { value: "true", label: t("Berhasil") },
          { value: "false", label: t("Gagal atau ditolak") },
        ]}
      />
      <SelectField label={t("Agen")} value={filters.agentId} onChange={setFilter("agentId")} placeholder={t("Semua agen")} options={agents.map((a) => ({ value: a.id, label: a.name }))} />
    </div>
  );

  let body;
  if (list.error && !list.items.length) body = <ErrorState error={list.error} onRetry={list.reload} />;
  else if (list.loading) body = <LoadingState label={t("Memuat aktivitas alat...")} />;
  else if (!list.items.length) {
    body = (
      <div className="bg-white rounded-2xl border border-line">
        <EmptyState
          icon="wrench"
          title={filtered ? t("Tidak ada aktivitas yang cocok") : t("Belum ada aktivitas alat")}
          body={filtered ? t("Coba ubah atau kosongkan filter.") : t("Saat agen memakai alat (cek stok, buat tugas, dan sebagainya), setiap permintaannya dicatat di sini. Pilih alat di bagian Kemampuan pada agen.")}
        />
      </div>
    );
  } else {
    body = (
      <>
        <TableShell>
          <thead>
            <tr className="bg-canvas border-b border-line text-label font-bold text-fg-muted">
              <th scope="col" className="py-3 px-4">{t("Waktu")}</th>
              <th scope="col" className="py-3 px-4">{t("Agen")}</th>
              <th scope="col" className="py-3 px-4">{t("Alat")}</th>
              <th scope="col" className="py-3 px-4">{t("Kontak")}</th>
              <th scope="col" className="py-3 px-4">{t("Hasil")}</th>
              <th scope="col" className="py-3 px-4 text-right">{t("Lama")}</th>
              <th scope="col" className="py-3 px-4">
                <span className="sr-only">{t("Rincian")}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.items.map((row) => {
              const expanded = open === row.id;
              return (
                <Fragment key={row.id}>
                  <tr className="hover:bg-soft align-top">
                    <td className="py-3 px-4 text-fg-muted whitespace-nowrap">{dateTime(row.createdAt)}</td>
                    <td className="py-3 px-4 text-fg">{row.agentName || "-"}</td>
                    <td className="py-3 px-4 font-semibold text-fg">{text.toolLabel(row.tool)}</td>
                    <td className="py-3 px-4 text-fg-muted">{row.leadName || "-"}</td>
                    <td className="py-3 px-4 min-w-[10rem]">
                      <Badge tone={row.ok ? "success" : "danger"}>{row.ok ? t("Berhasil") : t("Gagal")}</Badge>
                      {!row.ok && row.error ? <div className="text-label text-danger-700 mt-1 break-words">{row.error}</div> : null}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-fg-muted whitespace-nowrap">{row.durationMs === null || row.durationMs === undefined ? "-" : t("{ms} ms", { ms: number(row.durationMs) })}</td>
                    <td className="py-2 px-4 text-right">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`tool-call-${row.id}`}
                        onClick={() => setOpen(expanded ? null : row.id)}
                        className="inline-flex items-center gap-1 min-h-11 sm:min-h-9 px-2 bg-transparent border-none cursor-pointer text-label font-semibold text-brand focus-visible:outline-2 focus-visible:outline-brand"
                      >
                        {expanded ? t("Tutup rincian") : t("Lihat rincian")}
                        <Icon name="chevronDown" className={`w-3.5 h-3.5 ${expanded ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr id={`tool-call-${row.id}`} className="bg-soft">
                      <td colSpan={7} className="py-4 px-4">
                        <div className="sticky left-0 max-w-[calc(100vw-5rem)] md:max-w-none grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-label font-bold text-fg mb-2">{t("Yang dikirim ke alat")}</h4>
                            <KeyValue value={row.args} emptyLabel={t("Tidak ada data.")} />
                          </div>
                          <div>
                            <h4 className="text-label font-bold text-fg mb-2">{t("Hasil dari alat")}</h4>
                            <KeyValue value={row.result} emptyLabel={t("Tidak ada data.")} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </TableShell>
        {list.error ? <p role="alert" className="text-label text-danger-700">{list.error.message}</p> : null}
        {list.hasMore ? (
          <div className="flex justify-center">
            <Button variant="secondary" loading={list.loadingMore} onClick={list.loadMore}>
              {t("Muat lebih banyak")}
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {filterBar}
      {body}
    </div>
  );
}
