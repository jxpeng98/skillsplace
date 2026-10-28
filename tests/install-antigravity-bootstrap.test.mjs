import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bootstrap = await readFile(path.join(root, "scripts/install-antigravity.sh"), "utf8");
const bootstrapOptions = {
  skip: !["darwin", "linux"].includes(process.platform) && "Shell bootstrap supports macOS and Linux only"
};

async function setup(t, installer) {
  const directory = await mkdtemp(path.join(tmpdir(), "antigravity bootstrap-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const temporary = path.join(directory, "temporary files");
  const bin = path.join(directory, "bin");
  await mkdir(temporary);
  await mkdir(bin);
  const script = path.join(directory, "installer.mjs");
  await writeFile(script, installer ?? await readFile(path.join(root, "scripts/install-antigravity.mjs")));
  const curl = path.join(bin, "curl");
  await writeFile(curl, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const url = args.find(value => value.startsWith('https://'));
const base = 'https://raw.githubusercontent.com/jxpeng98/skillsplace/main';
const sources = {
  [base + '/scripts/install-antigravity.mjs']: process.env.TEST_INSTALLER,
  [base + '/.antigravity/catalog.json']: process.env.TEST_CATALOG
};
if (!sources[url]) throw new Error('Unexpected URL: ' + url);
if (process.env.TEST_FAIL_FETCH && url.endsWith(process.env.TEST_FAIL_FETCH)) process.exit(22);
fs.copyFileSync(sources[url], args[args.indexOf('-o') + 1]);
`);
  await chmod(curl, 0o755);
  const run = (args, extraEnv = {}) => new Promise((resolve, reject) => {
    const child = spawn("sh", ["-s", "--", ...args], {
      cwd: directory,
      env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, TMPDIR: temporary,
        TEST_INSTALLER: script, TEST_CATALOG: path.join(root, ".antigravity/catalog.json"), ...extraEnv }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(bootstrap);
  });
  return { run, temporary };
}

test("one-line bootstrap runs the real catalog listing outside a checkout and cleans up", bootstrapOptions, async (t) => {
  const f = await setup(t);
  const result = await f.run(["--list"]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /dev-tools\tready/);
  assert.match(result.stdout, /qiongli\tpending-native-manifest/);
  assert.deepEqual(await readdir(f.temporary), []);
});

test("bootstrap forwards arguments unchanged and preserves installer failures", bootstrapOptions, async (t) => {
  const f = await setup(t, "console.log(JSON.stringify(process.argv.slice(2))); process.exitCode = 7;");
  for (const target of ["app", "cli"]) {
    const args = ["dev-tools", "--target", target, "argument with spaces"];
    const result = await f.run(args);
    assert.equal(result.code, 7);
    assert.deepEqual(JSON.parse(result.stdout), args);
    assert.deepEqual(await readdir(f.temporary), []);
  }
});

test("failed downloads stop before execution and clean temporary files", bootstrapOptions, async (t) => {
  const f = await setup(t, "console.log('must not execute');");
  for (const file of ["install-antigravity.mjs", "catalog.json"]) {
    const result = await f.run(["dev-tools", "--target", "cli"], { TEST_FAIL_FETCH: file });
    assert.equal(result.code, 22);
    assert.equal(result.stdout, "");
    assert.deepEqual(await readdir(f.temporary), []);
  }
});
