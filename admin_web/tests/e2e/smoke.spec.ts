// Smoke tests: no real account needed and nothing is ever signed in.
// Screenshots are saved to evidence/screenshots/ for a quick visual check.
import { expect, test } from "@playwright/test";

const shot = (name: string) => `evidence/screenshots/${name}.png`;

test("the login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Booking admin" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  await page.screenshot({ path: shot("login-page") });
});

for (const path of ["/", "/bookings", "/services"]) {
  test(`a logged-out visitor to ${path} is sent to /login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
}

test("empty form shows validation messages", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter your email.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
  await page.screenshot({ path: shot("login-validation-empty") });
});

test("an invalid email shows a validation message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("whatever");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toHaveCount(0);
  await page.screenshot({ path: shot("login-validation-email") });
});
