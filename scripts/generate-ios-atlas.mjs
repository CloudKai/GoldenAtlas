import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const source = require("@svg-maps/world");
const map = source.default ?? source;

function parse(path) {
  const tokens = path.match(/[mz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? [];
  const rings = [];
  let index = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let ring = null;

  while (index < tokens.length) {
    const token = tokens[index++].toLowerCase();
    if (token === "m") {
      if (ring?.length > 2) rings.push(ring);
      ring = [];
      x += Number(tokens[index++]);
      y += Number(tokens[index++]);
      startX = x;
      startY = y;
      ring.push([Number(x.toFixed(4)), Number(y.toFixed(4))]);
      while (index < tokens.length && !/[mz]/i.test(tokens[index])) {
        x += Number(tokens[index++]);
        y += Number(tokens[index++]);
        ring.push([Number(x.toFixed(4)), Number(y.toFixed(4))]);
      }
    } else if (token === "z") {
      x = startX;
      y = startY;
      if (ring?.length > 2) rings.push(ring);
      ring = null;
    } else {
      throw new Error(`Unsupported SVG token: ${token}`);
    }
  }
  if (ring?.length > 2) rings.push(ring);
  return rings;
}

const output = {
  attribution: "@svg-maps/world / MapSVG, CC BY 4.0",
  viewBox: [0, 0, 1010, 666],
  countries: map.locations.map((country) => ({
    id: country.id.toUpperCase(),
    name: country.name,
    rings: parse(country.path),
  })),
};

const destination = new URL("../ios/GoldenAtlas/GoldenAtlas/Resources/world-atlas.json", import.meta.url);
const serialized = `${JSON.stringify(output)}\n`;
if (process.argv.includes("--check")) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, "utf8") !== serialized) {
    console.error("The native world-atlas resource is stale. Run: node scripts/generate-ios-atlas.mjs");
    process.exit(1);
  }
  console.log(`Verified ${output.countries.length} native atlas countries.`);
} else {
  fs.writeFileSync(destination, serialized);
  console.log(`Wrote ${output.countries.length} countries to ${destination.pathname}`);
}
