// Fills the LOCAL Firebase emulators with made-up salon data for the demo
// video. Talks only to 127.0.0.1; the "demo-" project ID means the emulators
// can never reach a real Firebase project. All names and emails are fictional.

export const PROJECT_ID = "demo-booking";
export const AUTH_URL = "http://127.0.0.1:9399";
export const FIRESTORE_HOST = "127.0.0.1:8399";
const FIRESTORE_URL = `http://${FIRESTORE_HOST}`;
const DOCS = `${FIRESTORE_URL}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Demo-only login that exists only inside the emulator. */
export const ADMIN = {
  name: "Mona Hassan",
  email: "mona@glow-salon.example",
  password: "demo-only-password",
};

export const SERVICES = [
  { id: "haircut", name: "Haircut", description: "Classic cut and style", durationMinutes: 30, price: 150 },
  { id: "beard-trim", name: "Beard trim", description: "Shape and trim", durationMinutes: 20, price: 80 },
  { id: "coloring", name: "Coloring", description: "Full hair coloring", durationMinutes: 90, price: 400 },
  { id: "styling", name: "Styling", description: "Wash and blow-dry", durationMinutes: 45, price: 200 },
  { id: "kids-haircut", name: "Kids haircut", description: "For children under 12", durationMinutes: 25, price: 100 },
] as const;

type ServiceId = (typeof SERVICES)[number]["id"];

const CUSTOMERS = {
  sara: "Sara Ahmed",
  omar: "Omar Khaled",
  lina: "Lina Youssef",
  karim: "Karim Nabil",
  yara: "Yara Mostafa",
  hana: "Hana Ali",
  youssef: "Youssef Samir",
} as const;

type CustomerId = keyof typeof CUSTOMERS;

// [days from today, hour, minute, customer, service, status]
type Row = [number, number, number, CustomerId, ServiceId, "confirmed" | "cancelled"];
const BOOKINGS: Row[] = [
  [-2, 10, 0, "yara", "coloring", "confirmed"],
  [-2, 14, 30, "omar", "beard-trim", "confirmed"],
  [-1, 9, 30, "hana", "styling", "confirmed"],
  [-1, 12, 0, "karim", "haircut", "cancelled"],
  [0, 9, 0, "omar", "haircut", "confirmed"],
  [0, 10, 30, "lina", "coloring", "confirmed"],
  [0, 11, 30, "hana", "haircut", "cancelled"],
  [0, 13, 0, "karim", "beard-trim", "confirmed"],
  [0, 15, 30, "yara", "styling", "confirmed"],
  [1, 9, 30, "sara", "haircut", "confirmed"], // Cancelled in the video.
  [1, 11, 0, "youssef", "beard-trim", "confirmed"],
  [1, 12, 0, "lina", "styling", "confirmed"],
  [1, 14, 0, "omar", "kids-haircut", "confirmed"],
  [1, 16, 0, "hana", "coloring", "cancelled"],
  [2, 10, 0, "karim", "haircut", "confirmed"],
  [2, 13, 30, "sara", "styling", "confirmed"],
  [3, 9, 0, "yara", "beard-trim", "confirmed"],
  [3, 15, 0, "youssef", "coloring", "confirmed"],
  [5, 11, 0, "lina", "haircut", "confirmed"],
];

/** The date of the booking the video cancels (tomorrow). */
export function cancelDay(): Date {
  return at(1, 9, 30);
}

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
    // "owner" is the emulator's built-in admin token: it skips the rules,
    // like the Firebase console does. It only works against the emulator.
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

export async function seed() {
  // Start from an empty emulator every time.
  await call("DELETE", `${FIRESTORE_URL}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`);
  await call("DELETE", `${AUTH_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`);

  const { localId: adminUid } = await call(
    "POST",
    `${AUTH_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    { email: ADMIN.email, password: ADMIN.password, returnSecureToken: true },
  );
  const created = at(-30, 9, 0);
  await put(`users/${adminUid}`, { name: ADMIN.name, email: ADMIN.email, role: "admin", createdAt: created });

  for (const [id, name] of Object.entries(CUSTOMERS)) {
    const email = `${name.toLowerCase().replace(" ", ".")}@example.com`;
    await put(`users/${id}`, { name, email, role: "customer", createdAt: created });
  }

  for (const { id, ...service } of SERVICES) {
    await put(`services/${id}`, { ...service, active: true });
  }

  let n = 0;
  for (const [days, hour, minute, customer, serviceId, status] of BOOKINGS) {
    const service = SERVICES.find((s) => s.id === serviceId)!;
    const startAt = at(days, hour, minute);
    const bookingId = `demo-booking-${++n}`;
    await put(`bookings/${bookingId}`, {
      userId: customer,
      serviceId,
      serviceName: service.name,
      startAt,
      durationMinutes: service.durationMinutes,
      status,
      createdAt: at(days - 3, 18, 0),
    });
    if (status === "confirmed") {
      await put(`slots/${serviceId}_${startAt.getTime()}`, { serviceId, startAt, bookingId });
    }
  }
}
