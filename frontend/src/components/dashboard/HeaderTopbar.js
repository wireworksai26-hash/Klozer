"use client";
import DashboardHeader from "./DashboardHeader";

/**
 * HeaderTopbar Component (Atomic Dashboard Topbar).
 * Re-exports/wraps DashboardHeader with full top navigation, quick actions,
 * status indicator, language switcher, and NotificationCenter.
 */
export default function HeaderTopbar(props) {
  return <DashboardHeader {...props} />;
}
