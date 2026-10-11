import { initI18n, t } from "../shared/i18n.js";
import { applyTheme } from "../shared/theme.js";
import { findDuplicateGroups, DEFAULT_SIMILARITY_THRESHOLD } from "../shared/duplicates.js";

const PRODUCT_URL_RE = /\/item\/\d+\.html/;

const panels = [
  "idleState",
  "loadingState",
  "resultsState",
  "errorState",
  "productState",
  "otherState",
];

function showPanel(name) {
  panels.forEach((id) => {
    document.getElementById(id).hidden = id !== name;
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

// The real AliExpress cart lives at .../p/shoppingcart/index.html on the
// main domain (any locale subdomain) - "cart.aliexpress.com" does not
// exist and 404s, confirmed by navigating there directly (2026-09-21).
const CART_PATH_RE = /aliexpress\.com\/p\/shoppingcart\//;

function isCartUrl(url) {
  return typeof url === "string" && CART_PATH_RE.test(url);
}

function isProductUrl(url) {
  return typeof url === "string" && /aliexpress\.com/.test(url) && PRODUCT_URL_RE.test(url);
}

function sendToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      resolve(chrome.runtime.lastError ? null : response);
    });
  });
}

function sendToBackground(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function openCompareTab() {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/compare/compare.html") });
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Cart/product titles and AI output are untrusted text (scraped from a
// third-party page, or model output) - escape before any innerHTML use.
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

// Maps a background action's failure reason to a user-facing message key.
function messageForFailure(result) {
  switch (result?.reason) {
    case "NO_API_KEY":
      return "popup_needsApiKey";
    case "NO_PRICE":
      return "popup_noPriceDetected";
    case "TIMEOUT":
      return "popup_timeout";
    case "SEARCH_FAILED":
    case "NO_QUERY":
      return "popup_searchFailed";
    default:
      return "popup_error";
  }
}

// ---- Cart flow ----

async function getSimilarityThreshold() {
  const stored = await chrome.storage.local.get("cartiq_similarity_threshold");
  return stored.cartiq_similarity_threshold ?? DEFAULT_SIMILARITY_THRESHOLD;
}

function renderDuplicates(items, duplicateGroups) {
  document.getElementById("itemCount").textContent = items.length;
  document.getElementById("dupCount").textContent = duplicateGroups.length;

  document.getElementById("emptyCartMsg").hidden = items.length !== 0;

  const section = document.getElementById("duplicatesSection");
  const list = document.getElementById("duplicatesList");
  list.innerHTML = "";

  if (duplicateGroups.length === 0) {
    section.hidden = true;
  } else {
    section.hidden = false;
    duplicateGroups.forEach((group) => {
      const div = document.createElement("div");
      div.className = "cartiq-dup-item";
      const titles = document.createElement("div");
      titles.className = "cartiq-dup-titles";
      titles.textContent = group.map((i) => i.title).join(" / ");
      div.appendChild(titles);
      list.appendChild(div);
    });
  }
}

async function renderAiSummary(items, duplicateGroups, tabId) {
  const aiSummaryEl = document.getElementById("aiSummary");
  const needsKeyEl = document.getElementById("needsApiKeyMsg");
  needsKeyEl.hidden = true;
  aiSummaryEl.hidden = true;

  if (items.length === 0) return;

  const result = await sendToBackground({
    type: "CARTIQ_ANALYZE_REQUEST",
    items,
    duplicateGroups,
    tabId,
  });

  if (!result?.ok) {
    if (result?.reason === "NO_API_KEY") {
      needsKeyEl.hidden = false;
    } else {
      aiSummaryEl.hidden = false;
      aiSummaryEl.textContent = t(messageForFailure(result));
    }
    return;
  }

  const { summary, duplicateAdvice = [], generalTips = [] } = result.analysis;
  aiSummaryEl.hidden = false;
  aiSummaryEl.innerHTML = `
    <p>${escapeHtml(summary)}</p>
    ${duplicateAdvice.map((d) => `<div class="cartiq-dup-advice">• ${escapeHtml(d.advice)}</div>`).join("")}
    ${generalTips.map((tip) => `<div class="cartiq-dup-advice">• ${escapeHtml(tip)}</div>`).join("")}
  `;
}

async function runCartScan(tab) {
  if (!tab?.id) {
    showPanel("errorState");
    return;
  }

  showPanel("loadingState");
  document.getElementById("loadingLabel").textContent = t("popup_scanning");

  const scanResult = await sendToTab(tab.id, { type: "CARTIQ_SCAN_REQUEST" });
  if (!scanResult?.ok) {
    showPanel("errorState");
    return;
  }

  const threshold = await getSimilarityThreshold();
  const duplicateGroups = findDuplicateGroups(scanResult.items, threshold);
  renderDuplicates(scanResult.items, duplicateGroups);
  showPanel("resultsState");

  document.getElementById("loadingLabel").textContent = t("popup_analyzing");
  await renderAiSummary(scanResult.items, duplicateGroups, tab.id);
}

// ---- Product flow ----

// Numbers/currency go inside <bdi> so they render correctly even when this
// popup is in RTL (Hebrew) mode - see STANDARDS.md §11.6 on bidi text. Store
// names come from the AliExpress page itself, so they're inserted as plain
// text nodes, never via innerHTML, to avoid any markup injection risk.
function bdiNode(text) {
  const el = document.createElement("bdi");
  el.textContent = text;
  return el;
}

function renderProductMeta(product) {
  document.getElementById("productTitle").textContent = product.title || "";

  const metaEl = document.getElementById("productMeta");
  metaEl.innerHTML = "";
  const parts = [];
  if (typeof product.price === "number") parts.push(bdiNode(`$${product.price.toFixed(2)}`));
  if (product.storeName) parts.push(document.createTextNode(product.storeName));
  if (typeof product.rating === "number") parts.push(bdiNode(`★ ${product.rating}`));

  parts.forEach((node, i) => {
    if (i > 0) metaEl.appendChild(document.createTextNode(" · "));
    metaEl.appendChild(node);
  });
}

function renderCheaperAlternatives(alternatives) {
  const container = document.getElementById("cheaperResults");
  container.innerHTML = "";
  if (!alternatives || alternatives.length === 0) {
    container.innerHTML = `<p class="cartiq-muted">—</p>`;
    return;
  }
  alternatives.forEach((alt) => {
    const a = document.createElement("a");
    a.className = "cartiq-alt-item";
    a.href = "#";

    const titleSpan = document.createElement("span");
    titleSpan.textContent = alt.title.slice(0, 40);

    const priceSpan = document.createElement("span");
    priceSpan.className = "cartiq-alt-price";
    priceSpan.appendChild(bdiNode(`$${alt.price.toFixed(2)}`));

    a.appendChild(titleSpan);
    a.appendChild(priceSpan);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: alt.url });
    });
    container.appendChild(a);
  });
}

