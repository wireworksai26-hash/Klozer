"use client";
import { useDashboard } from "@/context/DashboardContext";
import Icon from "@/components/icons/Icon";
import Button, { Spinner } from "./Button";

/** Nothing here yet: say why, and give the one action that fills it. */
export function EmptyState({ icon = "inbox", title, body, action }) {
  return (
    <div className="flex flex-col items-center text-center max-w-[380px] mx-auto py-10 px-4">
      <div className="w-11 h-11 rounded-xl bg-brand-soft text-brand flex items-center justify-center mb-3">
        <Icon name={icon} className="w-5 h-5" />
      </div>
      <div className="font-bold text-fg">{title}</div>
      {body ? <p className="text-label text-fg-muted mt-1">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** The request failed: show the server's reason and let the user try again. */
export function ErrorState({ error, onRetry }) {
  const { t } = useDashboard();
  return (
    <div role="alert" className="flex flex-col items-center text-center max-w-[420px] mx-auto py-10 px-4">
      <div className="w-11 h-11 rounded-xl bg-danger-50 text-danger-700 flex items-center justify-center mb-3">
        <Icon name="alert" className="w-5 h-5" />
      </div>
      <div className="font-bold text-fg">{t("Data tidak bisa dimuat")}</div>
      <p className="text-label text-fg-muted mt-1">{error?.message || t("Terjadi kesalahan.")}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon="history" className="mt-4" onClick={onRetry}>
          {t("Coba lagi")}
        </Button>
      ) : null}
    </div>
  );
}

/** A short, honest loading line. The thing being loaded is named so the wait makes sense. */
export function LoadingState({ label }) {
  const { t } = useDashboard();
  return (
    <div role="status" className="flex items-center justify-center gap-2.5 py-10 text-body-sm text-fg-muted">
      <Spinner />
      <span>{label || t("Memuat...")}</span>
    </div>
  );
}

/**
 * The three states of a screen that loads data, so a page stays short: loading, then error, then `children(data)`.
 * @param {{ data: any, error: any, reload: Function }} query the result of useApi
 */
export function Async({ query, loadingLabel, children }) {
  if (query.error && !query.data) return <ErrorState error={query.error} onRetry={query.reload} />;
  if (!query.data) return <LoadingState label={loadingLabel} />;
  return children(query.data);
}
