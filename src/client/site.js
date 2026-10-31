const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const toast = (message) => {
  const el = $("#toast");
  el.textContent = message;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    el.textContent = "";
  }, 6500);
};
const dateToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(
    new Date(),
  );
for (const a of $$(".desktop-nav a, .mobile-menu a")) {
  if (new URL(a.href).pathname === location.pathname && !a.hash)
    a.setAttribute("aria-current", "page");
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape")
    $$(".mobile-menu[open]").forEach((el) => {
      el.open = false;
      $("summary", el).focus();
    });
});
document.addEventListener("click", (event) => {
  const menu = $(".mobile-menu[open]");
  if (menu && !menu.contains(event.target)) menu.open = false;
});
function setupDirectory() {
  const root = $("[data-directory]");
  if (!root) return;
  const search = $("#directorySearch"),
    category = $("#categoryFilter"),
    status = $("#statusFilter"),
    sort = $("#directorySort");
  const cards = $$(".listing-card", root);
  const params = new URLSearchParams(location.search);
  search.value = params.get("q") || "";
  if ([...category.options].some((o) => o.value === params.get("category")))
    category.value = params.get("category");
  if (
    status &&
    [...status.options].some((o) => o.value === params.get("status"))
  )
    status.value = params.get("status");
  if ([...sort.options].some((o) => o.value === params.get("sort")))
    sort.value = params.get("sort");
  const today = dateToday();
  cards.forEach((card) => {
    if (card.dataset.deadline && card.dataset.deadline < today) {
      card.dataset.status = "closed";
      const badge = $(".status", card);
      if (badge) {
        badge.textContent = "Cycle closed";
        badge.className = "status closed";
      }
    } else if (
      card.dataset.opens &&
      card.dataset.opens <= today &&
      card.dataset.status === "upcoming"
    ) {
      card.dataset.status = "check-sponsor";
      const badge = $(".status", card);
      if (badge) {
        badge.textContent = "Check current cycle";
        badge.className = "status";
      }
    }
  });
  function apply() {
    const terms = search.value
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const cat =
        category.value === "all" || card.dataset.category === category.value;
      const match = terms.every((t) => card.dataset.search.includes(t));
      const windowMatch =
        !status ||
        status.value === "all" ||
        (status.value === "not-closed"
          ? card.dataset.status !== "closed"
          : card.dataset.status === status.value);
      card.hidden = !(cat && match && windowMatch);
      if (!card.hidden) count++;
    }
    const ordered = [...cards];
    if (sort.value === "name")
      ordered.sort((a, b) =>
        $("h2", a).textContent.localeCompare($("h2", b).textContent),
      );
    if (sort.value === "deadline")
      ordered.sort((a, b) =>
        (a.dataset.deadline || "9999").localeCompare(
          b.dataset.deadline || "9999",
        ),
      );
    for (const card of ordered) $("#listingGrid").append(card);
    $("#resultCount").textContent =
      `${count} ${count === 1 ? "result" : "results"}${search.value ? " for “" + search.value.trim() + "”" : ""}`;
    $("#noResults").hidden = count > 0;
    const next = new URLSearchParams();
    if (search.value.trim()) next.set("q", search.value.trim());
    if (category.value !== "all") next.set("category", category.value);
    if (status && status.value !== "all") next.set("status", status.value);
    if (sort.value !== "featured") next.set("sort", sort.value);
    history.replaceState(
      null,
      "",
      location.pathname + (next.size ? "?" + next : "") + location.hash,
    );
  }
  search.addEventListener("input", apply);
  category.addEventListener("change", apply);
  sort.addEventListener("change", apply);
  status?.addEventListener("change", apply);
  $$("[data-reset-filters]").forEach((btn) =>
    btn.addEventListener("click", () => {
      search.value = "";
      category.value = "all";
      if (status) status.value = "all";
      sort.value = "featured";
      apply();
      search.focus();
    }),
  );
  apply();
}
function setupMarkets() {
  const root = $("[data-markets]");
  if (!root) return;
  const cards = $$(".market-card"),
    search = $("#marketSearch"),
    sort = $("#marketSort");
  function apply() {
    const terms = search.value
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    let n = 0;
    cards.forEach((c) => {
      c.hidden = !terms.every((t) => c.dataset.search.includes(t));
      if (!c.hidden) n++;
    });
    const ordered = [...cards].sort((a, b) =>
      sort.value === "default"
        ? Number(a.dataset.order) - Number(b.dataset.order)
        : sort.value === "city"
          ? a.dataset.city.localeCompare(b.dataset.city)
          : a.dataset.state.localeCompare(b.dataset.state) ||
            a.dataset.city.localeCompare(b.dataset.city),
    );
    ordered.forEach((c) => $("#marketGrid").append(c));
    $("#marketCount").textContent =
      `${n} ${n === 1 ? "market" : "markets"}${search.value ? " matching “" + search.value.trim() + "”" : ""}`;
    $("#marketEmpty").hidden = n > 0;
  }
  search.addEventListener("input", apply);
  sort.addEventListener("change", apply);
  apply();
}
const savedKey = "astropro.src.saved.v1";
let saved = new Set(),
  storageOK = true;
