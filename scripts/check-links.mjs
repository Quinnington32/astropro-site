import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { load } from "cheerio";
const urls = new Map();
for (const file of (await readdir("dist")).filter((x) => x.endsWith(".html"))) {
  const $ = load(await readFile("dist/" + file));
  $('a[href^="https://"]').each((_, el) => {
    const url = $(el).attr("href");
    if (
      url.startsWith("https://goastropro.com/") ||
      url.startsWith("https://students.goastropro.com/") ||
      url.includes("google.com/maps") ||
      url.includes("google.com/search")
    )
      return;
    const set = urls.get(url) || new Set();
    set.add(file);
    urls.set(url, set);
  });
}
const queue = [...urls],
  results = [];
async function run() {
  while (queue.length) {
    const [url, pages] = queue.shift();
    let result;
    try {
      const r = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AstroPro Resource Link Check)",
        },
        signal: AbortSignal.timeout(15000),
      });
      result = { url, status: r.status, final: r.url, pages: [...pages] };
      await r.body?.cancel();
    } catch (err) {
      result = {
        url,
        status: "unverified",
        error: err.name,
        pages: [...pages],
      };
    }
    results.push(result);
  }
}
await Promise.all(Array.from({ length: 10 }, run));
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/external-links.json",
  JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2),
);
const counts = {};
for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
console.log("External destinations checked:", results.length, counts);
for (const r of results.filter((x) => x.status === 404 || x.status === 410))
  console.log("Repair required:", r.url, "in", r.pages.join(", "));
console.log(
  "403, 429, and network errors are unverified, not confirmed dead links.",
);
