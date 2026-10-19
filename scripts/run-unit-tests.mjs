import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const outfile = join(tmpdir(), `golden-atlas-${randomUUID()}.test.mjs`);
await build({ entryPoints: ["tests/prototype.unit.ts"], bundle: true, platform: "node", format: "esm", outfile, sourcemap: "inline" });
const result = spawnSync(process.execPath, ["--test", outfile], { stdio: "inherit" });
process.exit(result.status ?? 1);
