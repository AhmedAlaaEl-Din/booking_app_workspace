// The root layout wraps every page. It stays a Server Component (no
// "use client") and puts the AuthProvider around all pages.
import type { Metadata } from "next";

import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booking admin",
  description: "Admin dashboard for the booking app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
