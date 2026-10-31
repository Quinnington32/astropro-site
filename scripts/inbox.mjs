import { readFile } from "node:fs/promises";
const args = process.argv.slice(2);
const local = args.includes("--local");
let token = process.env.ASRC_ADMIN_TOKEN;
if (!token) {
  try {
    const vars = await readFile(
      new URL("../.dev.vars", import.meta.url),
      "utf8",
    );
    token = vars
      .match(/^ADMIN_TOKEN=(.+)$/m)?.[1]
      ?.trim()
      .replace(/^['"]|['"]$/g, "");
  } catch {}
}
if (!token) {
  console.error(
    "Set ASRC_ADMIN_TOKEN or use this checkout’s private .dev.vars. Never put the access key in a URL or commit it.",
  );
  process.exit(1);
}
const origin = local
  ? "http://localhost:4174/studentresourcecenter/"
  : "https://students.goastropro.com/";
let cursor;
let count = 0;
do {
  const url = new URL(
    "api/admin/" +
      (args.includes("--preferences") ? "preferences" : "submissions"),
    origin,
  );
  if (cursor) url.searchParams.set("cursor", cursor);
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    console.error(
      `Inbox request failed (${response.status}); check deployment and private access key.`,
    );
    process.exit(1);
  }
  const data = await response.json();
  for (const item of data.items) {
    count++;
    console.log(JSON.stringify(item, null, 2));
  }
  cursor = data.nextCursor;
} while (cursor);
console.log(
  `${count} private ${args.includes("--preferences") ? "communication preferences" : "requests"}.`,
);
