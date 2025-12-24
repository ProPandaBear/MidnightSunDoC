const grid = document.getElementById("grid");
const searchInput = document.getElementById("search");
const tagFilter = document.getElementById("tagFilter");
const stats = document.getElementById("stats");

const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const closeModalBtn = document.getElementById("closeModal");

let DECK_TITLE = "My Card Deck";
let ALL_CARDS = [];
let ALL_TAGS = [];

function normalize(s) {
  return (s || "").toString().toLowerCase().trim();
}

function buildTags(cards) {
  const set = new Set();
  cards.forEach(c => (c.tags || []).forEach(t => set.add(t)));
  return Array.from(set).sort((a,b) => a.localeCompare(b));
}

function populateTagFilter(tags) {
  // keep first option "All tags"
  while (tagFilter.options.length > 1) tagFilter.remove(1);
  tags.forEach(tag => {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    tagFilter.appendChild(opt);
  });
}

function matches(card, q, tag) {
  const hay = [
    card.name,
    card.subtitle,
    (card.tags || []).join(" "),
    card.rules
  ].map(normalize).join(" ");

  const qOk = !q || hay.includes(q);
  const tagOk = !tag || (card.tags || []).includes(tag);
  return qOk && tagOk;
}

function render(cards) {
  grid.innerHTML = "";
  const count = cards.length;
  stats.textContent = `${count} card${count === 1 ? "" : "s"} shown • ${ALL_CARDS.length} total`;

  if (!count) {
    const empty = document.createElement("div");
    empty.style.color = "rgba(233,236,246,.75)";
    empty.textContent = "No cards match your search/filter.";
    grid.appendChild(empty);
    return;
  }

  for (const card of cards) {
    const el = document.createElement("div");
    el.className = "card";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `Open ${card.name}`);

    el.innerHTML = `
      <div class="thumb">
        ${card.image ? `<img loading="lazy" src="${card.image}" alt="${card.name}">` : `<span style="color:rgba(233,236,246,.6)">No image</span>`}
      </div>
      <div class="card-body">
        <h3 class="card-name">${card.name || "Untitled"}</h3>
        <p class="card-sub">${card.subtitle || ""}</p>
        <div class="tags">
          ${(card.tags || []).slice(0, 6).map(t => `<span class="tag">${t}</span>`).join("")}
        </div>
      </div>
    `;

    const open = () => openModal(card);
    el.addEventListener("click", open);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });

    grid.appendChild(el);
  }
}

function openModal(card) {
  modalContent.innerHTML = `
    <div class="modal-img">
      ${card.image ? `<img src="${card.image}" alt="${card.name}">` : ""}
    </div>
    <div class="modal-text">
      <h2>${card.name || "Untitled"}</h2>
      <div class="meta">${card.subtitle || ""}</div>
      <div class="tags">
        ${(card.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}
      </div>
      <h3 style="margin:14px 0 8px;">Rules / Text</h3>
      <div class="rules">${escapeHtml(card.rules || "")}</div>
    </div>
  `;

  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    // fallback for older browsers
    alert(`${card.name}\n\n${card.rules || ""}`);
  }
}

function escapeHtml(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function applyFilters() {
  const q = normalize(searchInput.value);
  const tag = tagFilter.value;
  const filtered = ALL_CARDS.filter(c => matches(c, q, tag));
  render(filtered);
}

async function init() {
  const res = await fetch("cards.json", { cache: "no-store" });
  const deck = await res.json();

  DECK_TITLE = deck.title || DECK_TITLE;
  document.title = DECK_TITLE;
  document.querySelector(".title").textContent = DECK_TITLE;

  ALL_CARDS = Array.isArray(deck.cards) ? deck.cards : [];
  ALL_TAGS = buildTags(ALL_CARDS);

  populateTagFilter(ALL_TAGS);
  render(ALL_CARDS);

  searchInput.addEventListener("input", applyFilters);
  tagFilter.addEventListener("change", applyFilters);

  closeModalBtn.addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => {
    // click outside content closes
    const rect = modal.getBoundingClientRect();
    const inDialog = rect.top <= e.clientY && e.clientY <= rect.bottom &&
                     rect.left <= e.clientX && e.clientX <= rect.right;
    if (!inDialog) modal.close();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.open) modal.close();
  });
}

init().catch(err => {
  console.error(err);
  stats.textContent = "Failed to load cards.json. Check console for details.";
});
