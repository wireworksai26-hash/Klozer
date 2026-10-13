"use client";
import DashboardSidebar from "./DashboardSidebar";

/**
 * SidebarNav Component (Atomic Dashboard Sidebar).
 * Re-exports/wraps DashboardSidebar with responsive drawer, brand header,
 * categorized nav links, active state detection, and role badge.
 */
export default function SidebarNav(props) {
  return <DashboardSidebar {...props} />;
}
