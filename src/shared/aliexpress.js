export const PRODUCT_URL_RE = /\/item\/(\d+)\.html/;
export const STORE_URL_RE = /\/store\/(\d+)/;
export const PRICE_RE = /(?:US\s*\$|[$€£₪¥])\s*([\d,.]+)/;

export function extractProductId(url) {
  return url.match(PRODUCT_URL_RE)?.[1] || null;
}

export function findPriceInText(text) {
  const match = text.match(PRICE_RE);
  if (!match) return null;
  const numeric = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "this", "that", "new", "free", "shipping",
  "pcs", "pc", "set", "lot", "size", "color", "colour",
]);

export function normalizeTitleForSearch(title, maxWords = 6) {
  const words = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return words.slice(0, maxWords).join(" ");
}

export function buildSearchUrl(query) {
  return `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;
}
