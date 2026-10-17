// Local price history + cart summaries. Pure functions plus storage helpers;
// everything stays in chrome.storage.local (never sent anywhere).

const HISTORY_KEY = "cartiq_price_history";
const MAX_PRODUCTS = 300;
const MAX_POINTS = 40;

export function itemTotal(item) {
  return typeof item.price === "number" ? item.price * (item.quantity || 1) : 0;
}

export function cartTotal(items) {
  return items.reduce((sum, i) => sum + itemTotal(i), 0);
}

// Groups items by seller; sellers with 2+ items are consolidation candidates.
export function groupBySeller(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.storeId || item.storeName || "";
    if (!map.has(key)) map.set(key, { storeName: item.storeName || "", items: [], subtotal: 0 });
    const g = map.get(key);
    g.items.push(item);
    g.subtotal += itemTotal(item);
  }
  return [...map.values()].sort((a, b) => b.subtotal - a.subtotal);
}

// Records current prices and returns per-item change info vs history.
export function applySnapshot(history, items, now = Date.now()) {
  const changes = [];
  for (const item of items) {
    if (typeof item.price !== "number") continue;
    const entry = history[item.productId] || { title: item.title, points: [] };
    const last = entry.points[entry.points.length - 1];
    const prices = entry.points.map((p) => p[1]);
    const low = prices.length ? Math.min(...prices) : null;
    const high = prices.length ? Math.max(...prices) : null;
    if (last && last[1] !== item.price) {
      changes.push({
        productId: item.productId,
        title: item.title,
        from: last[1],
        to: item.price,
        low: Math.min(low, item.price),
        high: Math.max(high, item.price),
        atLow: item.price <= low,
      });
    }
    if (!last || last[1] !== item.price) entry.points.push([now, item.price]);
    entry.points = entry.points.slice(-MAX_POINTS);
    entry.title = item.title;
    entry.seen = now;
    history[item.productId] = entry;
  }
  const ids = Object.keys(history);
  if (ids.length > MAX_PRODUCTS) {
    ids.sort((a, b) => (history[a].seen || 0) - (history[b].seen || 0));
    ids.slice(0, ids.length - MAX_PRODUCTS).forEach((id) => delete history[id]);
  }
  return changes;
}

export async function recordSnapshot(items) {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  const history = stored[HISTORY_KEY] || {};
  const changes = applySnapshot(history, items);
  await chrome.storage.local.set({ [HISTORY_KEY]: history });
  return changes;
}

export function toCsv(items) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["title", "price", "quantity", "seller", "url"]];
  items.forEach((i) => rows.push([i.title, i.price ?? "", i.quantity ?? 1, i.storeName ?? "", i.url]));
  return "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\n");
}
