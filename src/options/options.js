import { initI18n, switchLang, getLang } from "../shared/i18n.js";
import { applyTheme, getTheme, setTheme } from "../shared/theme.js";
import { DEFAULT_SIMILARITY_THRESHOLD } from "../shared/duplicates.js";

const DEFAULTS = {
  cartiq_similarity_threshold: DEFAULT_SIMILARITY_THRESHOLD,
  cartiq_watch_enabled: false,
  cartiq_watch_interval_minutes: 60,
};

async function loadApiKey() {
  const stored = await chrome.storage.local.get("cartiq_api_key");
  return stored.cartiq_api_key || "";
}

async function saveApiKey(key) {
  await chrome.storage.local.set({ cartiq_api_key: key.trim() });
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}

function notifyWatchChanged() {
  chrome.runtime.sendMessage({ type: "CARTIQ_WATCH_SETTING_CHANGED" });
}

async function init() {
  await initI18n();
  await applyTheme();

  document.getElementById("versionLabel").textContent = chrome.runtime.getManifest().version;

  const apiKeyInput = document.getElementById("apiKeyInput");
  apiKeyInput.value = await loadApiKey();

  document.getElementById("saveBtn").addEventListener("click", async () => {
    await saveApiKey(apiKeyInput.value);
    const notice = document.getElementById("savedNotice");
    notice.hidden = false;
    setTimeout(() => (notice.hidden = true), 2000);
  });

  const langSelect = document.getElementById("langSelect");
  langSelect.value = await getLang();
  langSelect.addEventListener("change", () => switchLang(langSelect.value));

  const themeSelect = document.getElementById("themeSelect");
  themeSelect.value = await getTheme();
  themeSelect.addEventListener("change", async () => {
    await setTheme(themeSelect.value);
    await applyTheme();
  });

  const settings = await loadSettings();

  const thresholdRange = document.getElementById("thresholdRange");
  const thresholdValue = document.getElementById("thresholdValue");
  thresholdRange.value = settings.cartiq_similarity_threshold;
  thresholdValue.textContent = `${Math.round(settings.cartiq_similarity_threshold * 100)}%`;
  thresholdRange.addEventListener("input", () => {
    thresholdValue.textContent = `${Math.round(thresholdRange.value * 100)}%`;
  });
  thresholdRange.addEventListener("change", () => {
    chrome.storage.local.set({ cartiq_similarity_threshold: parseFloat(thresholdRange.value) });
  });

  const watchEnabled = document.getElementById("watchEnabled");
  const watchInterval = document.getElementById("watchInterval");
  watchEnabled.checked = settings.cartiq_watch_enabled;
  watchInterval.value = settings.cartiq_watch_interval_minutes;

  watchEnabled.addEventListener("change", async () => {
    await chrome.storage.local.set({ cartiq_watch_enabled: watchEnabled.checked });
    notifyWatchChanged();
  });
  watchInterval.addEventListener("change", async () => {
    const minutes = Math.max(15, parseInt(watchInterval.value, 10) || 60);
    watchInterval.value = minutes;
    await chrome.storage.local.set({ cartiq_watch_interval_minutes: minutes });
    notifyWatchChanged();
  });
}

init();
