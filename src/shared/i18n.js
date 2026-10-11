const SUPPORTED_LANGS = ["en", "he"];
const DEFAULT_LANG = "en";

let cache = {};
let currentLang = DEFAULT_LANG;

async function loadMessages(lang) {
  if (cache[lang]) return cache[lang];
  const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
  const res = await fetch(url);
  const json = await res.json();
  cache[lang] = json;
  return json;
}

export async function getLang() {
  const stored = await chrome.storage.local.get("cartiq_lang");
  return SUPPORTED_LANGS.includes(stored.cartiq_lang) ? stored.cartiq_lang : DEFAULT_LANG;
}

export async function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  await chrome.storage.local.set({ cartiq_lang: lang });
}

export function t(key, substitutions) {
  const entry = cache[currentLang]?.[key];
  if (!entry) return key;
  let message = entry.message;
  if (substitutions && entry.placeholders) {
    Object.entries(entry.placeholders).forEach(([name, def], i) => {
      const value = Array.isArray(substitutions) ? substitutions[i] : substitutions[name];
      message = message.replace(`$${name.toUpperCase()}$`, value);
    });
  }
  return message;
}

export async function initI18n() {
  currentLang = await getLang();
  await loadMessages(currentLang);
  applyToDom();
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "he" ? "rtl" : "ltr";
  return currentLang;
}

export async function switchLang(lang) {
  await setLang(lang);
  currentLang = lang;
  await loadMessages(lang);
  applyToDom();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
}

function applyToDom() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.setAttribute("placeholder", t(key));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    el.setAttribute("title", t(key));
  });
}
