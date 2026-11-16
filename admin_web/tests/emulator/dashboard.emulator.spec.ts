// The dashboard, signed in for real, against the LOCAL emulators with the
// Glow Salon seed data. See playwright.emulator.config.ts.
import { expect, test, type Page } from "@playwright/test";

import { toDateKey } from "../../lib/dates";
import { ADMIN, DEMO_PASSWORD, emailOf, seed } from "../../scripts/seed-emulator";

const PROJECT_ID = process.env.SEED_PROJECT_ID ?? "demo-booking";
const DOCS = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const OWNER = { Authorization: "Bearer owner" }; // Emulator-only admin token.

async function readDoc(path: string) {
  const res = await fetch(`${DOCS}/${path}`, { headers: OWNER });
  return res.status === 404 ? null : res.json();
}

function tomorrowAt(hour: number, minute: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, hour, minute);
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.beforeEach(async () => {
  await seed();
});

test("a customer account gets a clear 'not an admin' message", async ({ page }) => {
  await signIn(page, emailOf("Sara Ahmed"));
  await expect(page.getByText(/Access denied\. This account is not an admin/)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("a wrong password shows a friendly error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Not the empty Next.js route announcer, which also has role="alert".
  const error = page.getByRole("alert").filter({ hasText: /\S/ });
  await expect(error).toBeVisible();
  await expect(error).not.toContainText(/auth\/|Firebase/);
});

test("admin: overview, filter, cancel (frees the slot), edit service, sign out", async ({ page }) => {
  await signIn(page, ADMIN.email);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Omar Khaled")).toBeVisible(); // Today, 09:00.

  await page.getByRole("link", { name: "Bookings" }).click();
  await expect(page.getByText("Sara Ahmed").first()).toBeVisible();
  const start = tomorrowAt(9, 30);
  await page.getByLabel("Date").fill(toDateKey(start));
  await page.getByLabel("Status").selectOption({ label: "Confirmed" });

  const row = page.locator("tr", { hasText: "Sara Ahmed" });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Sara Ahmed");
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(row).toHaveCount(0);

  // Firestore: the booking is cancelled and its slot is free again.
  const booking = await readDoc("bookings/seed-booking-07");
  expect(booking.fields.status.stringValue).toBe("cancelled");
  expect(await readDoc(`slots/haircut_${start.getTime()}`)).toBeNull();

  await page.getByRole("link", { name: "Services" }).click();
  const card = (name: string) =>
    page.locator("li", { has: page.getByRole("heading", { name, exact: true }) });
  await card("Haircut").getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Price ($)").fill("175");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(card("Haircut")).toContainText("$175");
  expect((await readDoc("services/haircut")).fields.price.integerValue).toBe("175");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("admin: empty states when there is no data", async ({ page }) => {
  // Remove all bookings and slots; keep users and services.
  for (const col of ["bookings", "slots"]) {
    const res = await fetch(`${DOCS}/${col}?pageSize=100`, { headers: OWNER });
    const { documents = [] } = (await res.json()) as { documents?: { name: string }[] };
    for (const d of documents) {
      await fetch(`${DOCS}/${col}/${d.name.split("/").pop()}`, { method: "DELETE", headers: OWNER });
    }
  }

  await signIn(page, ADMIN.email);
  await expect(page.getByText("No confirmed appointments today.")).toBeVisible();
  await page.getByRole("link", { name: "Bookings" }).click();
  await expect(page.getByText("No bookings yet.")).toBeVisible();
});
