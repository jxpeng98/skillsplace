import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(root, ".github/workflows/sync-marketplace-sources.yml");

async function readWorkflow() {
  return (await readFile(workflowPath, "utf8")).replace(/\r\n/g, "\n");
}

test("external marketplace sync workflow runs on a schedule and can be started manually", async () => {
  const workflow = await readWorkflow();

  assert.match(workflow, /^on:\n(?:[\s\S]*?)^\s+workflow_dispatch:/m);
  assert.match(workflow, /^on:\n(?:[\s\S]*?)^\s+schedule:\n\s+- cron: "23 4 \* \* \*"/m);
});

test("external marketplace sync workflow updates all managed sources through one validated pull request", async () => {
  const workflow = await readWorkflow();

  assert.match(workflow, /^permissions:\n(?:[\s\S]*?)^\s+contents: write/m);
  assert.match(workflow, /^permissions:\n(?:[\s\S]*?)^\s+pull-requests: write/m);
  assert.match(workflow, /repository: jxpeng98\/skills/);
  assert.match(workflow, /path: skillsplace/);
  assert.match(workflow, /path: skills/);
  assert.match(workflow, /run: npm run sync:skills -- --source-root \.\.\/skills --target-root \./);
  assert.match(workflow, /run: npm run sync:qiongli\b/);
  assert.match(workflow, /run: npm run validate\b/);
  assert.match(workflow, /uses: peter-evans\/create-pull-request@v6/);
  assert.match(workflow, /path: skillsplace/);
  assert.match(workflow, /branch: chore\/sync-marketplace-sources/);
});
