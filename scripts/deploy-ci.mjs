import { execFileSync } from "node:child_process";
import { appendFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const REPOSITORY = "Quinnington32/astropro-site";
export const WORKER = "astropro-student-resource-center";
export const ACCOUNT = "604bc8f6fd70f62522869abae693396b";
const SHA = /^[0-9a-f]{40}$/;
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export function checkedContext(env) {
  if (
    env.GITHUB_ACTIONS !== "true" ||
    env.GITHUB_REF !== "refs/heads/main" ||
    !["push", "workflow_dispatch"].includes(env.GITHUB_EVENT_NAME) ||
    env.GITHUB_REPOSITORY?.toLowerCase() !== REPOSITORY.toLowerCase()
  )
    throw Error(
      "Production publishing is restricted to this repository's main branch.",
    );
  if (!SHA.test(env.GITHUB_SHA || ""))
    throw Error("A valid source commit is required.");
  if (env.CLOUDFLARE_ACCOUNT_ID !== ACCOUNT)
    throw Error("The deployment account does not match this resource center.");
  if (!env.CLOUDFLARE_API_TOKEN?.trim())
    throw Error(
      "The ASRC_CLOUDFLARE_DEPLOY_TOKEN repository secret is missing.",
    );
  if (!env.GH_TOKEN) throw Error("The read-only GitHub job token is required.");
  return env.GITHUB_SHA;
}

export function uploadedVersion(output) {
  const records = output
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  const uploads = records.filter((row) => row.type === "version-upload");
  if (
    uploads.length !== 1 ||
    uploads[0].worker_name !== WORKER ||
    !UUID.test(uploads[0].version_id || "")
  )
    throw Error(
      "The upload did not identify exactly one version of this Worker.",
    );
  return uploads[0].version_id;
}

async function currentHead(env, fetcher) {
  const response = await fetcher(
    `https://api.github.com/repos/${REPOSITORY}/git/ref/heads/main`,
    {
      headers: {
        Authorization: `Bearer ${env.GH_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "AstroPro-Student-Resource-Center-CI",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw Error(
      `Could not verify the current main commit (${response.status}).`,
    );
  const data = await response.json();
  if (!SHA.test(data.object?.sha || ""))
    throw Error("GitHub returned an invalid branch reference.");
  return data.object.sha;
}

const wrangler = async (args, env) => {
  execFileSync(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", ...args],
    {
      env,
      stdio: "inherit",
    },
  );
};

export async function publishCheckedBuild({
  env = process.env,
  fetcher = fetch,
  runWrangler = wrangler,
  readManifest = async () =>
    JSON.parse(await readFile("dist/build.json", "utf8")),
} = {}) {
  const commit = checkedContext(env);
  if ((await currentHead(env, fetcher)) !== commit)
    return {
      deployed: false,
      reason: "A newer main commit is queued for deployment.",
      commit,
    };
  if ((await readManifest()).sourceCommit !== commit)
    throw Error(
      "The built files do not belong to this workflow's source commit.",
    );

  const directory = await mkdtemp(join(tmpdir(), "asrc-publish-"));
  try {
    const outputFile = join(directory, "wrangler.ndjson");
    await runWrangler(
      [
        "versions",
        "upload",
        "--name",
        WORKER,
        "--message",
        `GitHub main ${commit}`,
        "--tag",
        `git-${commit.slice(0, 12)}`,
      ],
      { ...env, WRANGLER_OUTPUT_FILE_PATH: outputFile },
    );
    const version = uploadedVersion(await readFile(outputFile, "utf8"));
    if ((await currentHead(env, fetcher)) !== commit)
      return {
        deployed: false,
        reason: "Main changed during upload; the newer commit will publish.",
        commit,
      };
    // Version promotion updates the application without changing domains, routes, or cron triggers.
    await runWrangler(
      [
        "versions",
        "deploy",
        `${version}@100`,
        "--name",
        WORKER,
        "--message",
        `GitHub main ${commit}`,
        "--yes",
      ],
      env,
    );
    return { deployed: true, commit, version };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const result = await publishCheckedBuild();
    console.log(JSON.stringify(result));
    if (process.env.GITHUB_OUTPUT)
      await appendFile(
        process.env.GITHUB_OUTPUT,
        `deployed=${result.deployed}\n`,
      );
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(
        process.env.GITHUB_STEP_SUMMARY,
        result.deployed
          ? `Published [${result.commit.slice(0, 7)}](https://github.com/${REPOSITORY}/commit/${result.commit}) to https://students.goastropro.com/\n\nWorker version: ${result.version}\n`
          : `Publishing skipped: ${result.reason}\n`,
      );
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
