// Security rules tests, run against the LOCAL Firestore emulator only.
//
//   npm run test:rules                 -> ../firestore.rules (what is deployed)
//   npm run test:rules:proposed        -> ../firestore.rules.proposed
//
// The "hardening" block documents three gaps in the current rules: it checks
// that the gap exists in firestore.rules and that the proposed file closes it.
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const HOST = process.env.FIRESTORE_EMULATOR_HOST;
if (!HOST || !/^(127\.0\.0\.1|localhost):\d+$/.test(HOST)) {
  throw new Error(
    "Refusing to run: set FIRESTORE_EMULATOR_HOST to the local emulator (e.g. 127.0.0.1:8080).",
  );
}

const RULES_FILE = path.resolve(__dirname, "../..", process.env.RULES_FILE ?? "../firestore.rules");
const PROPOSED = RULES_FILE.endsWith(".proposed");
const [host, port] = HOST.split(":");

let env: RulesTestEnvironment;

const SERVICE = { name: "Haircut", description: "Cut", durationMinutes: 30, price: 150, active: true };

/** A slot start N days from now at 10:00 local time (on a 30-minute boundary). */
function startIn(days: number, hour = 10, minute = 0): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, hour, minute);
}
const slotId = (serviceId: string, at: Date) => `${serviceId}_${at.getTime()}`;

const A_START = startIn(2);
const B_START = startIn(3);

function as(uid: string | null, email?: string): Firestore {
  return (
    uid === null
      ? env.unauthenticatedContext()
      : env.authenticatedContext(uid, { email: email ?? `${uid}@example.com` })
  ).firestore() as unknown as Firestore;
}

/** The app's booking transaction, as a batch: booking + its slot. */
function bookBatch(db: Firestore, uid: string, start: Date, id = `new-${uid}`) {
  const batch = writeBatch(db);
  batch.set(doc(db, "bookings", id), {
    userId: uid,
    serviceId: "haircut",
    serviceName: "Haircut",
    startAt: Timestamp.fromDate(start),
    durationMinutes: 30,
    status: "confirmed",
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, "slots", slotId("haircut", start)), {
    serviceId: "haircut",
    startAt: Timestamp.fromDate(start),
    bookingId: id,
  });
  return batch;
}

/** Cancel + free the slot, like the app and the dashboard do. */
function cancelBatch(db: Firestore, bookingId: string, start: Date) {
  const batch = writeBatch(db);
  batch.update(doc(db, "bookings", bookingId), { status: "cancelled" });
  batch.delete(doc(db, "slots", slotId("haircut", start)));
  return batch;
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-rules-test",
    firestore: { host, port: Number(port), rules: readFileSync(RULES_FILE, "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    const created = Timestamp.fromDate(startIn(-30));
    await setDoc(doc(db, "users/alice"), { name: "Alice", email: "alice@example.com", role: "customer", createdAt: created });
    await setDoc(doc(db, "users/bob"), { name: "Bob", email: "bob@example.com", role: "customer", createdAt: created });
    await setDoc(doc(db, "users/mona"), { name: "Mona", email: "mona@glow-salon.example", role: "admin", createdAt: created });
    await setDoc(doc(db, "services/haircut"), SERVICE);
    for (const [id, uid, start] of [
      ["booking-a", "alice", A_START],
      ["booking-b", "bob", B_START],
    ] as const) {
      await setDoc(doc(db, "bookings", id), {
        userId: uid,
        serviceId: "haircut",
        serviceName: "Haircut",
        startAt: Timestamp.fromDate(start),
        durationMinutes: 30,
        status: "confirmed",
        createdAt: created,
      });
      await setDoc(doc(db, "slots", slotId("haircut", start)), {
        serviceId: "haircut",
        startAt: Timestamp.fromDate(start),
        bookingId: id,
      });
    }
  });
});