function renderTrustResult(trust) {
  const container = document.getElementById("trustResult");
  container.innerHTML = "";
  const card = document.createElement("div");
  card.className = `cartiq-trust-card cartiq-trust-${trust.verdict || "yellow"}`;
  card.textContent = trust.reasoning || "";
  container.appendChild(card);
}

function renderActionMessage(containerId, messageKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const p = document.createElement("p");
  p.className = "cartiq-muted";
  p.textContent = t(messageKey);
  container.appendChild(p);
}

async function runWithButtonGuard(button, action) {
  if (button.disabled) return;
  button.disabled = true;
  try {
    await action();
  } finally {
    button.disabled = false;
  }
}

async function initProductPage(tab) {
  showPanel("productState");
  document.getElementById("cheaperResults").innerHTML = "";
  document.getElementById("trustResult").innerHTML = "";

  const findCheaperBtn = document.getElementById("findCheaperBtn");
  const checkTrustBtn = document.getElementById("checkTrustBtn");
  const scanFailedMsg = document.getElementById("productScanFailedMsg");

  const scan = await sendToTab(tab.id, { type: "CARTIQ_PRODUCT_SCAN_REQUEST" });
  const product = scan?.ok ? scan.product : null;

  if (!product) {
    scanFailedMsg.hidden = false;
    findCheaperBtn.disabled = true;
    checkTrustBtn.disabled = true;
    return;
  }

  scanFailedMsg.hidden = true;
  renderProductMeta(product);

  findCheaperBtn.onclick = () =>
    runWithButtonGuard(findCheaperBtn, async () => {
      renderActionMessage("cheaperResults", "popup_searchingAlternatives");
      const result = await sendToBackground({ type: "CARTIQ_FIND_CHEAPER_REQUEST", product });
      if (result?.ok) {
        renderCheaperAlternatives(result.alternatives);
      } else {
        renderActionMessage("cheaperResults", messageForFailure(result));
      }
    });

  checkTrustBtn.onclick = () =>
    runWithButtonGuard(checkTrustBtn, async () => {
      renderActionMessage("trustResult", "popup_analyzing");
      const result = await sendToBackground({ type: "CARTIQ_SELLER_TRUST_REQUEST", product });
      if (result?.ok) {
        renderTrustResult(result.trust);
      } else {
        renderActionMessage("trustResult", messageForFailure(result));
      }
    });
}

// ---- Init ----

async function init() {
  await initI18n();
  await applyTheme();

  const tab = await getActiveTab();

  document.getElementById("settingsBtn").addEventListener("click", openSettings);
  document.getElementById("openSettingsFromResultsBtn").addEventListener("click", openSettings);
  document.getElementById("compareBtn").addEventListener("click", openCompareTab);
  document.getElementById("compareFromOtherBtn")?.addEventListener("click", openCompareTab);

  document.getElementById("openCartBtn")?.addEventListener("click", () => {
    if (!tab?.id) return;
    chrome.tabs.update(tab.id, { url: "https://www.aliexpress.com/p/shoppingcart/index.html" });
    window.close();
  });

  document.getElementById("scanBtn").addEventListener("click", () => runCartScan(tab));
  document.getElementById("rescanBtn").addEventListener("click", () => runCartScan(tab));
  document.getElementById("retryScanBtn").addEventListener("click", () => runCartScan(tab));

  if (isCartUrl(tab?.url)) {
    showPanel("idleState");
  } else if (isProductUrl(tab?.url)) {
    await initProductPage(tab);
  } else {
    showPanel("otherState");
  }
}

init();
