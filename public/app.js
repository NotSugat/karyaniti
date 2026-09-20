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
const officialLink = document.querySelector("#official-link");
const unicodePreview = document.querySelector("#unicode-preview");
const englishMode = document.querySelector("#english-mode");
const nepaliMode = document.querySelector("#nepali-mode");
const feedbackEndpoint = "https://karyaniti-feedback.sugatsujakhu.workers.dev/feedback";
const feedbackOpen = document.querySelector("#feedback-open");
const feedbackDialog = document.querySelector("#feedback-dialog");
const feedbackForm = document.querySelector("#feedback-form");
const feedbackStatus = document.querySelector("#feedback-status");

const transliterationAliases = {
  samandha: "सम्बन्ध",
  samandh: "सम्बन्ध",
  sambandha: "सम्बन्ध",
  samband: "सम्बन्ध",
  biched: "विच्छेद",
  bichhed: "विच्छेद",
  biced: "विच्छेद",
  jagga: "जग्गा",
  gharjagga: "घरजग्गा",
};
const consonants = {
  chh: "छ", kh: "ख", gh: "घ", jh: "झ", th: "थ", dh: "ध", ph: "फ", bh: "भ", sh: "श",
  ng: "ङ", ny: "ञ", ch: "च", k: "क", g: "ग", j: "ज", t: "त", d: "द", n: "न", p: "प",
  b: "ब", m: "म", y: "य", r: "र", l: "ल", v: "व", s: "स", h: "ह",
};
const vowels = { aa: ["आ", "ा"], ii: ["ई", "ी"], uu: ["ऊ", "ू"], ai: ["ऐ", "ै"], au: ["औ", "ौ"], ri: ["ऋ", "ृ"], a: ["अ", ""], i: ["इ", "ि"], u: ["उ", "ु"], e: ["ए", "े"], o: ["ओ", "ो"] };

function transliterateWord(value) {
  const word = value.toLowerCase();
  if (transliterationAliases[word]) return transliterationAliases[word];
  if (!/^[a-z]+$/.test(word)) return value;
  const consonantKeys = Object.keys(consonants).sort((a, b) => b.length - a.length);
  const vowelKeys = Object.keys(vowels).sort((a, b) => b.length - a.length);
  let output = "";
  let index = 0;
  while (index < word.length) {
    const consonant = consonantKeys.find((key) => word.startsWith(key, index));
    if (consonant) {
      output += consonants[consonant];
      index += consonant.length;
      const vowel = vowelKeys.find((key) => word.startsWith(key, index));
      if (vowel) {
        output += vowels[vowel][1];
        index += vowel.length;
      } else if (index < word.length) {
        output += "्";
      }
      continue;
    }
    const vowel = vowelKeys.find((key) => word.startsWith(key, index));
    if (!vowel) return value;
    output += vowels[vowel][0];
    index += vowel.length;
  }
  return output;
}

function transliterateText(value) {
  return value.split(/(\s+)/).map((part) => /^\s+$/.test(part) ? part : transliterateWord(part)).join("");
}

let inputMode = "english";
let nepaliSource = "";

function updateUnicodePreview() {
  if (inputMode !== "english" || !query.value.trim()) {
    unicodePreview.textContent = "";
    return;
  }
  unicodePreview.textContent = transliterateText(query.value);
}

function updateModeButtons() {
  englishMode.setAttribute("aria-pressed", String(inputMode === "english"));
  nepaliMode.setAttribute("aria-pressed", String(inputMode === "nepali"));
  englishMode.classList.toggle("active", inputMode === "english");
  nepaliMode.classList.toggle("active", inputMode === "nepali");
}

function setInputMode(mode) {
  if (mode === inputMode) return;
  if (mode === "nepali") {
    nepaliSource = query.value;
    query.value = transliterateText(nepaliSource);
  } else {
    query.value = nepaliSource;
  }
  inputMode = mode;
  updateModeButtons();
  updateUnicodePreview();
  query.focus();
  query.setSelectionRange(query.value.length, query.value.length);
}

englishMode.addEventListener("click", () => setInputMode("english"));
nepaliMode.addEventListener("click", () => setInputMode("nepali"));

function insertNepaliInput(value) {
  nepaliSource += value;
  query.value = transliterateText(nepaliSource);
  query.setSelectionRange(query.value.length, query.value.length);
}

query.addEventListener("keydown", (event) => {
  if (inputMode !== "nepali") return;
  if (event.key === "Backspace") {
    event.preventDefault();
    nepaliSource = nepaliSource.slice(0, -1);
    query.value = transliterateText(nepaliSource);
    query.setSelectionRange(query.value.length, query.value.length);
  } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    insertNepaliInput(event.key);
  }
});

query.addEventListener("paste", (event) => {
  if (inputMode !== "nepali") return;
  event.preventDefault();
  insertNepaliInput(event.clipboardData.getData("text"));
});
query.addEventListener("input", updateUnicodePreview);
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
}

async function search() {
  const params = new URLSearchParams({ q: query.value, type: type.value });
  const response = await fetch("/api/search?" + params);
  const data = await response.json();
  const selectedType = type.value ? type.options[type.selectedIndex].textContent.split(" (")[0] : "";
  resultsTitle.textContent = data.query ? "Results for “" + data.query + "”" : selectedType ? "Latest " + selectedType + " cases" : "Latest cases";
  resultCount.textContent = data.results.length ? data.query ? data.results.length + " results shown" : data.results.length + " latest cases shown" : "";
  results.replaceChildren();
  if (!data.results.length) {
    results.innerHTML = data.query ? '<p class="empty">No matching cases found.</p>' : '<p class="empty">No cases found.</p>';
    return;
  }
  for (const item of data.results) {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = '<div class="card-top"><span class="tag">' + item.label + '</span><span>Case ' + item.nirnaya_no + '</span></div><h3>Case ' + item.nirnaya_no + '</h3><p class="case-subtitle"></p><p class="case-preview"></p><div class="card-actions"><button type="button">Read case</button><a class="official-link" href="' + item.official_url + '" target="_blank" rel="noopener">Official case</a></div>';
    card.querySelector(".case-subtitle").textContent = item.subject || "";
    renderHighlightedText(card.querySelector(".case-preview"), item.snippet, item.highlight_terms);
    card.querySelector("button").addEventListener("click", () => openCase(item));
    results.append(card);
  }
}

async function openCase(item) {
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
  search().catch(() => { results.innerHTML = '<p class="empty">Search is unavailable. Build the index and restart the server.</p>'; });
});
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
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
loadStats().catch(() => { stats.innerHTML = '<p class="empty">Corpus stats unavailable. Build the index first.</p>'; });
search().catch(() => { results.innerHTML = '<p class="empty">Cases are unavailable. Build the index and restart the server.</p>'; });
