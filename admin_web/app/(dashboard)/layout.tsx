// Layout for the dashboard pages. "(dashboard)" in brackets is a route group:
// it shares this layout between /, /bookings and /services without adding
// anything to the URL.
import { AdminGate } from "@/components/admin-gate";

// A Server Component (no "use client"): it only wraps the pages in the
// AdminGate, which runs in the browser and checks the role.
export default function DashboardLayout({
  children,
}: LayoutProps<"/">) {
  return <AdminGate>{children}</AdminGate>;
}
