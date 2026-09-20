const form = document.querySelector("#search-form");
const query = document.querySelector("#query");
const type = document.querySelector("#type");
const stats = document.querySelector("#stats");
const results = document.querySelector("#results");
const resultsTitle = document.querySelector("#results-title");
const resultCount = document.querySelector("#result-count");
const dialog = document.querySelector("#case-dialog");
const dialogType = document.querySelector("#dialog-type");
const dialogTitle = document.querySelector("#dialog-title");
const dialogText = document.querySelector("#dialog-text");

async function loadStats() {
  const response = await fetch("/api/stats");
  const data = await response.json();
  stats.innerHTML = `<div class="stat"><strong>${data.total.toLocaleString()}</strong><span>total cases</span></div>`;
  for (const item of data.types) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.label} (${item.count.toLocaleString()})`;
    type.append(option);
    stats.insertAdjacentHTML("beforeend", `<button class="stat stat-button" data-type="${item.id}"><strong>${item.count.toLocaleString()}</strong><span>${item.label}</span></button>`);
  }
  document.querySelectorAll(".stat-button").forEach((button) => button.addEventListener("click", () => {
    type.value = button.dataset.type;
    form.requestSubmit();
  }));
}

async function search() {
  const params = new URLSearchParams({ q: query.value, type: type.value });
  const response = await fetch(`/api/search?${params}`);
  const data = await response.json();
  const selectedType = type.value ? type.options[type.selectedIndex].textContent.split(" (")[0] : "";
  resultsTitle.textContent = data.query ? `Results for “${data.query}”` : selectedType ? `Latest ${selectedType} cases` : "Latest cases";
  resultCount.textContent = data.results.length ? data.query ? `${data.results.length} results shown` : `${data.results.length} latest cases shown` : "";
  results.replaceChildren();
  if (!data.results.length) {
    results.innerHTML = data.query ? '<p class="empty">No matching cases found.</p>' : '<p class="empty">No cases found.</p>';
    return;
  }
  for (const item of data.results) {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `<div class="card-top"><span class="tag">${item.label}</span><span>Case ${item.id}</span></div><h3>Case ${item.id}</h3><p></p><button type="button">Read case</button>`;
    renderHighlightedText(card.querySelector("p"), item.snippet, item.highlight_terms);
    card.querySelector("button").addEventListener("click", () => openCase(item));
    results.append(card);
  }
}

async function openCase(item) {
  const response = await fetch(`/api/case?type=${item.type}&id=${item.id}&q=${encodeURIComponent(query.value)}`);
  const data = await response.json();
  dialogType.textContent = `${data.label} case`;
  dialogTitle.textContent = `Case ${data.id}`;
  renderHighlightedText(dialogText, data.text, data.highlight_terms);
  dialog.showModal();
}

function renderHighlightedText(container, text, terms) {
  container.replaceChildren();
  if (!terms?.length) {
    container.textContent = text;
    return;
  }
  const pattern = new RegExp(terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "giu");
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    container.append(document.createTextNode(text.slice(lastIndex, match.index)));
    const mark = document.createElement("mark");
    mark.textContent = match[0];
    container.append(mark);
    lastIndex = match.index + match[0].length;
  }
  container.append(document.createTextNode(text.slice(lastIndex)));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  search().catch(() => { results.innerHTML = '<p class="empty">Search is unavailable. Build the index and restart the server.</p>'; });
});
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
loadStats().catch(() => { stats.innerHTML = '<p class="empty">Corpus stats unavailable. Build the index first.</p>'; });
search().catch(() => { results.innerHTML = '<p class="empty">Cases are unavailable. Build the index and restart the server.</p>'; });