try {
  const value = JSON.parse(localStorage.getItem(savedKey) || "[]");
  if (Array.isArray(value))
    saved = new Set(value.filter((x) => typeof x === "string").slice(0, 500));
} catch {
  storageOK = false;
}
function saveState(next) {
  try {
    localStorage.setItem(savedKey, JSON.stringify([...next]));
    saved = next;
    storageOK = true;
    return true;
  } catch {
    storageOK = false;
    toast(
      "Your browser could not save this list. Check storage settings or export your current list.",
    );
    return false;
  }
}
function updateSaveButtons() {
  for (const b of $$("[data-save]")) {
    const on = saved.has(b.dataset.save);
    b.setAttribute("aria-pressed", String(on));
    const name =
      b.getAttribute("aria-label")?.replace(/^(Save|Remove) /, "") ||
      "resource";
    b.setAttribute("aria-label", (on ? "Remove " : "Save ") + name);
    b.innerHTML = `<span aria-hidden="true">${on ? "✓" : "＋"}</span> ${on ? "Saved" : "Save"}`;
  }
  $$("[data-saved-count]").forEach(
    (el) => (el.textContent = saved.size ? `(${saved.size})` : ""),
  );
}
let catalogPromise;
async function catalog() {
  return (catalogPromise ||= fetch(
    new URL("assets/catalog.json", document.baseURI),
  )
    .then((r) => {
      if (!r.ok) throw Error("Catalog unavailable");
      return r.json();
    })
    .catch((err) => {
      catalogPromise = null;
      throw err;
    }));
}
function savedCard(item) {
  const url = item.url;
  return `<article class="resource-card listing-card"><div class="card-heading"><p class="tag">${esc(item.type === "housing" ? "Housing" : item.type)}</p><button type="button" class="save-button" data-save="${esc(item.id)}" aria-label="Remove ${esc(item.name)}" aria-pressed="true">✓ Saved</button></div><h2>${esc(item.name)}</h2><p class="award">${esc(item.amount)}</p><p class="description">${esc(item.description)}</p><div class="card-bottom"><a class="link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${item.type === "housing" ? "View property source" : "View official source"} ↗<span class="sr-only"> (opens in a new tab)</span></a><p class="review-date"><a href="${esc(item.page)}">Back to directory →</a> · Confirm current terms with the provider.</p></div></article>`;
}
async function renderSaved() {
  if (!$("#savedGrid")) return;
  try {
    const items = (await catalog()).filter((x) => saved.has(x.id));
    $("#savedGrid").innerHTML = items.map(savedCard).join("");
    $("#savedEmpty").hidden = items.length > 0;
    $("#savedCount").textContent =
      `${items.length} saved ${items.length === 1 ? "resource" : "resources"}${saved.size > items.length ? " · Some older entries are no longer published." : ""}${storageOK ? "" : " · Browser storage is unavailable."}`;
    updateSaveButtons();
  } catch {
    $("#savedCount").textContent =
      "The resource catalog could not load. Your saved list is still on this device. Reload to try again.";
  }
}
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-save]");
  if (!button) return;
  const id = button.dataset.save,
    next = new Set(saved);
  const removing = next.has(id);
  if (removing) next.delete(id);
  else next.add(id);
  if (next.size > 500) {
    toast("Your saved list is full. Export a backup or remove an item first.");
    return;
  }
  if (saveState(next)) {
    updateSaveButtons();
    await renderSaved();
    toast(
      removing
        ? "Removed from this device’s saved list."
        : "Saved on this device.",
    );
  }
});
window.addEventListener("storage", (event) => {
  if (event.key !== savedKey) return;
  try {
    const next = JSON.parse(event.newValue || "[]");
    if (Array.isArray(next)) {
      saved = new Set(next.filter((x) => typeof x === "string").slice(0, 500));
      updateSaveButtons();
      renderSaved();
    }
  } catch {}
});
$("[data-export-saved]")?.addEventListener("click", () => {
  const blob = new Blob(
    [
      JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), ids: [...saved] },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "astropro-saved-resources.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("[data-import-saved]")?.addEventListener("click", () =>
  $("#savedImport").click(),
);
$("#savedImport")?.addEventListener("change", async (event) => {
  try {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 64000)
      throw Error("Choose an exported saved list smaller than 64 KB.");
    const data = JSON.parse(await file.text());
    if (
      data.version !== 1 ||
      !Array.isArray(data.ids) ||
      data.ids.length > 500 ||
      !data.ids.every((x) => typeof x === "string" && x.length < 200)
    )
      throw Error("Choose a valid AstroPro saved-list export.");
    const known = new Set((await catalog()).map((x) => x.id)),
      next = new Set([...saved, ...data.ids.filter((id) => known.has(id))]);
    if (next.size > 500)
      throw Error("The combined list is larger than 500 resources.");
    if (saveState(next)) {
      await renderSaved();
      toast(
        "Imported saved resources. Entries no longer published were skipped.",
      );
    }
  } catch (err) {
    toast(
      err instanceof SyntaxError
        ? "That file is not a valid saved-list export."
        : err.message,
    );
  } finally {
    event.target.value = "";
  }
});
$("[data-clear-saved]")?.addEventListener("click", async () => {
  if (!saved.size) return;
  if (
    window.confirm(
      "Clear the saved list on this device? Export a backup first if you want to keep it.",
    )
  ) {
    if (saveState(new Set())) {
      await renderSaved();
      toast("Saved list cleared on this device.");
    }
  }
});
function setupForms() {
  for (const form of $$("[data-intake]")) {
    const type = form.dataset.intake,
      status = $(".form-status", form),
      fields = $(".form-fields", form),
      button = $('button[type="submit"]', form),
      buttonText = button.textContent,
      key = "astropro.src.pending." + type;
    let pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(key) || "null");
      if (pending?.payload && pending?.id) {
        for (const [name, value] of Object.entries(pending.payload)) {
          const input = form.elements.namedItem(name);
          if (input && typeof value === "string" && input.type !== "checkbox")
            input.value = value;
        }
        status.textContent =
          "A previous attempt has no confirmed receipt in this tab. Send the same request again to safely check or complete it.";
      }
    } catch {}
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (button.disabled || !form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      data.type = type;
      data.consent = data.consent === "yes";
      const canonical = JSON.stringify(data);
      if (!pending || pending.canonical !== canonical)
        pending = { id: crypto.randomUUID(), payload: data, canonical };
      try {
        sessionStorage.setItem(key, JSON.stringify(pending));
      } catch {}
      button.disabled = true;
      button.textContent = "Sending…";
      status.removeAttribute("data-error");
      status.textContent = "Sending your request securely…";
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(
          new URL("api/submissions", document.baseURI),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": pending.id,
            },
            body: JSON.stringify({ ...data, requestId: pending.id }),
            signal: controller.signal,
          },
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.receipt)
          throw Error(
            result.error ||
              "We could not confirm your request. Try again with the same details, or contact us by email.",
          );
        const receipt = result.receipt;
        fields.hidden = true;
        status.innerHTML = `<h3>${type === "unsubscribe" ? "Preference recorded" : "Request received"}</h3><p>${type === "unsubscribe" ? "Your do-not-contact preference is stored for the Student Resource Center. Use the link in an existing email for any separate mailing list." : "Your request is stored for the team to review. Keep this reference if you need to follow up. This is a receipt, not an approval or a mentor match."}</p><p class="receipt">Reference: ${esc(receipt)}</p><button type="button" class="btn btn-ghost" data-new-request>Send another request</button>`;
        pending = null;
        try {
          sessionStorage.removeItem(key);
        } catch {}
        status.focus();
        $("[data-new-request]", status).addEventListener("click", () => {
          form.reset();
          fields.hidden = false;
          status.textContent = "";
          $("input:not([type=hidden])", form)?.focus();
        });
      } catch (err) {
        status.dataset.error = "true";
        status.textContent =
          err.name === "AbortError"
            ? "We could not confirm receipt before the connection timed out. Your details are still here. Retry to check the same request safely."
            : err.message;
        status.focus();
      } finally {
        clearTimeout(timer);
        button.disabled = false;
        button.textContent = buttonText;
      }
    });
    const query = new URLSearchParams(location.search);
    if (type === "listing" && query.get("market")) {
      const input = form.elements.namedItem("description");
      if (input && !input.value)
        input.value = "Campus market: " + query.get("market");
    }
  }
}
function setupSchool() {
  const form = $("#schoolSearch");
  if (!form) return;
  const search = $("#schoolName"),
    topic = $("#schoolTopic"),
    params = new URLSearchParams(location.search);
  search.value = (params.get("school") || "").slice(0, 150);
  if ([...topic.options].some((o) => o.value === params.get("topic")))
    topic.value = params.get("topic");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const q = search.value.trim() + " official " + topic.value;
    const link = document.createElement("a");
    link.className = "btn btn-primary";
    link.href = "https://www.google.com/search?q=" + encodeURIComponent(q);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent =
      "Search for " + search.value.trim() + " " + topic.value + " ↗";
    const p = document.createElement("p");
    p.className = "fineprint";
    p.textContent =
      "Choose a result on your school’s official website. AstroPro has not verified these search results.";
    $("#schoolResults").replaceChildren(link, p);
    link.focus();
  });
}
function setupAdmin() {
  const login = $("#adminLogin");
  if (!login) return;
  let token = "",
    cursor = null;
  const message = $("#adminMessage"),
    records = $("#adminRecords");
  async function request(path, options = {}) {
    const r = await fetch(new URL("api/admin/" + path, document.baseURI), {
      ...options,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Could not load inbox.");
    return data;
  }
  function draw(items) {
    for (const item of items) {
      const article = document.createElement("article");
      article.className = "admin-record";
      const h = document.createElement("h2");
      h.textContent = item.type + " · " + item.status;
      const meta = document.createElement("p");
      meta.className = "fineprint";
      meta.textContent = item.id + " · " + item.created_at;
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(item.payload, null, 2);
      const actions = document.createElement("div");
      actions.className = "admin-controls";
      for (const state of ["reviewed", "resolved"]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn btn-ghost";
        b.textContent = "Mark " + state;
        b.addEventListener("click", async () => {
          b.disabled = true;
          try {
            await request("submissions/" + item.id, {
              method: "PATCH",
              body: JSON.stringify({ status: state }),
            });
            h.textContent = item.type + " · " + state;
            message.textContent = "Request status updated.";
          } catch (err) {
            message.textContent = err.message;
          } finally {
            b.disabled = false;
          }
        });
        actions.append(b);
      }
      article.append(h, meta, pre, actions);
      records.append(article);
    }
  }
  async function refresh(more = false) {
    try {
      message.textContent = "Loading…";
      const data = await request(
        "submissions" +
          (more && cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
      );
      if (!more) records.replaceChildren();
      draw(data.items);
      cursor = data.nextCursor;
      $("#adminMore").hidden = !cursor;
      login.hidden = true;
      $("#adminInbox").hidden = false;
      message.textContent = data.items.length
        ? "Private requests loaded."
        : "No requests in this page.";
    } catch (err) {
      message.textContent = err.message;
      if (/access|authorized/i.test(err.message)) lock();
    }
  }
  function lock() {
    token = "";
    $("#adminToken").value = "";
    records.replaceChildren();
    $("#adminInbox").hidden = true;
    login.hidden = false;
    cursor = null;
  }
  login.addEventListener("submit", (event) => {
    event.preventDefault();
    token = $("#adminToken").value.trim();
    $("#adminToken").value = "";
    refresh();
  });
  $("#adminRefresh").addEventListener("click", () => refresh());
  $("#adminMore").addEventListener("click", () => refresh(true));
  $("#adminLogout").addEventListener("click", lock);
  window.addEventListener("pagehide", lock);
}
setupDirectory();
setupMarkets();
setupForms();
setupSchool();
setupAdmin();
updateSaveButtons();
renderSaved();
