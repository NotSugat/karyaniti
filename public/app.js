import { setRomanizedNepaliEnabled } from "./nepali-keyboard.mjs";

const form = document.querySelector("#search-form");
const query = document.querySelector("#query");
const type = document.querySelector("#type");
const stats = document.querySelector("#stats");
const results = document.querySelector("#results");
const pagination = document.querySelector("#pagination");
const resultsTitle = document.querySelector("#results-title");
const resultCount = document.querySelector("#result-count");
const dialog = document.querySelector("#case-dialog");
const dialogType = document.querySelector("#dialog-type");
const dialogTitle = document.querySelector("#dialog-title");
const dialogText = document.querySelector("#dialog-text");
const officialLink = document.querySelector("#official-link");
const englishMode = document.querySelector("#english-mode");
const nepaliMode = document.querySelector("#nepali-mode");
const feedbackEndpoint = "https://karyaniti-feedback.sugatsujakhu.workers.dev/feedback";
const feedbackOpen = document.querySelector("#feedback-open");
const feedbackDialog = document.querySelector("#feedback-dialog");
const feedbackForm = document.querySelector("#feedback-form");
const feedbackStatus = document.querySelector("#feedback-status");
const initialUrl = new URLSearchParams(location.search);
const initialType = initialUrl.get("type") || "";
const initialCase = initialUrl.get("case") || "";
const initialPage = Number.parseInt(initialUrl.get("page"), 10);
let currentPage = Number.isInteger(initialPage) && initialPage > 0 ? initialPage : 1;
query.value = initialUrl.get("q") || "";

let inputMode = "english";

function updateModeButtons() {
  englishMode.setAttribute("aria-pressed", String(inputMode === "english"));
  nepaliMode.setAttribute("aria-pressed", String(inputMode === "nepali"));
  englishMode.classList.toggle("active", inputMode === "english");
  nepaliMode.classList.toggle("active", inputMode === "nepali");
}

function setInputMode(mode) {
  if (mode === inputMode) return;
  inputMode = mode;
  setRomanizedNepaliEnabled(query, mode === "nepali");
  updateModeButtons();
  query.focus();
}

englishMode.addEventListener("click", () => setInputMode("english"));
nepaliMode.addEventListener("click", () => setInputMode("nepali"));

updateModeButtons();

async function loadStats() {
  const response = await fetch("/api/stats");
  const data = await response.json();
  stats.innerHTML = '<div class="stat"><strong>' + data.total.toLocaleString() + '</strong><span>total cases</span></div>';
  for (const item of data.types) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label + " (" + item.count.toLocaleString() + ")";
    type.append(option);
    stats.insertAdjacentHTML("beforeend", '<button class="stat stat-button" data-type="' + item.id + '"><strong>' + item.count.toLocaleString() + "</strong><span>" + item.label + "</span></button>");
  }
  document.querySelectorAll(".stat-button").forEach((button) => button.addEventListener("click", () => {
    type.value = button.dataset.type;
    form.requestSubmit();
  }));
  if ([...type.options].some((option) => option.value === initialType)) type.value = initialType;
}

function updateUrl(caseKey = "") {
  const params = new URLSearchParams();
  if (query.value.trim()) params.set("q", query.value.trim());
  if (type.value) params.set("type", type.value);
  if (currentPage > 1) params.set("page", currentPage);
  if (caseKey) params.set("case", caseKey);
  history.pushState(null, "", params.toString() ? "/?" + params : "/");
}

function clearCaseFromUrl() {
  const params = new URLSearchParams(location.search);
  if (!params.has("case")) return;
  params.delete("case");
  history.replaceState(null, "", params.toString() ? "/?" + params : "/");
}

function caseFromUrl(value) {
  const [rawType, id] = value.split(":");
  const caseType = Number.parseInt(rawType, 10);
  return Number.isInteger(caseType) && caseType > 0 && /^\d+$/.test(id) ? { type: caseType, id } : null;
}

function renderPagination(data) {
  pagination.replaceChildren();
  if (data.page <= 1 && !data.has_more) return;
  if (data.page > 1) {
    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "Previous";
    previous.addEventListener("click", () => {
      currentPage = data.page - 1;
      updateUrl();
      search().catch(() => { results.innerHTML = '<p class="empty">Search is unavailable. Build the index and restart the server.</p>'; });
    });
    pagination.append(previous);
  }
  if (data.has_more) {
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Next";
    next.addEventListener("click", () => {
      currentPage = data.page + 1;
      updateUrl();
      search().catch(() => { results.innerHTML = '<p class="empty">Search is unavailable. Build the index and restart the server.</p>'; });
    });
    pagination.append(next);
  }
}

