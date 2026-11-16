// The demo customer, acting through the Firebase Web SDK from the test (not
// the browser). It books a slot exactly like the Flutter app does, so the
// dashboard has a real booking to show and cancel.
import { deleteApp, initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";

export type LiveService = { id: string; name: string; durationMinutes: number };

export async function connectAsCustomer(email: string, password: string) {
  const app = initializeApp(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    `e2e-customer-${Date.now()}`,
  );
  const auth = getAuth(app);
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const db = getFirestore(app);

  return {
    /** Finds a service by its exact name (customers may read services). */
    async findService(name: string): Promise<LiveService> {
      const snap = await getDocs(
        query(collection(db, "services"), where("name", "==", name)),
      );
      if (snap.empty) throw new Error(`Service "${name}" not found.`);
      const d = snap.docs[0];
      return {
        id: d.id,
        name: d.data().name,
        durationMinutes: d.data().durationMinutes,
      };
    },

    /**
     * Books a free time 13 days from today (the app allows 14 days), between
     * 09:00 and 17:00 local time, with the same transaction as the app's
     * BookingRepository.createBooking().
     */
    async createBooking(service: LiveService) {
      const today = new Date();
      const starts: Date[] = [];
      for (let minutes = 0; ; minutes += 30) {
        const start = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 13,
          9,
          minutes,
        );
        const closing = new Date(start);
        closing.setHours(17, 0, 0, 0);
        if (start.getTime() + service.durationMinutes * 60_000 > closing.getTime())
          break;
        starts.push(start);
      }
      starts.sort(() => Math.random() - 0.5); // Try the times in random order.

      for (const startAt of starts) {
        const bookingRef = doc(collection(db, "bookings"));
        const slotId = `${service.id}_${startAt.getTime()}`;
        const slotRef = doc(db, "slots", slotId);
        const booked = await runTransaction(db, async (tx) => {
          if ((await tx.get(slotRef)).exists()) return false;
          tx.set(bookingRef, {
            userId: user.uid,
            serviceId: service.id,
            serviceName: service.name,
            startAt: Timestamp.fromDate(startAt),
            durationMinutes: service.durationMinutes,
            status: "confirmed",
            createdAt: serverTimestamp(),
          });
          tx.set(slotRef, {
            serviceId: service.id,
            startAt: Timestamp.fromDate(startAt),
            bookingId: bookingRef.id,
          });
          return true;
        });
        if (booked) return { bookingId: bookingRef.id, slotId, startAt };
      }
      throw new Error("No free time left 13 days from now for the test service.");
    },

    async bookingStatus(bookingId: string): Promise<string | undefined> {
      return (await getDoc(doc(db, "bookings", bookingId))).data()?.status;
    },

    async slotExists(slotId: string): Promise<boolean> {
      return (await getDoc(doc(db, "slots", slotId))).exists();
    },

    async close() {
      await deleteApp(app);
    },
  };
}
