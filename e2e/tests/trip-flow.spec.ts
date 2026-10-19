import { expect, test, type Page } from "@playwright/test";

// These tests use the guest session, so nothing needs to be created or cleaned up on a server.
async function startGuest(page: Page) {
  await page.addInitScript(() => localStorage.setItem("golden-atlas:onboarding-complete", "true"));
  await page.goto("/");
  await page.getByRole("button", { name: "Try as guest" }).click();
  await expect(page).toHaveURL(/\/app\/map/);
}

async function addPlannedTrip(page: Page, country: string, title: string) {
  await page.goto("/app/add-trip");
  await page.getByRole("button", { name: /Select a country/ }).click();
  await page.getByPlaceholder(/Search countries/).fill(country);
  await page.getByRole("button", { name: new RegExp(country, "i") }).first().click();
  await page.getByPlaceholder("e.g. Tokyo & Kyoto").fill(title);
  await page.locator("#trip-start-date").fill("2099-05-01");
  await page.locator("#trip-end-date").fill("2099-05-02");
  for (let step = 0; step < 3; step += 1) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Save trip" }).click();
  await expect(page).toHaveURL(/\/app\/trip\//);
}

test("every country can be found, including Singapore", async ({ page }) => {
  await startGuest(page);
  await page.goto("/app/add-trip");
  await page.getByRole("button", { name: /Select a country/ }).click();
  await page.getByPlaceholder(/Search countries/).fill("singapore");
  await expect(page.getByRole("button", { name: /Singapore/ }).first()).toBeVisible();
});

test("the first-time map hint stays gone once a country has been opened", async ({ page }) => {
  await startGuest(page);
  await expect(page.getByText("Tap a country to get started")).toBeVisible();
  await page.evaluate(() => localStorage.setItem("golden-atlas:map-hint-dismissed", "true"));
  await page.reload();
  await expect(page.getByText("Tap a country to get started")).toHaveCount(0);
});

test("a planned trip gets day folders with a plan, captions area, and more days", async ({ page }) => {
  await startGuest(page);
  await addPlannedTrip(page, "Japan", "Spring in Japan");

  await expect(page.getByText(/Upcoming/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Day 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Day 2/ })).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Plan for the day").fill("Fushimi Inari at dawn");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Trip updated.")).toBeVisible();
  await expect(page.getByText("Fushimi Inari at dawn")).toBeVisible();

  await page.getByRole("button", { name: "Add another day" }).click();
  await expect(page.getByRole("button", { name: /Day 3/ })).toBeVisible();
});

test("planned trips list under Upcoming and leaving guest mode clears them", async ({ page }) => {
  await startGuest(page);
  await addPlannedTrip(page, "Portugal", "Lisbon next year");
  await page.goto("/app/trips");
  await expect(page.getByText("Upcoming", { exact: true })).toBeVisible();
  await expect(page.getByText("Lisbon next year")).toBeVisible();

  await page.goto("/app/profile");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Leave guest mode/ }).click();
  await expect(page).toHaveURL(/\/$/);
});
