import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

// Takes real screenshots of the running app for the README. Skipped unless CAPTURE=1:
//   cd e2e && CAPTURE=1 npx playwright test screenshots
// It uses a guest session, so no account or backend is needed, and generates its own sample photos.
test.skip(!process.env.CAPTURE, "Set CAPTURE=1 to take screenshots");
test.use({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/images/app");

// --- sample photos: simple generated landscapes, encoded as PNG without any image library -------------------------
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
};
const PALETTES = [
  { top: [43, 42, 92], bottom: [242, 166, 90], hills: [[106, 63, 94], [63, 42, 79], [36, 26, 56]] },
  { top: [247, 217, 168], bottom: [253, 241, 216], hills: [[143, 174, 138], [95, 138, 98], [47, 90, 69]] },
  { top: [127, 184, 224], bottom: [214, 236, 247], hills: [[74, 151, 184], [45, 122, 156], [27, 94, 128]] },
  { top: [207, 230, 212], bottom: [241, 246, 232], hills: [[111, 160, 122], [63, 122, 82], [31, 77, 54]] },
];
function samplePhoto(seed: number, width = 960, height = 720) {
  const palette = PALETTES[seed % PALETTES.length];
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x += 1) {
      const t = y / height;
      let color = palette.top.map((v, i) => v + (palette.bottom[i] - v) * t);
      if (Math.hypot(x - width * 0.72, y - height * 0.3) < 46) color = [255, 246, 220];
      palette.hills.forEach((hill, layer) => {
        const edge = height * (0.55 + 0.13 * layer) + (26 - layer * 5) * Math.sin(x / (80 - layer * 14) + seed * 1.7 + layer * 2.1);
        if (y > edge) color = hill;
      });
      row[1 + x * 3] = Math.round(color[0]); row[2 + x * 3] = Math.round(color[1]); row[3 + x * 3] = Math.round(color[2]);
    }
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header.writeUInt8(8, 8); header.writeUInt8(2, 9);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0))]);
}

// --- driving the app ----------------------------------------------------------------------------------------------
async function addTrip(page: Page, trip: { country: string; title: string; start: string; end: string; journal?: string; photos?: number }) {
  await page.goto("/app/add-trip");
  await page.getByRole("button", { name: /Select a country/ }).click();
  await page.getByPlaceholder(/Search countries/).fill(trip.country);
  await page.getByRole("button", { name: new RegExp(trip.country, "i") }).first().click();
  await page.getByPlaceholder("e.g. Tokyo & Kyoto").fill(trip.title);
  await page.locator("#trip-start-date").fill(trip.start);
  await page.locator("#trip-end-date").fill(trip.end);
  await page.getByRole("button", { name: "Continue" }).click();
  if (trip.journal) await page.getByPlaceholder("Write about your journey…").fill(trip.journal);
  await page.getByRole("button", { name: "Continue" }).click();
  if (trip.photos) {
    await page.locator('input[type="file"]').first().setInputFiles(
      Array.from({ length: trip.photos }, (_, i) => ({ name: `sample-${i + 1}.png`, mimeType: "image/png", buffer: samplePhoto(i) })),
    );
    await page.waitForTimeout(2500); // photos are re-encoded in the browser before they are listed
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Save trip" }).click();
  await page.waitForURL(/\/app\/trip\//);
}

test("capture README screenshots", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
  await page.addInitScript(() => {
    localStorage.setItem("golden-atlas:onboarding-complete", "true");
    localStorage.setItem("golden-atlas:map-hint-dismissed", "true");
  });

  await page.goto("/");
  await page.waitForTimeout(500);
  await shot("welcome");
  await page.getByRole("button", { name: "Try as guest" }).click();

  await addTrip(page, { country: "Japan", title: "Spring in Japan", start: "2026-03-28", end: "2026-04-06", journal: "Ten days, two cities, and one very long walk along the river.", photos: 6 });
  await addTrip(page, { country: "Portugal", title: "Lisbon & the Algarve", start: "2025-09-10", end: "2025-09-17", photos: 4 });
  await addTrip(page, { country: "France", title: "Paris & Provence", start: "2025-05-02", end: "2025-05-09", photos: 5 });
  await addTrip(page, { country: "Italy", title: "Tuscany by train", start: "2024-09-06", end: "2024-09-14", photos: 3 });
  await addTrip(page, { country: "South Korea", title: "Cherry blossoms in Seoul", start: "2099-03-20", end: "2099-03-27" });

  // Write a day's diary and places on the Japan trip.
  await page.goto("/app/trips");
  await page.getByText("Spring in Japan").first().click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("button", { name: /Day 2/ }).click();
  await page.getByLabel("Diary").fill("Up before sunrise for Fushimi Inari, nearly alone on the mountain path. Matcha and warabi mochi in Gion, then the long walk back along the river.");
  for (const place of ["Fushimi Inari", "Arashiyama", "Gion"]) {
    await page.getByLabel("Add a place you visited this day").fill(place);
    await page.getByLabel("Add a place you visited this day").press("Enter");
  }
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByText("Trip updated.").waitFor();
  await page.getByRole("button", { name: /Day 2/ }).scrollIntoViewIfNeeded();
  await shot("trip-days");

  await page.goto("/app/map");
  await page.waitForTimeout(800);
  await shot("map");
  await page.goto("/app/trips");
  await shot("trips");
  await page.goto("/app/memories");
  await shot("memories");
  await page.goto("/app/insights");
  await shot("insights");
});
