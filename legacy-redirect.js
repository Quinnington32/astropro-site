// Preserve old GitHub Pages bookmarks after this branch is merged.
const filename = location.pathname.split("/").filter(Boolean).at(-1);
const target = new URL("https://students.goastropro.com/");
if (/^[a-z][a-z0-9-]*\.html$/.test(filename || "") && filename !== "404.html")
  target.pathname = "/" + filename;
target.search = location.search;
target.hash = location.hash;
location.replace(target.href);
