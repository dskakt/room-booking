/**
 * Push project code to GitHub using the Replit GitHub connector.
 *
 * This script:
 * 1. Creates the GitHub repository if it doesn't exist (public, named "room-booking")
 * 2. Reads all git-tracked files from the local repo
 * 3. Pushes them to GitHub via the Git Data API (blobs, trees, commits, refs)
 * 4. Sets/updates the local git `origin` remote to point to the GitHub repo
 * 5. Sets the default branch on GitHub to `main`
 *
 * Uses the Replit connectors proxy so no raw OAuth token is needed.
 *
 * Usage (from workspace root):
 *   node scripts/src/push-to-github.mjs
 *
 * Requires: GitHub integration connected in Replit (@replit/connectors-sdk installed).
 * Repository: https://github.com/dskakt/room-booking
 */

import { ReplitConnectors } from "@replit/connectors-sdk";
import { execSync } from "node:child_process";

const connectors = new ReplitConnectors();
const OWNER = "dskakt";
const REPO = "room-booking";
const GITHUB_URL = `https://github.com/${OWNER}/${REPO}.git`;

const root = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");

async function ghApi(path, options = {}) {
  const response = await connectors.proxy("github", path, options);
  const data = await response.json();
  if (response.status >= 400) {
    throw new Error(`GitHub API error ${response.status} at ${path}: ${JSON.stringify(data).substring(0, 300)}`);
  }
  return data;
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: root, encoding: "utf8" }).trim();
}

async function ensureRepo() {
  try {
    const repo = await ghApi(`/repos/${OWNER}/${REPO}`);
    console.log(`Repository exists: ${repo.html_url}`);
    return repo;
  } catch {
    console.log(`Creating repository ${OWNER}/${REPO}...`);
    const repo = await ghApi("/user/repos", {
      method: "POST",
      body: JSON.stringify({
        name: REPO,
        description: "Meeting room booking application (会議室予約)",
        private: false,
        auto_init: false,
      }),
      headers: { "Content-Type": "application/json" },
    });
    console.log(`Repository created: ${repo.html_url}`);
    return repo;
  }
}

async function ensureRepoInitialized() {
  try {
    await ghApi(`/repos/${OWNER}/${REPO}/git/refs/heads/main`);
  } catch {
    console.log("Initializing empty repository with placeholder commit...");
    await ghApi(`/repos/${OWNER}/${REPO}/contents/.gitkeep`, {
      method: "PUT",
      body: JSON.stringify({
        message: "Initialize repository",
        content: Buffer.from("").toString("base64"),
      }),
      headers: { "Content-Type": "application/json" },
    });
    console.log("Repository initialized.");
  }
}

async function setDefaultBranch() {
  await ghApi(`/repos/${OWNER}/${REPO}`, {
    method: "PATCH",
    body: JSON.stringify({ default_branch: "main" }),
    headers: { "Content-Type": "application/json" },
  });
}

function setupOriginRemote() {
  try {
    const remotes = git("remote");
    if (remotes.split("\n").includes("origin")) {
      const currentUrl = git("remote get-url origin");
      if (currentUrl !== GITHUB_URL) {
        git(`remote set-url origin ${GITHUB_URL}`);
        console.log(`Updated origin remote to: ${GITHUB_URL}`);
      } else {
        console.log(`origin remote already set to: ${GITHUB_URL}`);
      }
    } else {
      git(`remote add origin ${GITHUB_URL}`);
      console.log(`Added origin remote: ${GITHUB_URL}`);
    }
  } catch (e) {
    console.warn("Could not configure git remote:", e.message);
  }
}

