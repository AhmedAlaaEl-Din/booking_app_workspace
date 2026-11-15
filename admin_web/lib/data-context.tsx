"use client";

// Live Firestore data for the dashboard pages. Mounted only after the admin
// check passed, so nobody else ever starts these queries.
import { createContext, useContext, useEffect, useState } from "react";

import { friendlyError } from "./errors";
import { watchBookings, watchServices, watchUsers } from "./firestore";
import type { AppUser, Booking, Service } from "./types";

/** One live list: loading until the first snapshot, then data or an error. */
export type Live<T> =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; data: T };

type DataContextValue = {
  bookings: Live<Booking[]>;
  services: Live<Service[]>;
  users: Live<Map<string, AppUser>>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Live<Booking[]>>({
    state: "loading",
  });
  const [services, setServices] = useState<Live<Service[]>>({
    state: "loading",
  });
  const [users, setUsers] = useState<Live<Map<string, AppUser>>>({
    state: "loading",
  });

  useEffect(() => {
    // onSnapshot sends the current data first, then again on every change
    // (by anyone: the mobile app, the console, another admin tab).
    const stops = [
      watchBookings(
        (data) => setBookings({ state: "ready", data }),
        (e) => setBookings({ state: "error", message: friendlyError(e) }),
      ),
      watchServices(
        (data) => setServices({ state: "ready", data }),
        (e) => setServices({ state: "error", message: friendlyError(e) }),
      ),
      watchUsers(
        (data) => setUsers({ state: "ready", data }),
        (e) => setUsers({ state: "error", message: friendlyError(e) }),
      ),
    ];
    // Stop listening when the dashboard closes (e.g. on sign-out).
    return () => stops.forEach((stop) => stop());
  }, []);

  return (
    <DataContext.Provider value={{ bookings, services, users }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const value = useContext(DataContext);
  if (!value) throw new Error("useData() must be used inside <DataProvider>.");
  return value;
}

/** The current time, refreshed every minute, for "today" and "upcoming". */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
