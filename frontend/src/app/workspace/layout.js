"use client";
import { Suspense } from "react";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

function Loading() {
  const { t } = useDashboard();
  return <div className="p-8 text-center text-fg-muted" suppressHydrationWarning>{t("Memuat Workspace...")}</div>;
}

// `lean`: this area reads its own data from /workspace, not one business's contacts and orders.
export default function WorkspaceLayout({ children }) {
  return (
    <DashboardProvider lean>
      <Suspense fallback={<Loading />}>
        <WorkspaceShell>{children}</WorkspaceShell>
      </Suspense>
    </DashboardProvider>
  );
}
