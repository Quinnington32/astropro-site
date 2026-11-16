// Amazon Associates tracking ID, e.g. "astropro-20". Leave empty until the account is approved.
const AMAZON_TAG = "astroprostude-20";
const form = document.querySelector("[data-book-finder]");
if (form) {
  const input = form.querySelector("input[name=q]");
  const out = document.querySelector("[data-book-results]");
  const enc = encodeURIComponent;
  const site = (host, q) => `https://www.google.com/search?q=${enc(`${q} site:${host}`)}`;
  const amazonUrl = (q) => `https://www.amazon.com/s?k=${enc(q)}&i=stripbooks${AMAZON_TAG ? "&tag=" + enc(AMAZON_TAG) : ""}`;
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
    const renderGroup = ([title, items]) => {      const h = document.createElement("h3");
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
    };
    const renderFeatured = () => {
    const feat = document.createElement("a");
    feat.className = "book-featured";
    feat.href = amazonUrl(q);
    feat.target = "_blank";
    feat.rel = "noopener noreferrer sponsored";
    const fh = document.createElement("strong");
    fh.textContent = "Buy or rent it on Amazon: “" + q + "”";
    const fp = document.createElement("span");
    fp.textContent = "New, used, and rental copies with fast shipping. Check the edition and ISBN before you order.";
    const fb = document.createElement("span");
    fb.className = "btn btn-primary";
    fb.textContent = "See it on Amazon →";
    feat.append(fh, fp, fb);
    if (AMAZON_TAG) {
      const fd = document.createElement("small");
      fd.textContent = "As an Amazon Associate we earn from qualifying purchases. This never changes your price.";
      feat.append(fd);
    }
    out.append(feat);
    const sub = document.createElement("p");
    sub.className = "fineprint";
    sub.textContent = "Amazon is not always the cheapest. Compare the used and rental sellers below before you buy.";
    out.append(sub);
    };
    renderGroup(groups[0]);
    renderFeatured();
    renderGroup(groups[1]);
    renderGroup(groups[2]);
    if (AMAZON_TAG) {
      const d = document.createElement("p");
      d.className = "fineprint";
      d.textContent = "As an Amazon Associate we earn from qualifying purchases. This never changes your price.";
      out.append(d);
    }
    out.hidden = false;
  };
  const matches = document.querySelector("[data-book-matches]");
  let token = 0;
  const showMatches = (books, q) => {
    matches.textContent = "";
    if (!books.length) {
      const p = document.createElement("p");
      p.textContent = "No exact matches found. You can still search every source below with what you typed.";
      matches.append(p);
      return;
    }
    const h = document.createElement("h3");
    h.textContent = "Is it one of these? Pick yours to search by its ISBN";
    const grid = document.createElement("div");
    grid.className = "book-match-grid";
    for (const b of books) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "book-match";
      if (b.cover) {
        const img = document.createElement("img");
        img.src = b.cover;
        img.alt = "";
        img.width = 60;
        img.height = 90;
        img.loading = "lazy";
        btn.append(img);
      }
      const t = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = b.title;
      const meta = document.createElement("small");
      meta.textContent = [b.authors.join(", "), b.year, b.isbn && "ISBN " + b.isbn].filter(Boolean).join(" · ");
      t.append(strong, meta);
      btn.append(t);
      btn.addEventListener("click", () => {
        render(/^\d{9}[\dXx]$|^\d{13}$/.test(q.replace(/[\s-]/g, "")) ? q : b.isbn || [b.title, b.authors[0]].filter(Boolean).join(" "));
        out.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      grid.append(btn);
    }
    matches.append(h, grid);
  };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q.length < 2) {
      input.focus();
      return;
    }
    render(q);
    if (e.submitter && e.submitter.hasAttribute("data-amazon")) window.open(amazonUrl(q), "_blank", "noopener");
    matches.textContent = "Looking up matching books…";
    const mine = ++token;
    try {
      const res = await fetch(new URL("api/books?q=" + encodeURIComponent(q), document.baseURI));
      const data = res.ok ? await res.json() : { books: [] };
      if (mine === token) showMatches(data.books || [], q);
    } catch {
      if (mine === token) matches.textContent = "";
    }
    matches.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
