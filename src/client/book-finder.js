const form = document.querySelector("[data-book-finder]");
if (form) {
  const input = form.querySelector("input[name=q]");
  const out = document.querySelector("[data-book-results]");
  const enc = encodeURIComponent;
  const site = (host, q) => `https://www.google.com/search?q=${enc(`${q} site:${host}`)}`;
  const groups = [
    ["Free to read or borrow", [
      ["Open Library", "Borrow or read online for free", (q) => `https://openlibrary.org/search?q=${enc(q)}`],
      ["WorldCat", "Find a library near you that owns it", (q) => `https://search.worldcat.org/search?q=${enc(q)}`],
      ["OpenStax", "Free peer-reviewed textbooks", (q) => `https://openstax.org/search?q=${enc(q)}`],
      ["Open Textbook Library", "Free openly licensed textbooks", (q) => site("open.umn.edu", q)],
      ["LibreTexts", "Free online course materials", (q) => site("libretexts.org", q)],
      ["OER Commons", "Free open educational resources", (q) => site("oercommons.org", q)],
      ["Project Gutenberg", "Free classics and public-domain books", (q) => `https://www.gutenberg.org/ebooks/search/?query=${enc(q)}`],
    ]],
    ["Compare prices across sellers", [
      ["BookFinder", "Compares many used, new, and rental sellers at once", (q) => `https://www.bookfinder.com/search/?keywords=${enc(q)}&st=sh&ac=qr&mode=basic&lang=en&destination=us&currency=USD`],
      ["AbeBooks", "Used and out-of-print copies", (q) => `https://www.abebooks.com/servlet/SearchResults?kn=${enc(q)}`],
    ]],
    ["Used and rental", [
      ["ThriftBooks", "Used books, often very low cost", (q) => `https://www.thriftbooks.com/browse/?b.search=${enc(q)}`],
      ["Better World Books", "Used books; purchases fund literacy", (q) => `https://www.betterworldbooks.com/search/results?q=${enc(q)}`],
      ["BooksRun", "Rent or buy used", (q) => site("booksrun.com", q)],
      ["ValoreBooks", "Rent or buy used", (q) => site("valorebooks.com", q)],
      ["eCampus", "Rent or buy used", (q) => site("ecampus.com", q)],
    ]],
  ];
  const render = (q) => {
    out.textContent = "";
    const isbn = q.replace(/[\s-]/g, "");
    const note = document.createElement("p");
    note.className = "fineprint";
    note.textContent = /^\d{9}[\dXx]$|^\d{13}$/.test(isbn)
      ? "Searching by ISBN gives the most exact match."
      : "Tip: add the edition or ISBN from your syllabus to avoid the wrong edition.";
    out.append(note);
    for (const [title, items] of groups) {
      const h = document.createElement("h3");
      h.textContent = title;
      const grid = document.createElement("div");
      grid.className = "tool-grid";
      for (const [name, blurb, url] of items) {
        const a = document.createElement("a");
        a.className = "tool-card";
        a.href = url(q);
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        const n = document.createElement("h3");
        n.textContent = name;
        const p = document.createElement("p");
        p.textContent = blurb;
        const l = document.createElement("span");
        l.className = "link";
        l.textContent = "Search this site →";
        a.append(n, p, l);
        grid.append(a);
      }
      out.append(h, grid);
    }
    out.hidden = false;
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q.length < 2) {
      input.focus();
      return;
    }
    render(q);
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
