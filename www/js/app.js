/* ============================================================
   Polylex — app logic
   Translation: MyMemory Translated API (no key required)
     https://mymemory.translated.net/doc/spec.php
   Dictionary:  Free Dictionary API (English, no key required)
     https://dictionaryapi.dev/
   Both are called directly from the WebView over HTTPS, so the
   app needs an internet connection to return results.
   ============================================================ */

const LANGUAGES = [
  ["en", "English"], ["bn", "Bangla"], ["hi", "Hindi"], ["ur", "Urdu"],
  ["ar", "Arabic"], ["es", "Spanish"], ["fr", "French"], ["de", "German"],
  ["it", "Italian"], ["pt", "Portuguese"], ["ru", "Russian"], ["zh", "Chinese"],
  ["ja", "Japanese"], ["ko", "Korean"], ["tr", "Turkish"], ["id", "Indonesian"],
  ["vi", "Vietnamese"], ["th", "Thai"], ["nl", "Dutch"], ["pl", "Polish"],
  ["sv", "Swedish"], ["fa", "Persian"], ["ta", "Tamil"], ["te", "Telugu"],
  ["ne", "Nepali"], ["si", "Sinhala"],
];

const $ = (sel) => document.querySelector(sel);
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
};

/* ---------------- tabs ---------------- */
function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.setAttribute("aria-selected", "false"));
      tab.setAttribute("aria-selected", "true");
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      $(`#panel-${tab.dataset.mode}`).classList.add("active");
      if (navigator.vibrate) navigator.vibrate(8);
    });
  });
}

/* ---------------- translate ---------------- */
function populateLangSelects() {
  const from = $("#lang-from");
  const to = $("#lang-to");
  LANGUAGES.forEach(([code, name]) => {
    from.append(new Option(name, code));
    to.append(new Option(name, code));
  });
  from.value = store.get("lastFrom", "en");
  to.value = store.get("lastTo", "bn");
}

function swapLangs() {
  const from = $("#lang-from"), to = $("#lang-to");
  [from.value, to.value] = [to.value, from.value];
  store.set("lastFrom", from.value);
  store.set("lastTo", to.value);
  if (navigator.vibrate) navigator.vibrate(8);
}

async function runTranslate() {
  const text = $("#translate-input").value.trim();
  const from = $("#lang-from").value;
  const to = $("#lang-to").value;
  const card = $("#translate-result");
  const stateMsg = $("#translate-state");
  const btn = $("#translate-btn");
  const spinner = $("#translate-spinner");

  if (!text) return;
  store.set("lastFrom", from);
  store.set("lastTo", to);

  btn.disabled = true;
  spinner.classList.add("active");
  stateMsg.classList.add("hidden");
  card.classList.add("hidden");

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("network");
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated || data.responseStatus === 403) throw new Error("empty");

    $("#translate-output").textContent = translated;
    card.classList.remove("hidden");
    card.querySelector(".entry-audio-btn").dataset.text = translated;
    card.querySelector(".entry-audio-btn").dataset.lang = to;

    pushHistory("translate", { from, to, text, translated });
    renderHistory("translate");
  } catch (err) {
    stateMsg.textContent = "Couldn't reach the translation service. Check your connection and try again.";
    stateMsg.classList.remove("hidden");
    stateMsg.classList.add("error");
  } finally {
    btn.disabled = false;
    spinner.classList.remove("active");
  }
}

/* ---------------- dictionary ---------------- */
async function runDictionary() {
  const word = $("#dictionary-input").value.trim();
  const card = $("#dictionary-result");
  const stateMsg = $("#dictionary-state");
  const btn = $("#dictionary-btn");
  const spinner = $("#dictionary-spinner");

  if (!word) return;

  btn.disabled = true;
  spinner.classList.add("active");
  stateMsg.classList.add("hidden");
  card.classList.add("hidden");

  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const res = await fetch(url);
    if (res.status === 404) {
      stateMsg.textContent = `No entry for "${word}". Check the spelling, or try another word.`;
      stateMsg.classList.remove("hidden");
      stateMsg.classList.add("error");
      return;
    }
    if (!res.ok) throw new Error("network");
    const [entry] = await res.json();
    renderDictionaryEntry(entry);
    card.classList.remove("hidden");
    pushHistory("dictionary", { word });
    renderHistory("dictionary");
  } catch (err) {
    stateMsg.textContent = "Couldn't reach the dictionary service. Check your connection and try again.";
    stateMsg.classList.remove("hidden");
    stateMsg.classList.add("error");
  } finally {
    btn.disabled = false;
    spinner.classList.remove("active");
  }
}

