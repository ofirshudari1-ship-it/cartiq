const PRODUCT_URL_RE = /\/item\/(\d+)\.html/;
const STORE_URL_RE = /\/store\/(\d+)/;
const PRICE_RE = /(?:US\s*\$|[$€£₪¥])\s*([\d,.]+)/;
const QTY_RE = /(?:x|×|qty|quantity)\s*[:\s]?\s*(\d+)/i;

// Confirmed against a real, logged-in cart (2026-09-21): the actual cart
// rows live inside a `.cart-list` container, while AliExpress also renders
// a "more to love" recommendation carousel full of unrelated /item/ links
// further down the SAME page. Scoping to `.cart-list` (and defensively
// excluding anything still inside `.cart-recommend`) is what keeps the scan
// from reporting 20+ recommended products as if they were in the cart.
function getCartScope() {
  return document.querySelector(".cart-list") || document.body;
}

function parsePrice(text) {
  const match = text.match(PRICE_RE);
  if (!match) return null;
  const numeric = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function findPriceInRow(row) {
  // Real markup renders each price digit as its own <span> for scraping
  // resistance, but also exposes a clean value via aria-label on the
  // wrapping element - prefer that when present, since it can't be thrown
  // off by an unrelated number (e.g. the crossed-out original price)
  // appearing earlier in reading order than the actual current price.
  for (const el of row.querySelectorAll("[aria-label]")) {
    const price = parsePrice(el.getAttribute("aria-label") || "");
    if (price !== null) return price;
  }
  return parsePrice(row.textContent || "");
}

function findRowContainer(anchor) {
  let node = anchor;
  for (let depth = 0; depth < 8 && node.parentElement; depth++) {
    node = node.parentElement;
    const text = node.textContent || "";
    if (findPriceInRow(node) !== null && text.length < 4000) {
      return node;
    }
  }
  return anchor.parentElement || anchor;
}

function findNearestStoreName(row) {
  let node = row;
  for (let steps = 0; steps < 6 && node; steps++) {
    const storeLink = node.querySelector?.('a[href*="/store/"]');
    if (storeLink && STORE_URL_RE.test(storeLink.href)) {
      return {
        storeId: storeLink.href.match(STORE_URL_RE)[1],
        storeName: storeLink.textContent.trim() || null,
      };
    }
    node = node.previousElementSibling || node.parentElement;
  }
  return { storeId: null, storeName: null };
}

function findQuantity(row) {
  const input = row.querySelector('input[type="number"], input[type="text"][value]');
  if (input && input.value && /^\d+$/.test(input.value.trim())) {
    return parseInt(input.value.trim(), 10);
  }
  const match = (row.textContent || "").match(QTY_RE);
  return match ? parseInt(match[1], 10) : 1;
}

function scanCart() {
  const scope = getCartScope();
  const productLinks = Array.from(scope.querySelectorAll('a[href*="/item/"]')).filter(
    (a) => PRODUCT_URL_RE.test(a.href) && !a.closest(".cart-recommend")
  );

  // A product row is wrapped by more than one <item> link (the thumbnail
  // image and the title are separate anchors, confirmed against a real
  // cart), and walking up from each can land on a *different* ancestor
  // node - so grouping by row-container object identity under-deduplicates.
  // Group by product id instead, and within each group keep whichever
  // anchor has the longest text (the title link; the image link's text is
  // often a short badge like "Only 1 left", not the actual product name).
  const rows = new Map();
  for (const link of productLinks) {
    const productId = link.href.match(PRODUCT_URL_RE)?.[1];
    if (!productId) continue;
    const row = findRowContainer(link);
    const text = (link.textContent || "").trim();
    const existing = rows.get(productId);
    if (!existing || text.length > existing.text.length) {
      rows.set(productId, { link, row, text, productId });
    }
  }

  const items = [];
  for (const { link, row, text, productId } of rows.values()) {
    const title = text || link.title?.trim() || `Item ${productId}`;
    const price = findPriceInRow(row);
    const quantity = findQuantity(row);
    const { storeId, storeName } = findNearestStoreName(row);
    const image = row.querySelector("img")?.src || null;

    items.push({
      id: `${productId}-${items.length}`,
      productId,
      title,
      price,
      quantity,
      storeId,
      storeName,
      image,
      url: link.href.split("?")[0],
    });
  }

  return items;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CARTIQ_SCAN_REQUEST") {
    try {
      const items = scanCart();
      sendResponse({ ok: true, items });
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
    return true;
  }
  return false;
});
