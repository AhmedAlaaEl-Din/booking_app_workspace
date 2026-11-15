// The same checks as smoke.spec.ts, one after another on a single page, so
// `npm run test:e2e:video` produces one continuous video of all of them.
// Runs only in the "video" project (see playwright.config.ts).
import { expect, test } from "@playwright/test";

test("walkthrough: all smoke checks in one video", async ({ page }) => {
  // A short pause after each step, so a person can follow the video.
  const pause = () => page.waitForTimeout(1200);

  await test.step("the login page renders", async () => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Booking admin" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    await pause();
  });

  for (const path of ["/", "/bookings", "/services"]) {
    await test.step(`logged out: ${path} redirects to /login`, async () => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
      await pause();
    });
  }

  await test.step("empty form shows validation messages", async () => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter your email.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
    await pause();
  });

  await test.step("an invalid email shows a validation message", async () => {
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("whatever");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toHaveCount(0);
    await pause();
  });
});
