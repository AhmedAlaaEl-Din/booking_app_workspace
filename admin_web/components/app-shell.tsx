"use client";

// The frame around every dashboard page: a sidebar on wide screens, a top
// bar with a Menu button on phones.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/lib/auth-context";

const links = [
  { href: "/", label: "Overview" },
  { href: "/bookings", label: "Bookings" },
  { href: "/services", label: "Services" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 font-medium ${
              active
                ? "bg-teal-50 text-teal-800"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  const account = (
    <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
      <p className="truncate text-slate-500" title={user?.email ?? ""}>
        {user?.email}
      </p>
      <button type="button" onClick={signOut} className="btn-secondary w-full">
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar (md = 768px and wider) */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 md:flex">
        <div>
          <p className="mb-6 px-3 text-lg font-semibold">Booking admin</p>
          {nav}
        </div>
        {account}
      </aside>

      {/* Mobile top bar and menu */}
      <header className="border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-semibold">Booking admin</p>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            className="btn-secondary"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
        {menuOpen && (
          <div className="space-y-4 px-4 pb-4">
            {nav}
            {account}
          </div>
        )}
      </header>

      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
