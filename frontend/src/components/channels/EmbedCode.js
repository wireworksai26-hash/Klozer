"use client";
import { useDashboard } from "@/context/DashboardContext";
import { CopyButton } from "@/components/ui";

/** The script tag that puts the web chat on a shop's site, with a copy button. */
export default function EmbedCode({ snippet }) {
  const { t } = useDashboard();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label text-fg-muted">{t("Tempel kode ini sebelum </body> di setiap halaman yang perlu kotak chat.")}</p>
      <pre className="bg-sunken border border-line rounded-xl p-3.5 text-caption font-mono text-fg whitespace-pre-wrap break-all">{snippet}</pre>
      <div>
        <CopyButton value={snippet} label={t("Salin kode")} />
      </div>
    </div>
  );
}
