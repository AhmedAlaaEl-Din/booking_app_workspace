// Records the portfolio video: evidence/demo/admin-dashboard-demo.webm
// Runs against the local emulators with the made-up data from seed.ts.
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { toDateKey } from "../lib/dates";
import { ADMIN, cancelDay, seed } from "./seed";

const VIDEO = path.resolve(__dirname, "..", "evidence", "demo", "admin-dashboard-demo.webm");
const SIZE = { width: 1280, height: 720 };

/** A round teal cursor that glides between clicks, with a ripple on click. */
function installCursor() {
  const install = () => {
    if (document.getElementById("demo-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #demo-cursor { position: fixed; width: 24px; height: 24px; margin: -12px 0 0 -12px;
        border-radius: 50%; background: rgba(13,148,136,.30); border: 2px solid rgba(13,148,136,.95);
        box-shadow: 0 1px 6px rgba(0,0,0,.25); pointer-events: none; z-index: 2147483647;
        transition: left .45s ease, top .45s ease, transform .15s ease; }
      #demo-cursor.down { transform: scale(.7); background: rgba(13,148,136,.6); }
      .demo-ripple { position: fixed; width: 48px; height: 48px; margin: -24px 0 0 -24px;
        border-radius: 50%; border: 3px solid rgba(13,148,136,.85); pointer-events: none;
        z-index: 2147483646; animation: demo-ripple .6s ease-out forwards; }
      @keyframes demo-ripple { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.7); opacity: 0 } }`;
    document.head.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "demo-cursor";
    const last = sessionStorage.getItem("demo-cursor")?.split(",") ?? ["640", "360"];
    cursor.style.left = `${last[0]}px`;
    cursor.style.top = `${last[1]}px`;
    document.body.appendChild(cursor);
    document.addEventListener("mousemove", (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
      sessionStorage.setItem("demo-cursor", `${e.clientX},${e.clientY}`);
    }, true);
    document.addEventListener("mousedown", (e) => {
      cursor.classList.add("down");
      const ripple = document.createElement("div");
      ripple.className = "demo-ripple";
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    }, true);
    document.addEventListener("mouseup", () => cursor.classList.remove("down"), true);
  };
  if (document.body) install();
  else document.addEventListener("DOMContentLoaded", install);
}

test("portfolio demo: admin dashboard", async ({ browser }) => {
  await seed();

  const context = await browser.newContext({
    viewport: SIZE,
    locale: "en-GB",
    colorScheme: "light",
    recordVideo: { dir: path.resolve(__dirname, "..", "evidence", "demo-raw"), size: SIZE },
  });
  await context.addInitScript(installCursor);
  const page = await context.newPage();

  const beat = (ms = 400) => page.waitForTimeout(ms); // ~400 ms per action.
  const linger = () => page.waitForTimeout(2200); // Pause on each screen.
  async function click(target: Locator) {
    await target.hover(); // Let the cursor glide there first.
    await beat(550);
    await target.click();
    await beat();
  }
  async function type(target: Locator, text: string) {
    await click(target);
    await target.clear();
    await target.pressSequentially(text, { delay: 70 });
    await beat();
  }
  async function choose(page: Page, label: string, option: string) {
    const select = page.getByLabel(label);
    await select.hover();
    await beat(550);
    await select.selectOption({ label: option });
    await beat(900);
  }

  // 1. Sign in.
  await page.goto("/login");
  await beat(1200);
  await type(page.getByLabel("Email"), ADMIN.email);
  await type(page.getByLabel("Password"), ADMIN.password);
  await click(page.getByRole("button", { name: "Sign in" }));

  // 2. Overview.
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Omar Khaled")).toBeVisible();
  await linger();

  // 3. Bookings, then the date and status filters.
  await click(page.getByRole("link", { name: "Bookings" }));
  await expect(page.getByText("Sara Ahmed").first()).toBeVisible();
  await linger();
  const day = cancelDay();
  const dateInput = page.getByLabel("Date");
  await click(dateInput);
  await dateInput.fill(toDateKey(day));
  await beat(1200);
  await choose(page, "Status", "Confirmed");
  await linger();

  // 4. Cancel Sara Ahmed's haircut.
  const row = page.locator("tr", { hasText: "Sara Ahmed" });
  await click(row.getByRole("button", { name: "Cancel", exact: true }));
  await expect(page.getByRole("dialog")).toContainText("Sara Ahmed");
  await linger();
  await click(page.getByRole("button", { name: "Cancel booking" }));
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(row).toHaveCount(0); // Gone from "Confirmed".
  await beat(1200);
  await choose(page, "Status", "Cancelled");
  await expect(row).toContainText("cancelled");
  await linger();

  // 5. Services: edit the Haircut price, deactivate Kids haircut.
  await click(page.getByRole("link", { name: "Services" }));
  const card = (name: string) =>
    page.locator("li", { has: page.getByRole("heading", { name, exact: true }) });
  await expect(card("Haircut")).toBeVisible();
  await linger();
  await click(card("Haircut").getByRole("button", { name: "Edit", exact: true }));
  await beat(800);
  await type(page.getByLabel("Price ($)"), "175");
  await click(page.getByRole("button", { name: "Save" }));
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(card("Haircut")).toContainText("$175");
  await beat(1200);
  await click(card("Kids haircut").getByRole("button", { name: "Deactivate", exact: true }));
  await expect(card("Kids haircut").getByText("Inactive", { exact: true })).toBeVisible();
  await linger();

  // 6. Sign out.
  await click(page.getByRole("button", { name: "Sign out" }));
  await expect(page).toHaveURL(/\/login$/);
  await linger();

  const video = page.video()!;
  await context.close();
  await video.saveAs(VIDEO);
  await video.delete();
});
