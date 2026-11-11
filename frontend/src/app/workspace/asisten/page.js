"use client";
import { useDashboard } from "@/context/DashboardContext";
import AssistantTab from "@/components/workspace/AssistantTab";

export default function WorkspaceAssistantPage() {
  const { currentUser } = useDashboard();
  return currentUser?.workspace ? <AssistantTab workspace={currentUser.workspace} /> : null;
}
