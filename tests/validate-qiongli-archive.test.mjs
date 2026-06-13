import { execFile } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("validator accepts trusted Qiongli Codex release archive sources", async () => {
  const fixtureRoot = path.join(root, "tests/fixtures/qiongli-archive-marketplace");

  const result = await execFileAsync("node", ["scripts/validate.mjs", "--root", fixtureRoot], {
    cwd: root
  });

  assert.match(result.stdout, /Marketplace validation passed/);
});
