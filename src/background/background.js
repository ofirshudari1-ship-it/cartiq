import { getTargets, setTarget } from "../shared/history-chart.js";
import { recordSnapshot } from "../shared/history.js";
import { buildSearchUrl, normalizeTitleForSearch } from "../shared/aliexpress.js";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const PRICE_WATCH_ALARM = "cartiq-price-watch";

async function getSettings() {
  const stored = await chrome.storage.local.get([
    "cartiq_api_key",
    "cartiq_similarity_threshold",
    "cartiq_watch_enabled",
    "cartiq_watch_interval_minutes",
  ]);
  return {
    apiKey: stored.cartiq_api_key || null,
    similarityThreshold: stored.cartiq_similarity_threshold ?? 0.6,
    watchEnabled: Boolean(stored.cartiq_watch_enabled),
    watchIntervalMinutes: stored.cartiq_watch_interval_minutes ?? 60,
  };
}

const CLAUDE_TIMEOUT_MS = 20000;

async function callClaude(prompt, maxTokens = 700) {
  const { apiKey } = await getSettings();
  if (!apiKey) return { ok: false, reason: "NO_API_KEY" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (error) {
    return {
      ok: false,
      reason: controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR",
      detail: String(error),
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { ok: false, reason: "API_ERROR", status: response.status, detail: text };
  }

  const data = await response.json();
  const rawText = data?.content?.[0]?.text || "";
  try {
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");
    return { ok: true, parsed: JSON.parse(rawText.slice(jsonStart, jsonEnd + 1)) };
  } catch (error) {
    return { ok: false, reason: "PARSE_ERROR", detail: rawText };
  }
}

// ---- Cart AI summary (v0.1.0) ----

function buildCartPrompt(items, duplicateGroups) {
  const cartSummary = items.map((item) => ({
    title: item.title,
    price: item.price,
    quantity: item.quantity,
    store: item.storeName,
  }));

  return [
    "You are CartIQ, an assistant that reviews an AliExpress shopping cart and gives short, practical advice.",
    "You will receive cart items (title, price, quantity, store) and a list of items flagged as possible duplicates.",
    "Reply with ONLY a JSON object, no prose outside it, matching this shape:",
    '{"summary": string, "duplicateAdvice": [{"titles": string[], "advice": string}], "generalTips": string[]}',
    "Keep summary under 40 words. Keep each advice under 25 words. Max 4 generalTips. Write in the same language as the item titles.",
    "",
    `CART: ${JSON.stringify(cartSummary)}`,
    `POSSIBLE_DUPLICATES: ${JSON.stringify(
      duplicateGroups.map((group) => group.map((item) => item.title))
    )}`,
  ].join("\n");
}

async function analyzeCart(items, duplicateGroups) {
  const result = await callClaude(buildCartPrompt(items, duplicateGroups));
  if (!result.ok) return result;
  return { ok: true, analysis: result.parsed };
}

// ---- Phase 2: compare all open product tabs ----

async function requestProductScan(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "CARTIQ_PRODUCT_SCAN_REQUEST" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        resolve(null);
        return;
      }
      resolve({ ...response.product, tabId });
    });
  });
}

async function compareOpenTabs() {
  const tabs = await chrome.tabs.query({ url: "*://*.aliexpress.com/item/*" });
  const results = await Promise.all(tabs.map((tab) => requestProductScan(tab.id)));
  return results.filter(Boolean);
}

// ---- Phase 3: find cheaper alternatives via AliExpress search ----

function waitForTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("timeout waiting for search tab to load"));
    }, timeoutMs);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Injected into the search-results tab. Must be fully self-contained (no
// closures over outer scope) because chrome.scripting serializes it.
//
// Confirmed against real search results (2026-09-21): each result card is
// itself an <a class="... search-card-item" href="/item/...">, not a
// wrapper around one - `card.querySelector('a[href*="/item/"]')` finds
// nothing because the anchor isn't a descendant of itself. Each card also
// carries exactly two [aria-label] elements: a clean title and a clean
// price, both scraping-resistant (the visible price text is split into
// one <span> per character). Using those avoids the two failure modes a
// plain textContent scrape had: it picked up an unrelated "Similar items"
// recommendation card mixed into the results, and its title strings were
// polluted with the price/discount/badge text from the rest of the card.
function scrapeSearchResultsInPage() {
  const priceRe = /(?:US\s*\$|[$€£₪¥])\s*([\d,.]+)/;
  const itemRe = /\/item\/(\d+)\.html/;

  function parsePrice(text) {
    const match = text.match(priceRe);
    if (!match) return null;
    const numeric = parseFloat(match[1].replace(/,/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
  }

  const cards = Array.from(document.querySelectorAll('[class*="search-card-item"]'));
  const seen = new Set();
  const results = [];

  for (const card of cards) {
    const link = card.matches('a[href*="/item/"]') ? card : card.querySelector('a[href*="/item/"]');
    if (!link || !itemRe.test(link.href)) continue;

    const id = link.href.match(itemRe)[1];
    if (seen.has(id)) continue;

    let title = null;
    let price = null;
    for (const el of card.querySelectorAll("[aria-label]")) {
      const label = (el.getAttribute("aria-label") || "").trim();
      if (price === null) {
        const parsed = parsePrice(label);
        if (parsed !== null) {
          price = parsed;
          continue;
        }
      }
      if (title === null && label.length > 10 && !priceRe.test(label)) {
        title = label;
      }
    }
    if (price === null) continue;

    seen.add(id);
    results.push({
      productId: id,
      title: title || link.title?.trim() || `Item ${id}`,
      price,
      url: link.href.split("?")[0],
    });
    if (results.length >= 30) break;
  }

  return results;
}

async function findCheaperAlternatives({ title, price, url }) {
  if (typeof price !== "number") return { ok: false, reason: "NO_PRICE" };

  const query = normalizeTitleForSearch(title || "");
  if (!query) return { ok: false, reason: "NO_QUERY" };

  let tab;
  try {
    tab = await chrome.tabs.create({ url: buildSearchUrl(query), active: false });
    await waitForTabComplete(tab.id);
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeSearchResultsInPage,
    });

    const cheaper = (result || [])
      .filter((item) => item.url !== url && typeof item.price === "number" && item.price < price)
      .sort((a, b) => a.price - b.price)
      .slice(0, 5);

    return { ok: true, alternatives: cheaper };
  } catch (error) {
    return { ok: false, reason: "SEARCH_FAILED", detail: String(error) };
  } finally {
    if (tab?.id != null) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// ---- Phase 4: seller trust from on-page signals ----
//
// An earlier version also scraped a "best-effort" text sample near the
// reviews area to feed the model. Verified against a real product page
// (2026-09-21): AliExpress renders actual review text only after the user
// clicks "See preview" / scrolls - it is not in the DOM on load. The
// scraper was silently picking up unrelated recommendation-carousel and
// footer text instead of reviews, which risked misleading the trust
// verdict rather than helping it. It was removed; this now rates trust
// from on-page signals only (store feedback %, rating, review count).

function buildTrustPrompt(product) {
  return [
    "You are CartIQ, rating AliExpress seller trustworthiness for a shopper.",
    "You only get on-page signals: store feedback %, star rating, and review count. No review text is available.",
    "Reply with ONLY a JSON object: ",
    '{"verdict": "green"|"yellow"|"red", "confidence": "low"|"medium"|"high", "reasoning": string}',
    "Keep reasoning under 40 words. If signals are too sparse to judge, use confidence \"low\" and verdict \"yellow\".",
    "",
    `STORE: ${JSON.stringify({
      storeName: product.storeName,
      storeFeedbackPct: product.storeFeedbackPct,
      rating: product.rating,
      reviewsCount: product.reviewsCount,
    })}`,
  ].join("\n");
}

async function analyzeSellerTrust(product) {
  const result = await callClaude(buildTrustPrompt(product), 300);
  if (!result.ok) return result;
  return { ok: true, trust: result.parsed };
}

// ---- Phase 5: opt-in price/duplicate watch on open cart tabs ----

// Scraped titles are third-party text: flatten whitespace/control chars and
// cap the length before showing them in a system notification.
function safeNotifText(text) {
  return String(text ?? "").replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e]+/g, " ").trim().slice(0, 60);
}

async function checkCartTabsForChanges() {
  const tabs = await chrome.tabs.query({ url: "https://*.aliexpress.com/p/shoppingcart/*" });
  if (tabs.length === 0) return;

  for (const tab of tabs) {
    const scan = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: "CARTIQ_SCAN_REQUEST" }, (response) => {
        resolve(chrome.runtime.lastError ? null : response);
      });
    });
    if (!scan?.ok) continue;

    const snapshotKey = `cartiq_snapshot_tab_${tab.id}`;
    const stored = await chrome.storage.local.get(snapshotKey);
    const previous = stored[snapshotKey] || [];
    const previousById = new Map(previous.map((i) => [i.productId, i]));

    const priceDrops = [];
    for (const item of scan.items) {
      const prev = previousById.get(item.productId);
      if (prev && typeof prev.price === "number" && typeof item.price === "number" && item.price < prev.price) {
        priceDrops.push(item);
      }
    }

    if (priceDrops.length > 0) {
      chrome.notifications.create(`cartiq-pricedrop-${tab.id}-${Date.now()}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icons/icon-128.png"),
        title: "CartIQ",
        message:
          priceDrops.length === 1
            ? `Price dropped for "${safeNotifText(priceDrops[0].title)}"`
            : `Price dropped for ${priceDrops.length} items in your cart`,
      });
    }

    await chrome.storage.local.set({ [snapshotKey]: scan.items });
    await recordSnapshot(scan.items).catch(() => {});
  }
}

async function syncWatchAlarm() {
  const { watchEnabled, watchIntervalMinutes } = await getSettings();
  await chrome.alarms.clear(PRICE_WATCH_ALARM);
  if (watchEnabled) {
    chrome.alarms.create(PRICE_WATCH_ALARM, { periodInMinutes: Math.max(15, watchIntervalMinutes) });
  }
}

function askTab(tabId, type) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type }, (response) => {
      resolve(chrome.runtime.lastError ? null : response);
    });
  });
}

// Open product pages feed the price history too, and any saved target price
// that has been reached triggers one notification (then the target is cleared).
async function checkProductTabsAndTargets() {
  const found = [];
  const productTabs = await chrome.tabs.query({ url: "https://*.aliexpress.com/item/*" });
  for (const tab of productTabs) {
    const scan = await askTab(tab.id, "CARTIQ_PRODUCT_SCAN_REQUEST");
    if (scan?.ok && scan.product?.productId && typeof scan.product.price === "number") {
      found.push({ ...scan.product, quantity: 1 });
    }
  }
  const cartTabs = await chrome.tabs.query({ url: "https://*.aliexpress.com/p/shoppingcart/*" });
  for (const tab of cartTabs) {
    const scan = await askTab(tab.id, "CARTIQ_SCAN_REQUEST");
    if (scan?.ok) found.push(...scan.items);
  }
  if (found.length === 0) return;

  await recordSnapshot(found).catch(() => {});

  const targets = await getTargets();
  for (const item of found) {
    const target = targets[item.productId];
    if (target && typeof item.price === "number" && item.price <= target.price) {
      chrome.notifications.create(`cartiq-target-${item.productId}-${Date.now()}`, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("assets/icons/icon-128.png"),
        title: "CartIQ",
        message: `${safeNotifText(target.title || item.title)}: ${item.price.toFixed(2)} (target ${target.price.toFixed(2)})`,
      });
      await setTarget(item.productId, null);
    }
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PRICE_WATCH_ALARM) {
    checkCartTabsForChanges();
    checkProductTabsAndTargets();
  }
});

chrome.runtime.onInstalled.addListener(async (details) => {
  await syncWatchAlarm();
  // First install only: open Settings so the user sees the API-key step
  // right away, instead of discovering it only after clicking Scan and
  // hitting a dead end. Per STANDARDS.md §13.2 - no full onboarding wizard
  // inside the popup, just a redirect to the full settings page.
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});
chrome.runtime.onStartup.addListener(syncWatchAlarm);

// ---- Badge: small numeric signal only, per STANDARDS.md §13.1 ----

function updateBadge(tabId, duplicateCount) {
  const text = duplicateCount > 0 ? String(Math.min(duplicateCount, 99)) : "";
  chrome.action.setBadgeText({ tabId, text });
  if (duplicateCount > 0) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#DC2626" });
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`cartiq_snapshot_tab_${tabId}`);
});

// ---- Message router ----

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message?.type) {
    case "CARTIQ_ANALYZE_REQUEST":
      if (message.tabId != null) {
        updateBadge(message.tabId, message.duplicateGroups?.length || 0);
      }
      analyzeCart(message.items, message.duplicateGroups).then(sendResponse);
      return true;
    case "CARTIQ_COMPARE_TABS_REQUEST":
      compareOpenTabs().then((tabs) => sendResponse({ ok: true, tabs }));
      return true;
    case "CARTIQ_FIND_CHEAPER_REQUEST":
      findCheaperAlternatives(message.product).then(sendResponse);
      return true;
    case "CARTIQ_SELLER_TRUST_REQUEST":
      analyzeSellerTrust(message.product).then(sendResponse);
      return true;
    case "CARTIQ_WATCH_SETTING_CHANGED":
      syncWatchAlarm().then(() => sendResponse({ ok: true }));
      return true;
    default:
      return false;
  }
});