function renderDictionaryEntry(entry) {
  $("#dict-headword").textContent = entry.word;

  const phoneticText = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || "";
  $("#dict-phonetic").textContent = phoneticText;

  const audioEntry = entry.phonetics?.find((p) => p.audio);
  const audioBtn = $("#dict-audio-btn");
  if (audioEntry?.audio) {
    audioBtn.classList.remove("hidden");
    audioBtn.dataset.audio = audioEntry.audio.startsWith("http") ? audioEntry.audio : `https:${audioEntry.audio}`;
  } else {
    audioBtn.classList.add("hidden");
  }

  const container = $("#dict-meanings");
  container.innerHTML = "";
  (entry.meanings || []).forEach((meaning) => {
    const block = document.createElement("div");
    block.className = "pos-block";

    const label = document.createElement("p");
    label.className = "pos-label";
    label.textContent = meaning.partOfSpeech;
    block.append(label);

    const list = document.createElement("ol");
    list.className = "sense-list";
    (meaning.definitions || []).slice(0, 5).forEach((def) => {
      const li = document.createElement("li");
      li.textContent = def.definition;
      if (def.example) {
        const ex = document.createElement("span");
        ex.className = "sense-example";
        ex.textContent = `“${def.example}”`;
        li.append(ex);
      }
      list.append(li);
    });
    block.append(list);

    if (meaning.synonyms?.length) {
      const syn = document.createElement("p");
      syn.className = "synonyms";
      syn.innerHTML = `<b>Synonyms:</b> ${meaning.synonyms.slice(0, 8).join(", ")}`;
      block.append(syn);
    }

    container.append(block);
  });
}

/* ---------------- history ---------------- */
function pushHistory(kind, item) {
  const key = `history_${kind}`;
  const list = store.get(key, []);
  list.unshift({ ...item, ts: Date.now() });
  store.set(key, list.slice(0, 12));
}

function renderHistory(kind) {
  const key = `history_${kind}`;
  const list = store.get(key, []);
  const el = $(`#${kind}-history-list`);
  el.innerHTML = "";
  if (!list.length) {
    el.innerHTML = `<span class="history-empty">Nothing consulted yet.</span>`;
    return;
  }
  list.forEach((item) => {
    const chip = document.createElement("button");
    chip.className = "history-chip";
    chip.textContent = kind === "translate" ? item.text.slice(0, 24) : item.word;
    chip.addEventListener("click", () => {
      if (kind === "translate") {
        $("#translate-input").value = item.text;
        $("#lang-from").value = item.from;
        $("#lang-to").value = item.to;
        runTranslate();
      } else {
        $("#dictionary-input").value = item.word;
        runDictionary();
      }
    });
    el.append(chip);
  });
}

/* ---------------- speech / audio / copy ---------------- */
function speak(text, lang) {
  if (!("speechSynthesis" in window) || !text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function copyText(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text);
  if (navigator.vibrate) navigator.vibrate(8);
}

/* ---------------- wire up ---------------- */
function init() {
  initTabs();
  populateLangSelects();
  renderHistory("translate");
  renderHistory("dictionary");

  $("#translate-form").addEventListener("submit", (e) => { e.preventDefault(); runTranslate(); });
  $("#dictionary-form").addEventListener("submit", (e) => { e.preventDefault(); runDictionary(); });
  $("#swap-langs").addEventListener("click", swapLangs);

  $("#translate-input").addEventListener("input", (e) => {
    $("#translate-char-count").textContent = `${e.target.value.length} / 500`;
  });

  $("#translate-result").addEventListener("click", (e) => {
    const audioBtn = e.target.closest(".entry-audio-btn");
    const copyBtn = e.target.closest(".copy-btn");
    if (audioBtn) speak(audioBtn.dataset.text, audioBtn.dataset.lang);
    if (copyBtn) copyText($("#translate-output").textContent);
  });

  $("#dictionary-result").addEventListener("click", (e) => {
    const audioBtn = e.target.closest("#dict-audio-btn");
    if (audioBtn?.dataset.audio) new Audio(audioBtn.dataset.audio).play();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
