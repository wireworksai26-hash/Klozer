"use client";
import { useDashboard } from "@/context/DashboardContext";
import PicDeliveries from "@/components/delivery/PicDeliveries";
import TeamDeliveries from "@/components/delivery/TeamDeliveries";

/** A delivery PIC sees their own deliveries to work through; the team sees the whole shop's. */
export default function DeliveriesPage() {
  const { role } = useDashboard();
  return role === "pic" ? <PicDeliveries /> : <TeamDeliveries />;
}
