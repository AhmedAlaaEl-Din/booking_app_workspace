// All Firestore reads and writes of the dashboard.
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

import { parseStatus, slotIdFor } from "./bookings";
import { db } from "./firebase";
import type { AppUser, Booking, Service, ServiceInput } from "./types";

/** How many bookings the dashboard loads (newest appointment times first). */
export const BOOKINGS_LIMIT = 200;

// ---------- Converting documents ----------

function toBooking(id: string, data: DocumentData): Booking {
  return {
    id,
    userId: String(data.userId ?? ""),
    serviceId: String(data.serviceId ?? ""),
    serviceName: String(data.serviceName ?? ""),
    startAt: (data.startAt as Timestamp).toDate(),
    durationMinutes: Number(data.durationMinutes ?? 0),
    status: parseStatus(data.status),
  };
}

function toService(id: string, data: DocumentData): Service {
  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    durationMinutes: Number(data.durationMinutes ?? 0),
    price: Number(data.price ?? 0),
    active: data.active === true,
  };
}

function toUser(uid: string, data: DocumentData): AppUser {
  return {
    uid,
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    role: String(data.role ?? "customer"),
  };
}

// ---------- Live listeners (onSnapshot) ----------
// Each returns an "unsubscribe" function that stops listening.

type OnError = (error: unknown) => void;

/**
 * The latest bookings by appointment time, live. orderBy + limit on one
 * field needs no composite index; all other filtering happens in the browser.
 */
export function watchBookings(
  onData: (bookings: Booking[]) => void,
  onError: OnError,
) {
  const q = query(
    collection(db(), "bookings"),
    orderBy("startAt", "desc"),
    limit(BOOKINGS_LIMIT),
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toBooking(d.id, d.data()))),
    onError,
  );
}

/** All services (active and inactive), sorted by name, live. */
export function watchServices(
  onData: (services: Service[]) => void,
  onError: OnError,
) {
  return onSnapshot(
    collection(db(), "services"),
    (snap) =>
      onData(
        snap.docs
          .map((d) => toService(d.id, d.data()))
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    onError,
  );
}

/** All user profiles by uid, live. Used to show customer names and emails. */
export function watchUsers(
  onData: (users: Map<string, AppUser>) => void,
  onError: OnError,
) {
  return onSnapshot(
    collection(db(), "users"),
    (snap) =>
      onData(new Map(snap.docs.map((d) => [d.id, toUser(d.id, d.data())]))),
    onError,
  );
}

// ---------- Actions ----------

/**
 * Cancels a booking and frees its slot, in one transaction. A copy of
 * BookingRepository.cancelBooking() in the Flutter app, so the security
 * rules see exactly the same two writes.
 */
export async function cancelBooking(booking: Booking): Promise<void> {
  const firestore = db();
  const bookingRef = doc(firestore, "bookings", booking.id);
  const slotRef = doc(
    firestore,
    "slots",
    slotIdFor(booking.serviceId, booking.startAt),
  );

  await runTransaction(firestore, async (transaction) => {
    const current = await transaction.get(bookingRef);
    if (current.data()?.status !== "confirmed") return; // Already cancelled.
    const slot = await transaction.get(slotRef);

    transaction.update(bookingRef, { status: "cancelled" });
    if (slot.exists() && slot.data().bookingId === booking.id) {
      transaction.delete(slotRef);
    }
  });
}

/** Adds a service with an automatic ID. */
export async function addService(input: ServiceInput): Promise<void> {
  await addDoc(collection(db(), "services"), input);
}

/** Saves all editable fields of a service. */
export async function updateService(
  id: string,
  input: ServiceInput,
): Promise<void> {
  await updateDoc(doc(db(), "services", id), input);
}

export async function setServiceActive(
  id: string,
  active: boolean,
): Promise<void> {
  await updateDoc(doc(db(), "services", id), { active });
}