async function search() {
  const params = new URLSearchParams({ q: query.value, type: type.value, page: currentPage });
  const response = await fetch("/api/search?" + params);
  const data = await response.json();
  const selectedType = type.value ? type.options[type.selectedIndex].textContent.split(" (")[0] : "";
  resultsTitle.textContent = data.query ? "Results for “" + data.query + "”" : selectedType ? "Latest " + selectedType + " cases" : "Latest cases";
  resultCount.textContent = data.results.length ? (data.page > 1 ? "Page " + data.page + ", " : "") + (data.query ? data.results.length + " results shown" : data.results.length + " latest cases shown") : "";
  results.replaceChildren();
  renderPagination(data);
  if (!data.results.length) {
    results.innerHTML = data.query ? '<p class="empty">No matching cases found.</p>' : '<p class="empty">No cases found.</p>';
    return;
  }
  for (const item of data.results) {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = '<div class="card-top"><span class="tag">' + item.label + '</span><span>Case ' + item.nirnaya_no + '</span></div><h3>Case ' + item.nirnaya_no + '</h3><p class="case-subtitle"></p><p class="case-preview"></p><div class="card-actions"><button type="button">Read case</button><a class="official-link" href="' + item.official_url + '" target="_blank" rel="noopener">Official case</a></div>';
    renderHighlightedText(card.querySelector(".case-subtitle"), item.subject || "", item.subject_highlight_terms);
    renderHighlightedText(card.querySelector(".case-preview"), item.snippet, item.highlight_terms);
    card.querySelector("button").addEventListener("click", () => openCase(item));
    results.append(card);
  }
}

async function openCase(item, pushUrl = true) {
  if (pushUrl) updateUrl(item.type + ":" + item.id);
  const response = await fetch("/api/case?type=" + item.type + "&id=" + item.id + "&q=" + encodeURIComponent(query.value));
  const data = await response.json();
  dialogType.textContent = data.label + " case";
  dialogTitle.textContent = "Case " + data.nirnaya_no;
  officialLink.href = data.official_url;
  const firstMark = renderHighlightedText(dialogText, data.text, data.highlight_terms);
  dialog.showModal();
  requestAnimationFrame(() => {
    if (firstMark) dialogText.scrollTop = Math.max(0, firstMark.offsetTop - dialogText.clientHeight * 0.3);
  });
}

function escapeRegExp(term) {
  return term.replace(/[\^$.*+?()[\]{}|]/g, "\\$&");
}

function renderHighlightedText(container, text, terms) {
  container.replaceChildren();
  if (!terms?.length) {
    container.textContent = text;
    return null;
  }
  const pattern = new RegExp(terms.map(escapeRegExp).join("|"), "giu");
  let lastIndex = 0;
  let firstMark = null;
  for (const match of text.matchAll(pattern)) {
    container.append(document.createTextNode(text.slice(lastIndex, match.index)));
    const mark = document.createElement("mark");
    mark.textContent = match[0];
    container.append(mark);
    firstMark ||= mark;
    lastIndex = match.index + match[0].length;
  }
  container.append(document.createTextNode(text.slice(lastIndex)));
  return firstMark;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  currentPage = 1;
  updateUrl();
  search().catch(() => { results.innerHTML = '<p class="empty">Search is unavailable. Build the index and restart the server.</p>'; });
});
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", clearCaseFromUrl);
window.addEventListener("popstate", () => {
  const params = new URLSearchParams(location.search);
  query.value = params.get("q") || "";
  if ([...type.options].some((option) => option.value === params.get("type"))) type.value = params.get("type");
  const page = Number.parseInt(params.get("page"), 10);
  currentPage = Number.isInteger(page) && page > 0 ? page : 1;
  search().then(() => {
    const item = caseFromUrl(params.get("case") || "");
    if (item) return openCase(item, false);
    if (dialog.open) dialog.close();
  }).catch(() => {});
});
feedbackOpen.addEventListener("click", () => feedbackDialog.showModal());
document.querySelector("#feedback-close").addEventListener("click", () => feedbackDialog.close());
document.querySelector("#feedback-cancel").addEventListener("click", () => feedbackDialog.close());
feedbackForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = feedbackForm.querySelector("button[type=submit]");
  submit.disabled = true;
  feedbackStatus.textContent = "Sending…";
  const values = new FormData(feedbackForm);
  try {
    const response = await fetch(feedbackEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: values.get("kind"),
        message: values.get("message"),
        email: values.get("email"),
        page_url: location.href,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not send feedback.");
    feedbackForm.reset();
    feedbackStatus.textContent = "Thank you. Your feedback was saved.";
  } catch (error) {
    feedbackStatus.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});
async function initialize() {
  try {
    await loadStats();
  } catch {
    stats.innerHTML = '<p class="empty">Corpus stats unavailable. Build the index first.</p>';
  }
  try {
    await search();
    const item = caseFromUrl(initialCase);
    if (item) await openCase(item, false);
  } catch {
    results.innerHTML = '<p class="empty">Cases are unavailable. Build the index and restart the server.</p>';
  }
}
initialize();