async function updateRef(sha) {
  try {
    await ghApi(`/repos/${OWNER}/${REPO}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: "refs/heads/main", sha }),
      headers: { "Content-Type": "application/json" },
    });
    console.log("Branch main created, SHA:", sha.substring(0, 7));
  } catch (e) {
    if (e.message.includes("422") || e.message.includes("already exists")) {
      await ghApi(`/repos/${OWNER}/${REPO}/git/refs/heads/main`, {
        method: "PATCH",
        body: JSON.stringify({ sha, force: true }),
        headers: { "Content-Type": "application/json" },
      });
      console.log("Branch main updated, SHA:", sha.substring(0, 7));
    } else {
      throw e;
    }
  }
}

async function main() {
  // Step 1: Create/verify GitHub repository
  await ensureRepo();

  // Step 2: Initialize the repo if it's completely empty (GitHub's Git Data API
  //         returns 409 on truly empty repos; we need at least one commit first)
  await ensureRepoInitialized();

  // Step 3: Read all git-tracked files from the local repo
  console.log("\nReading tracked files from local git...");
  const lsTreeOutput = execSync(
    "git ls-tree -r HEAD --format='%(objectmode) %(objectname) %(path)'",
    { cwd: root, encoding: "utf8" }
  );

  const files = lsTreeOutput.trim().split("\n").map(line => {
    const match = line.match(/^(\d+) ([0-9a-f]+) (.+)$/);
    if (!match) return null;
    return { mode: match[1], sha: match[2], path: match[3] };
  }).filter(Boolean);

  console.log(`Found ${files.length} tracked files`);

  const textEntries = [];
  const binaryFiles = [];

  let count = 0;
  for (const file of files) {
    count++;
    if (count % 25 === 0) console.log(`  Reading ${count}/${files.length}...`);

    const content = execSync(`git cat-file blob ${file.sha}`, {
      cwd: root,
      encoding: "buffer",
      maxBuffer: 50 * 1024 * 1024,
    });

    let isBinary = false;
    for (let i = 0; i < Math.min(content.length, 8000); i++) {
      if (content[i] === 0) { isBinary = true; break; }
    }

    if (isBinary) {
      binaryFiles.push({ ...file, content });
    } else {
      textEntries.push({ path: file.path, mode: file.mode, type: "blob", content: content.toString("utf8") });
    }
  }

  console.log(`Text files: ${textEntries.length}, Binary files: ${binaryFiles.length}`);

  // Step 4: Push text files via Git Tree API (supports inline content)
  const authorName = execSync("git log -1 --format='%an'", { cwd: root, encoding: "utf8" }).trim();
  const authorEmail = execSync("git log -1 --format='%ae'", { cwd: root, encoding: "utf8" }).trim();

  console.log("\nCreating tree (text files)...");
  let tree = await ghApi(`/repos/${OWNER}/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ tree: textEntries }),
    headers: { "Content-Type": "application/json" },
  });

  let commit = await ghApi(`/repos/${OWNER}/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: binaryFiles.length > 0 ? "Add project source files" : "Initial commit: 会議室予約 meeting room booking app",
      tree: tree.sha,
      author: { name: authorName, email: authorEmail, date: new Date().toISOString() },
    }),
    headers: { "Content-Type": "application/json" },
  });
  console.log("Commit:", commit.sha.substring(0, 7));
  await updateRef(commit.sha);

  // Step 5: Push binary files (requires repo to be non-empty first)
  if (binaryFiles.length > 0) {
    console.log(`\nUploading ${binaryFiles.length} binary file(s) as blobs...`);
    const binaryEntries = [];

    for (const file of binaryFiles) {
      console.log(`  Uploading: ${file.path} (${Math.round(file.content.length / 1024)}KB)`);
      const blob = await ghApi(`/repos/${OWNER}/${REPO}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: file.content.toString("base64"), encoding: "base64" }),
        headers: { "Content-Type": "application/json" },
      });
      binaryEntries.push({ path: file.path, mode: file.mode, type: "blob", sha: blob.sha });
    }

    tree = await ghApi(`/repos/${OWNER}/${REPO}/git/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: commit.sha, tree: binaryEntries }),
      headers: { "Content-Type": "application/json" },
    });

    commit = await ghApi(`/repos/${OWNER}/${REPO}/git/commits`, {
      method: "POST",
      body: JSON.stringify({
        message: "Initial commit: 会議室予約 meeting room booking app",
        tree: tree.sha,
        parents: [commit.sha],
        author: { name: authorName, email: authorEmail, date: new Date().toISOString() },
      }),
      headers: { "Content-Type": "application/json" },
    });
    console.log("Binary commit:", commit.sha.substring(0, 7));
    await updateRef(commit.sha);
  }

  // Step 6: Set default branch to main
  await setDefaultBranch();

  // Step 7: Configure local git `origin` remote
  setupOriginRemote();

  console.log(`\nDone! All ${files.length} files pushed to GitHub.`);
  console.log(`Repository: https://github.com/${OWNER}/${REPO}`);
  console.log(`Branch: main (default)`);
  console.log(`\nVerify with: git remote -v`);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
