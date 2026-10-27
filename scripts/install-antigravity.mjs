import { execFile } from "node:child_process";
import { realpathSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function installAntigravity(entry, {
  target = "cli",
  appRoot = path.join(homedir(), ".gemini/config/plugins"),
  run = exec
} = {}) {
  if (!["app", "cli"].includes(target)) throw new Error("Target must be app or cli");
  if (!entry || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(entry.name)) {
    throw new Error("Unknown or invalid Antigravity package");
  }
  if (entry.plugin?.status !== "ready") {
    throw new Error(`${entry.name} is ${entry.plugin?.status ?? "not-supported"}; upstream must publish a native plugin first`);
  }
  const source = entry.source;
  if (source?.source !== "git-subdir" ||
      !/^https:\/\/github\.com\/[\w-]+\/[\w.-]+\.git$/.test(source.url) ||
      typeof source.ref !== "string" || !source.ref || source.ref.startsWith("-") ||
      typeof source.path !== "string" ||
      !source.path.split("/").every((part) => /^[\w.-]+$/.test(part) && part !== "." && part !== "..")) {
    throw new Error("Expected a GitHub HTTPS source, ref, and safe repository-relative plugin path");
  }

  const temporary = await mkdtemp(path.join(tmpdir(), "skillsplace-antigravity-"));
  try {
    const checkout = path.join(temporary, "source");
    await run("git", ["clone", "--depth", "1", "--branch", source.ref, "--", source.url, checkout]);
    // Reject links before reading or copying untrusted package content outside the checkout.
    await rejectLinks(checkout);
    const pluginRoot = path.join(checkout, source.path);
    let manifest;
    try {
      manifest = JSON.parse(await readFile(path.join(pluginRoot, "plugin.json"), "utf8"));
    } catch (error) {
      throw new Error(`${entry.name} needs a valid root plugin.json: ${error.message}`);
    }
    if (manifest.name !== entry.name) throw new Error("Native manifest name must match the catalog package");

    if (target === "cli") {
      const result = await run("agy", ["plugin", "install", pluginRoot]);
      // Some agy versions print failures while returning exit code zero.
      if (/^Error:/m.test(`${result.stdout ?? ""}\n${result.stderr ?? ""}`)) {
        throw new Error((result.stderr || result.stdout).trim());
      }
      return result.stdout?.trim() || `Installed ${entry.name} with agy`;
    }

    await mkdir(appRoot, { recursive: true });
    const destination = path.join(appRoot, entry.name);
    try {
      await mkdir(destination);
    } catch (error) {
      if (error.code === "EEXIST") throw new Error(`${entry.name} already exists at ${destination}; remove or back it up before reinstalling`);
      throw error;
    }
    try {
      for (const name of await readdir(pluginRoot)) {
        await cp(path.join(pluginRoot, name), path.join(destination, name), {
          recursive: true, force: false, errorOnExist: true
        });
      }
    } catch (error) {
      await rm(destination, { recursive: true, force: true });
      throw error;
    }
    return `Installed ${entry.name} at ${destination}. Open a new Antigravity App session.`;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function rejectLinks(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Plugin source contains an unsupported symbolic link: ${entry.name}`);
    if (entry.isDirectory()) await rejectLinks(path.join(directory, entry.name));
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [name, flag, target, ...extra] = process.argv.slice(2);
    const catalog = JSON.parse(await readFile(path.join(root, ".antigravity/catalog.json"), "utf8"));
    if (name === "--list" && flag === undefined) {
      for (const entry of catalog.plugins) console.log(`${entry.name}\t${entry.plugin.status}`);
    } else {
      if (!name || (flag !== undefined && (flag !== "--target" || !target)) || extra.length) {
        throw new Error("Usage: npm run install:antigravity -- <package> [--target cli|app], or --list");
      }
      console.log(await installAntigravity(catalog.plugins.find((entry) => entry.name === name), { target }));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
