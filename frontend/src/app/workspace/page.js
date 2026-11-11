"use client";
import { useDashboard } from "@/context/DashboardContext";
import OverviewTab from "@/components/workspace/OverviewTab";

export default function WorkspaceHomePage() {
  const { currentUser } = useDashboard();
  return currentUser?.workspace ? <OverviewTab workspace={currentUser.workspace} /> : null;
}