describe(`rules: ${path.basename(RULES_FILE)}`, () => {
  describe("unauthenticated", () => {
    it("cannot read anything", async () => {
      const db = as(null);
      await assertFails(getDoc(doc(db, "services/haircut")));
      await assertFails(getDoc(doc(db, "bookings/booking-a")));
      await assertFails(getDoc(doc(db, "users/alice")));
      await assertFails(getDoc(doc(db, `slots/${slotId("haircut", A_START)}`)));
      await assertFails(getDocs(collection(db, "bookings")));
    });

    it("cannot write anything", async () => {
      const db = as(null);
      await assertFails(setDoc(doc(db, "users/ghost"), { name: "x", email: "x@example.com", role: "customer", createdAt: serverTimestamp() }));
      await assertFails(setDoc(doc(db, "services/new"), SERVICE));
      await assertFails(updateDoc(doc(db, "bookings/booking-a"), { status: "cancelled" }));
      await assertFails(bookBatch(db, "ghost", startIn(4)).commit());
    });
  });

  describe("customer", () => {
    it("can read their own booking and profile", async () => {
      const db = as("alice");
      await assertSucceeds(getDoc(doc(db, "bookings/booking-a")));
      await assertSucceeds(getDoc(doc(db, "users/alice")));
      await assertSucceeds(getDocs(query(collection(db, "bookings"), where("userId", "==", "alice"))));
    });

    it("cannot read another customer's booking or profile", async () => {
      const db = as("alice");
      await assertFails(getDoc(doc(db, "bookings/booking-b")));
      await assertFails(getDoc(doc(db, "users/bob")));
      await assertFails(getDocs(collection(db, "bookings"))); // Unfiltered list.
    });

    it("cannot make themselves admin", async () => {
      await assertFails(updateDoc(doc(as("alice"), "users/alice"), { role: "admin" }));
      await assertFails(
        setDoc(doc(as("newbie"), "users/newbie"), {
          name: "New", email: "newbie@example.com", role: "admin", createdAt: serverTimestamp(),
        }),
      );
    });

    it("can create their own customer profile once", async () => {
      const db = as("newbie");
      await assertSucceeds(
        setDoc(doc(db, "users/newbie"), {
          name: "New", email: "newbie@example.com", role: "customer", createdAt: serverTimestamp(),
        }),
      );
    });

    it("cannot add, edit or delete services", async () => {
      const db = as("alice");
      await assertFails(setDoc(doc(db, "services/new"), SERVICE));
      await assertFails(updateDoc(doc(db, "services/haircut"), { price: 1 }));
      await assertFails(deleteDoc(doc(db, "services/haircut")));
    });

    it("cannot cancel someone else's booking", async () => {
      await assertFails(cancelBatch(as("alice"), "booking-b", B_START).commit());
      await assertFails(updateDoc(doc(as("alice"), "bookings/booking-b"), { status: "cancelled" }));
    });

    it("can book a free slot and cancel their own booking", async () => {
      const db = as("alice");
      await assertSucceeds(bookBatch(db, "alice", startIn(4)).commit());
      await assertSucceeds(cancelBatch(db, "booking-a", A_START).commit());
    });

    it("cannot cancel without freeing the slot", async () => {
      await assertFails(updateDoc(doc(as("alice"), "bookings/booking-a"), { status: "cancelled" }));
    });

    it("cannot double-book a taken slot", async () => {
      await assertFails(bookBatch(as("alice"), "alice", B_START).commit());
    });

    it("cannot book in someone else's name", async () => {
      await assertFails(bookBatch(as("alice"), "bob", startIn(4)).commit());
    });

    it("cannot delete bookings", async () => {
      await assertFails(deleteDoc(doc(as("alice"), "bookings/booking-a")));
    });
  });

  describe("admin", () => {
    it("can read all bookings and profiles", async () => {
      const db = as("mona", "mona@glow-salon.example");
      const all = await assertSucceeds(getDocs(collection(db, "bookings")));
      expect(all.size).toBe(2);
      await assertSucceeds(getDoc(doc(db, "users/bob")));
    });

    it("can cancel any booking and free its slot", async () => {
      const db = as("mona", "mona@glow-salon.example");
      await assertSucceeds(cancelBatch(db, "booking-b", B_START).commit());
    });

    it("cannot cancel without freeing the slot", async () => {
      await assertFails(updateDoc(doc(as("mona"), "bookings/booking-b"), { status: "cancelled" }));
    });

    it("can add and edit services, but only with valid data", async () => {
      const db = as("mona", "mona@glow-salon.example");
      await assertSucceeds(updateDoc(doc(db, "services/haircut"), { price: 175 }));
      await assertSucceeds(setDoc(doc(db, "services/manicure"), { ...SERVICE, name: "Manicure" }));
      await assertFails(updateDoc(doc(db, "services/haircut"), { price: -5 }));
      await assertFails(updateDoc(doc(db, "services/haircut"), { hacked: true }));
    });

    it("cannot delete services or bookings", async () => {
      const db = as("mona", "mona@glow-salon.example");
      await assertFails(deleteDoc(doc(db, "services/haircut")));
      await assertFails(deleteDoc(doc(db, "bookings/booking-a")));
    });

    it("cannot promote a customer to admin", async () => {
      await assertFails(updateDoc(doc(as("mona"), "users/bob"), { role: "admin" }));
    });
  });

  // Gaps found while writing these tests. With the current rules the write is
  // ALLOWED (the gap exists); firestore.rules.proposed must deny it.
  describe("hardening (gaps in firestore.rules, fixed in firestore.rules.proposed)", () => {
    const expectGapClosed = (p: Promise<unknown>) => (PROPOSED ? assertFails(p) : assertSucceeds(p));

    it("booking more than 14 days ahead", async () => {
      await expectGapClosed(bookBatch(as("alice"), "alice", startIn(60)).commit());
    });

    it("booking at a time that is not on a 30-minute boundary", async () => {
      await expectGapClosed(bookBatch(as("alice"), "alice", startIn(4, 10, 7)).commit());
    });

    it("profile with extra fields or someone else's email", async () => {
      await expectGapClosed(
        setDoc(doc(as("newbie", "newbie@example.com"), "users/newbie"), {
          name: "New", email: "mona@glow-salon.example", role: "customer", createdAt: serverTimestamp(), isVip: true,
        }),
      );
    });
  });
});
