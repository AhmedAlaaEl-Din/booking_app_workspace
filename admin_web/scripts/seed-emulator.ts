// Fills the LOCAL Firebase Emulator Suite with made-up "Glow Salon" data.
//
//   PowerShell:
//     $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
//     $env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
//     node scripts/seed-emulator.ts
//
// Safety: it refuses to run unless both emulator variables are set and point
// at this computer (127.0.0.1 / localhost). Every request goes to those hosts,
// never to Google. All names and emails are fictional; every login works only
// inside the emulator.
//
// SEED_PROJECT_ID picks the Firestore namespace (default "demo-booking").
// Auth accounts always go to the emulator's default project, "demo-booking":
// the client SDKs (web and Android) sign in without naming a project, so the
// Auth emulator files them there. The Flutter debug app's Firestore uses the
// app's own project ID (Android ignores options passed from Dart), so the
// device run sets SEED_PROJECT_ID to it. Both stay on the local emulator.

const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST;
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const PROJECT_ID = process.env.SEED_PROJECT_ID ?? "demo-booking";
const AUTH_PROJECT_ID = "demo-booking";

function isLocal(host: string | undefined): host is string {
  return !!host && /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host);
}

if (!isLocal(FIRESTORE) || !isLocal(AUTH)) {
  console.error(
    "Refusing to seed: set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST " +
      "to the local emulators (for example 127.0.0.1:8080 and 127.0.0.1:9099).",
  );
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(PROJECT_ID)) {
  console.error("SEED_PROJECT_ID may only contain a-z, 0-9 and '-'.");
  process.exit(1);
}

const FIRESTORE_URL = `http://${FIRESTORE}`;
const AUTH_URL = `http://${AUTH}`;
const DOCS = `${FIRESTORE_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Emulator-only password for every demo account. */
export const DEMO_PASSWORD = "demo-only-password";

export const ADMIN = { name: "Mona Hassan", email: "mona@glow-salon.example" };

export const SERVICES = [
  { id: "haircut", name: "Haircut", description: "Classic cut and style", durationMinutes: 30, price: 150 },
  { id: "beard-trim", name: "Beard trim", description: "Shape and trim", durationMinutes: 20, price: 80 },
  { id: "coloring", name: "Coloring", description: "Full hair coloring", durationMinutes: 90, price: 400 },
  { id: "styling", name: "Styling", description: "Wash and blow-dry", durationMinutes: 45, price: 200 },
  { id: "manicure", name: "Manicure", description: "Shape, cuticle care and polish", durationMinutes: 40, price: 120 },
] as const;

type ServiceId = (typeof SERVICES)[number]["id"];

export const CUSTOMERS = [
  "Sara Ahmed",
  "Omar Khaled",
  "Lina Youssef",
  "Karim Nabil",
  "Yara Mostafa",
  "Hana Ali",
  "Youssef Samir",
  "Nour Adel",
] as const;

type CustomerName = (typeof CUSTOMERS)[number];

export function emailOf(name: string): string {
  return `${name.toLowerCase().replace(/ /g, ".")}@example.com`;
}

// [days from today, hour, minute, customer, service, status]
type Row = [number, number, number, CustomerName, ServiceId, "confirmed" | "cancelled"];
const BOOKINGS: Row[] = [
  [-3, 10, 0, "Yara Mostafa", "coloring", "confirmed"],
  [-2, 14, 30, "Omar Khaled", "beard-trim", "confirmed"],
  [-1, 12, 0, "Karim Nabil", "haircut", "cancelled"],
  [0, 9, 0, "Omar Khaled", "haircut", "confirmed"],
  [0, 10, 30, "Lina Youssef", "coloring", "confirmed"],
  [0, 15, 30, "Hana Ali", "styling", "cancelled"],
  [1, 9, 30, "Sara Ahmed", "haircut", "confirmed"],
  [1, 11, 0, "Youssef Samir", "beard-trim", "confirmed"],
  [1, 14, 0, "Nour Adel", "manicure", "confirmed"],
  [2, 13, 30, "Sara Ahmed", "styling", "confirmed"],
  [3, 16, 0, "Hana Ali", "coloring", "cancelled"],
  [5, 11, 0, "Lina Youssef", "haircut", "confirmed"],
];

function at(days: number, hour: number, minute: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, minute);
}

type Value =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string };

function encode(v: string | number | boolean | Date): Value {
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
}

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    // "owner" is the emulator's built-in admin token (skips the rules, like
    // the Firebase console). It is meaningless to real Firebase.
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function put(path: string, data: Record<string, string | number | boolean | Date>) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode(v)]));
  await call("PATCH", `${DOCS}/${path}`, { fields });
}

async function createAccount(email: string): Promise<string> {
  const { localId } = await call(
    "POST",
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/projects/${AUTH_PROJECT_ID}/accounts`,
    { email, password: DEMO_PASSWORD },
  );
  return localId;
}

export async function seed() {
  // Start from an empty emulator every time.
  await call("DELETE", `${FIRESTORE_URL}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`);
  await call("DELETE", `${AUTH_URL}/emulator/v1/projects/${AUTH_PROJECT_ID}/accounts`);

  const created = at(-30, 9, 0);
  const adminUid = await createAccount(ADMIN.email);
  await put(`users/${adminUid}`, { name: ADMIN.name, email: ADMIN.email, role: "admin", createdAt: created });

  const uids = new Map<CustomerName, string>();
  for (const name of CUSTOMERS) {
    const email = emailOf(name);
    const uid = await createAccount(email);
    uids.set(name, uid);
    await put(`users/${uid}`, { name, email, role: "customer", createdAt: created });
  }

  for (const { id, ...service } of SERVICES) {
    await put(`services/${id}`, { ...service, active: true });
  }

  let n = 0;
  for (const [days, hour, minute, customer, serviceId, status] of BOOKINGS) {
    const service = SERVICES.find((s) => s.id === serviceId)!;
    const startAt = at(days, hour, minute);
    const bookingId = `seed-booking-${String(++n).padStart(2, "0")}`;
    await put(`bookings/${bookingId}`, {
      userId: uids.get(customer)!,
      serviceId,
      serviceName: service.name,
      startAt,
      durationMinutes: service.durationMinutes,
      status,
      createdAt: at(days - 3, 18, 0),
    });
    // Like the app: a confirmed booking holds its slot; a cancelled one doesn't.
    if (status === "confirmed") {
      await put(`slots/${serviceId}_${startAt.getTime()}`, { serviceId, startAt, bookingId });
    }
  }

  return { project: PROJECT_ID, admin: 1, customers: CUSTOMERS.length, services: SERVICES.length, bookings: BOOKINGS.length };
}

// Run directly (not when imported by a test).
if (process.argv[1]?.endsWith("seed-emulator.ts")) {
  seed()
    .then((r) => console.log(`Seeded emulator project "${r.project}":`, r))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
