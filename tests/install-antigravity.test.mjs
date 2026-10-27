import { mkdtemp, mkdir, readFile, rm, symlink, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { installAntigravity } from "../scripts/install-antigravity.mjs";

const entry = {
  name: "example",
  plugin: { status: "ready" },
  source: { source: "git-subdir", url: "https://github.com/example/skills.git", ref: "v1.0.0", path: "plugins/example" }
};

async function fixture(t, { manifest = { name: "example" }, link = false, cliError = false } = {}) {
  const appRoot = await mkdtemp(path.join(tmpdir(), "antigravity-test-"));
  t.after(() => rm(appRoot, { recursive: true, force: true }));
  const calls = [];
  let checkout;
  const run = async (command, args) => {
    calls.push({ command, args });
    if (command === "git") {
      assert.deepEqual(args.slice(0, -1), ["clone", "--depth", "1", "--branch", "v1.0.0", "--", entry.source.url]);
      checkout = args.at(-1);
      const plugin = path.join(checkout, entry.source.path);
      await mkdir(path.join(plugin, "skills/example"), { recursive: true });
      await writeFile(path.join(plugin, "skills/example/SKILL.md"), "# Example");
      if (manifest) await writeFile(path.join(plugin, "plugin.json"), JSON.stringify(manifest));
      if (link) await symlink(appRoot, path.join(plugin, "outside"), "dir");
      return { stdout: "" };
    }
    assert.equal(command, "agy");
    assert.deepEqual(args, ["plugin", "install", path.join(checkout, entry.source.path)]);
    assert.equal(await readFile(path.join(args[2], "skills/example/SKILL.md"), "utf8"), "# Example");
    return { stdout: cliError ? "Error: installation failed" : "Installed example" };
  };
  return { appRoot, run, calls, cleaned: async () => assert.rejects(access(checkout), { code: "ENOENT" }) };
}

test("CLI installs the plugin subdirectory at the catalog ref and removes temporary files", async (t) => {
  const f = await fixture(t);
  assert.equal(await installAntigravity(entry, f), "Installed example");
  assert.equal(f.calls.length, 2);
  await f.cleaned();
});

test("App receives the native bundle and refuses to overwrite an existing install", async (t) => {
  const f = await fixture(t);
  await installAntigravity(entry, { ...f, target: "app" });
  const skill = path.join(f.appRoot, "example/skills/example/SKILL.md");
  assert.equal(await readFile(skill, "utf8"), "# Example");
  await writeFile(skill, "user changes");
  await assert.rejects(installAntigravity(entry, { ...f, target: "app" }), /already exists/);
  assert.equal(await readFile(skill, "utf8"), "user changes");
  assert.ok(f.calls.every((call) => call.command === "git"));
  await f.cleaned();
});

test("unsupported entries and unsafe sources fail before fetching or installing", async () => {
  const run = async () => assert.fail("must not execute commands");
  for (const candidate of [undefined, { ...entry, name: "../escape" },
    { ...entry, plugin: { status: "pending-native-manifest" } },
    ...["../escape", "/absolute", "plugins/../../escape", "plugins\\escape"].map((p) => ({ ...entry, source: { ...entry.source, path: p } })),
    { ...entry, source: { ...entry.source, url: "file:///tmp/repo" } },
    { ...entry, source: { ...entry.source, ref: "--upload-pack=bad" } }
  ]) await assert.rejects(installAntigravity(candidate, { run }));
  await assert.rejects(installAntigravity(entry, { target: "invalid", run }), /Target/);
});

for (const [name, options, error] of [
  ["missing native manifest", { manifest: null }, /valid root plugin.json/],
  ["mismatched native manifest", { manifest: { name: "other" } }, /must match/],
  ["symbolic link outside the package", { link: true }, /symbolic link/],
  ["agy error with successful exit status", { cliError: true }, /installation failed/]
]) {
  test(`rejects ${name} and cleans up`, async (t) => {
    const f = await fixture(t, options);
    await assert.rejects(installAntigravity(entry, f), error);
    if (!options.cliError) assert.equal(f.calls.length, 1);
    await f.cleaned();
  });
}

test("propagates clone failure and cleans up", async () => {
  let checkout;
  await assert.rejects(installAntigravity(entry, { run: async (_, args) => {
    checkout = args.at(-1);
    throw new Error("network unavailable");
  } }), /network unavailable/);
  await assert.rejects(access(path.dirname(checkout)), { code: "ENOENT" });
});
