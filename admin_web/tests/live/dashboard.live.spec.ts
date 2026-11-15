// LIVE test: the real dashboard against your real Firebase project, filmed in
// one video. Uses only the demo accounts from .env.e2e.local. See
// playwright.live.config.ts and the README ("Live test").
//
// What it changes in Firestore (demo data only):
// - creates or edits a service called "E2E test service" (never deleted,
//   left inactive at the end)
// - books one slot 13 days ahead as the demo customer, then cancels it
import { expect, test, type Page } from "@playwright/test";

import { formatTime, toDateKey } from "../../lib/dates";
import { connectAsCustomer } from "./customer-client";

const SERVICE_NAME = "E2E test service";
const REQUIRED = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
  "E2E_CUSTOMER_EMAIL",
  "E2E_CUSTOMER_PASSWORD",
];

const env = (name: string) => process.env[name] ?? "";

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("live: admin dashboard end to end", async ({ page }) => {
  // Names only, never values.
  const missing = REQUIRED.filter((name) => !process.env[name]);
  expect(missing, "Missing values in .env.local / .env.e2e.local").toEqual([]);

  const customer = await connectAsCustomer(
    env("E2E_CUSTOMER_EMAIL"),
    env("E2E_CUSTOMER_PASSWORD"),
  );
  const pause = () => page.waitForTimeout(1000);

  // Privacy for the video: blur every bookings row that isn't the demo
  // customer's, and today's appointment list on the Overview, so no other
  // customer's name or email is ever readable in the recording.
  await page.addInitScript((demoEmail: string) => {
    const mask = () => {
      document.querySelectorAll("tbody tr").forEach((row) => {
        const el = row as HTMLElement;
        el.style.filter = el.textContent?.includes(demoEmail) ? "" : "blur(6px)";
      });
      document.querySelectorAll("ul.divide-y > li").forEach((li) => {
        (li as HTMLElement).style.filter = "blur(6px)";
      });
    };
    new MutationObserver(mask).observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }, env("E2E_CUSTOMER_EMAIL"));

  try {
    await test.step("a customer account gets 'Access denied'", async () => {
      await page.goto("/login");
      await signIn(page, env("E2E_CUSTOMER_EMAIL"), env("E2E_CUSTOMER_PASSWORD"));
      await expect(page.getByText("Access denied")).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      await pause();
    });

    await test.step("a wrong password shows a friendly error", async () => {
      await signIn(page, env("E2E_ADMIN_EMAIL"), "wrong-password-e2e");
      await expect(page.getByText("Wrong email or password.")).toBeVisible();
      await pause();
    });

    await test.step("the admin signs in and sees the overview", async () => {
      await signIn(page, env("E2E_ADMIN_EMAIL"), env("E2E_ADMIN_PASSWORD"));
      await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
      await expect(page.getByText("Today's bookings")).toBeVisible();
      await pause();
    });

    await test.step("a reload keeps the admin signed in", async () => {
      await page.reload();
      await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    });

    const card = page.locator("li", {
      has: page.getByRole("heading", { name: SERVICE_NAME, exact: true }),
    });

    await test.step("services: add (with validation) or edit the test service", async () => {
      await page.getByRole("link", { name: "Services" }).click();
      await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
      await expect(page.getByRole("status")).toHaveCount(0); // Loaded.

      if ((await card.count()) === 0) {
        await page.getByRole("button", { name: "Add service" }).click();
        await page.getByRole("button", { name: "Save" }).click();
        await expect(page.getByText("Enter a name.")).toBeVisible();
        await page.getByLabel("Name").fill(SERVICE_NAME);
        await page.getByLabel("Description").fill("Used by the automated live test.");
        await page.getByLabel("Duration (minutes)").fill("30");
        await page.getByLabel("Price ($)").fill("1.234");
        await page.getByRole("button", { name: "Save" }).click();
        await expect(page.getByText(/Enter a price like 25/)).toBeVisible();
        await page.getByLabel("Price ($)").fill("10");
        await page.getByRole("button", { name: "Save" }).click();
      } else {
        await card.getByRole("button", { name: "Edit" }).click();
        await page
          .getByLabel("Description")
          .fill(`Used by the automated live test. Last run ${toDateKey(new Date())}.`);
        await page.getByRole("button", { name: "Save" }).click();
      }
      await expect(page.getByRole("dialog")).toBeHidden();
      await expect(card).toBeVisible();

      if (await card.getByRole("button", { name: "Activate", exact: true }).isVisible()) {
        await card.getByRole("button", { name: "Activate", exact: true }).click();
      }
      await expect(card.getByText("Active", { exact: true })).toBeVisible();
      await pause();
    });

    const service = await customer.findService(SERVICE_NAME);
    let booking!: Awaited<ReturnType<typeof customer.createBooking>>;

    await test.step("bookings: a new booking appears live, without a reload", async () => {
      await page.getByRole("link", { name: "Bookings" }).click();
      await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible();
      await page.getByLabel("Service").selectOption({ label: SERVICE_NAME });

      booking = await customer.createBooking(service); // As the customer.
      await page.getByLabel("Date").fill(toDateKey(booking.startAt));
      await pause();
    });

    const row = page
      .locator("tr", { hasText: env("E2E_CUSTOMER_EMAIL") })
      .filter({ hasText: formatTime(booking.startAt, "en-GB") });

    await test.step("the row shows the customer, service and 'confirmed'", async () => {
      await expect(row).toBeVisible();
      await expect(row).toContainText(SERVICE_NAME);
      await expect(row).toContainText("confirmed");
      await pause();
    });

    await test.step("Cancel, then 'Keep booking' changes nothing", async () => {
      await row.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(page.getByRole("dialog")).toContainText("Cancel this booking?");
      await pause();
      await page.getByRole("button", { name: "Keep booking" }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
      await expect(row).toContainText("confirmed");
    });

    await test.step("Cancel and confirm: the booking becomes 'cancelled'", async () => {
      await row.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.getByRole("button", { name: "Cancel booking" }).click();
      await expect(page.getByRole("dialog")).toBeHidden();
      await expect(row).toContainText("cancelled");
      await expect(row.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
      await pause();
    });

    await test.step("Firestore: booking cancelled and slot freed", async () => {
      expect(await customer.bookingStatus(booking.bookingId)).toBe("cancelled");
      expect(await customer.slotExists(booking.slotId)).toBe(false);
    });

    await test.step("the overview still loads", async () => {
      await page.getByRole("link", { name: "Overview" }).click();
      await expect(page.getByText("Upcoming confirmed")).toBeVisible();
      await pause();
    });

    await test.step("services: deactivate the test service again", async () => {
      await page.getByRole("link", { name: "Services" }).click();
      await card.getByRole("button", { name: "Deactivate", exact: true }).click();
      await expect(card.getByText("Inactive", { exact: true })).toBeVisible();
      await pause();
    });

    await test.step("phone width: Menu button, then sign out", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Menu" }).click();
      await pause();
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/login$/);
      await pause();
    });
  } finally {
    await customer.close();
  }
});
