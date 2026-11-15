"use client";

// The guard around every dashboard page (used by app/(dashboard)/layout.tsx):
// - still checking  -> spinner
// - not an admin    -> redirect to /login (nothing else is rendered)
// - admin           -> start the live data and show the page
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { Spinner } from "@/components/state-views";
import { useAuth } from "@/lib/auth-context";
import { DataProvider } from "@/lib/data-context";

export function AdminGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "signedOut") router.replace("/login");
  }, [status, router]);

  if (status !== "admin") {
    return <Spinner label="Checking your access…" />;
  }

  return (
    <DataProvider>
      <AppShell>{children}</AppShell>
    </DataProvider>
  );
}
