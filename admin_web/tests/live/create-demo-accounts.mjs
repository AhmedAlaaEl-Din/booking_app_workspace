// Creates two DEMO accounts for the live test and writes their logins to
// .env.e2e.local (git-ignored). Passwords are generated and never printed.
//
//   node tests/live/create-demo-accounts.mjs
//
// Both accounts get a normal customer profile, exactly like a sign-up in the
// app. Making one of them admin is a manual step in the Firebase console
// (Firestore -> users -> <uid> -> role = "admin"); the script prints which.
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

const OUT = ".env.e2e.local";
if (existsSync(OUT)) {
  console.error(`${OUT} already exists; not overwriting it.`);
  process.exit(1);
}
process.loadEnvFile(".env.local");

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);
const tag = randomBytes(3).toString("hex");

async function create(kind, name) {
  const email = `demo.${kind}.${tag}@example.com`;
  const password = randomBytes(12).toString("base64url");
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", user.uid), {
    name,
    email,
    role: "customer",
    createdAt: serverTimestamp(),
  });
  await signOut(auth);
  return { email, password, uid: user.uid };
}

const admin = await create("admin", "Demo Admin");
const customer = await create("customer", "Demo Customer");

writeFileSync(
  OUT,
  [
    `E2E_ADMIN_EMAIL=${admin.email}`,
    `E2E_ADMIN_PASSWORD=${admin.password}`,
    `E2E_CUSTOMER_EMAIL=${customer.email}`,
    `E2E_CUSTOMER_PASSWORD=${customer.password}`,
    "",
  ].join("\n"),
);
await deleteApp(app);

console.log(`Wrote ${OUT} (passwords not shown).`);
console.log(`Demo admin:    ${admin.email}  uid ${admin.uid}  <- set role to "admin"`);
console.log(`Demo customer: ${customer.email}  uid ${customer.uid}`);
