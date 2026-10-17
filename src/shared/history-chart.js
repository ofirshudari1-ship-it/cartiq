// Price-history read helpers, verdict logic, sparkline chart and per-product
// target prices. Data lives only in chrome.storage.local.

const HISTORY_KEY = "cartiq_price_history";
const TARGETS_KEY = "cartiq_price_targets";

export async function getPoints(productId) {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  return stored[HISTORY_KEY]?.[productId]?.points || [];
}

// Compares the current price with what CartIQ has seen before.
export function priceVerdict(points, price) {
  const prices = points.map((p) => p[1]);
  if (prices.length < 2) return { key: "new" };
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  if (price <= low) return { key: "low", low, high };
  if (high > low && price >= high) return { key: "high", low, high };
  return { key: "fair", low, high };
}

export function sparkline(points, width = 280, height = 56) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height);
  svg.setAttribute("role", "img");
  if (points.length < 2) return svg;
  const prices = points.map((p) => p[1]);
  const min = Math.min(...prices);
  const span = Math.max(...prices) - min || 1;
  const pad = 6;
  const coords = points.map((p, i) => [
    pad + (i / (points.length - 1)) * (width - pad * 2),
    height - pad - ((p[1] - min) / span) * (height - pad * 2),
  ]);
  const line = document.createElementNS(ns, "polyline");
  line.setAttribute("points", coords.map((c) => c.join(",")).join(" "));
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "currentColor");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-linejoin", "round");
  svg.appendChild(line);
  const last = coords[coords.length - 1];
  const dot = document.createElementNS(ns, "circle");
  dot.setAttribute("cx", last[0]);
  dot.setAttribute("cy", last[1]);
  dot.setAttribute("r", "3.5");
  dot.setAttribute("fill", "currentColor");
  svg.appendChild(dot);
  return svg;
}

export async function getTargets() {
  const stored = await chrome.storage.local.get(TARGETS_KEY);
  return stored[TARGETS_KEY] || {};
}

export async function setTarget(productId, target) {
  const targets = await getTargets();
  if (target === null) delete targets[productId];
  else targets[productId] = target;
  await chrome.storage.local.set({ [TARGETS_KEY]: targets });
}
