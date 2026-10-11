const PRODUCT_URL_RE = /\/item\/(\d+)\.html/;
const STORE_URL_RE = /\/store\/(\d+)/;
const PRICE_RE = /(?:US\s*\$|[$€£₪¥])\s*([\d,.]+)/;
const FEEDBACK_PCT_RE = /(\d{1,3}(?:\.\d+)?)\s*%/;
// Confirmed against a real product page (2026-09-21): the rating is not
// followed by "/5" or "out of 5" anywhere - it's a bare number immediately
// before the review count, e.g. "4.7  1370 Reviews". That combined pattern
// is checked first; the "/5"-style pattern is kept only as a fallback for
// layouts that might use it.
const RATING_WITH_REVIEWS_RE = /([0-5](?:\.\d)?)\s+([\d,]+)\s*(?:reviews|ratings)/i;
const RATING_RE = /\b([0-5]\.\d)\s*(?:\/\s*5|out of 5|★)/i;
const REVIEWS_COUNT_RE = /([\d,]+)\s*(?:reviews|ratings)/i;

function findPrice() {
  const bodyText = document.body.innerText || "";
  const match = bodyText.match(PRICE_RE);
  if (!match) return null;
  const numeric = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function findTitle() {
  // The page's first <h1> is the site logo/header ("Aliexpress"), not the
  // product title - confirmed against a real product page. The actual
  // title carries a stable `data-pl="product-title"` attribute.
  const titled = document.querySelector('h1[data-pl="product-title"]');
  if (titled?.textContent?.trim()) return titled.textContent.trim();
  if (document.title) return document.title.replace(/\s*[-|]\s*AliExpress.*$/i, "").trim();
  return (document.querySelector("h1")?.textContent || "").trim();
}

function findStore() {
  const candidates = Array.from(document.querySelectorAll('a[href*="/store/"]')).filter((a) =>
    STORE_URL_RE.test(a.href)
  );
  // Real markup has (at least) two links to the same store: a "Sold By X
  // (Trader)" combo link and a plain "X" link - prefer the plain one for a
  // clean display name.
  const link = candidates.find((a) => !/sold/i.test(a.textContent)) || candidates[0];
  if (!link) return { storeId: null, storeName: null, storeFeedbackPct: null };

  const storeId = link.href.match(STORE_URL_RE)[1];
  const storeName = link.textContent.trim() || null;

  // The feedback % lives in a `store-info-*` block that isn't necessarily
  // an ancestor of the store link, so it's found independently rather than
  // by walking up from `link`.
  const infoBlock = document.querySelector('[class*="store-info"]');
  const feedbackMatch = infoBlock ? (infoBlock.textContent || "").match(FEEDBACK_PCT_RE) : null;

  return {
    storeId,
    storeName,
    storeFeedbackPct: feedbackMatch ? parseFloat(feedbackMatch[1]) : null,
  };
}

function findRatingSignals() {
  const bodyText = document.body.innerText || "";
  const combined = bodyText.match(RATING_WITH_REVIEWS_RE);
  if (combined) {
    return { rating: parseFloat(combined[1]), reviewsCount: parseInt(combined[2].replace(/,/g, ""), 10) };
  }
  const ratingMatch = bodyText.match(RATING_RE);
  const reviewsMatch = bodyText.match(REVIEWS_COUNT_RE);
  return {
    rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
    reviewsCount: reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, ""), 10) : null,
  };
}

function scanProduct() {
  const productId = location.href.match(PRODUCT_URL_RE)?.[1] || null;
  const { storeId, storeName, storeFeedbackPct } = findStore();
  const { rating, reviewsCount } = findRatingSignals();

  return {
    productId,
    title: findTitle(),
    price: findPrice(),
    url: location.href.split("?")[0],
    // AliExpress has served product images from alicdn.com historically and
    // from aliexpress-media.com on the real page checked 2026-09-21 - match
    // both rather than assuming either one is current.
    image: document.querySelector('img[src*="alicdn"], img[src*="aliexpress-media.com"]')?.src || null,
    storeId,
    storeName,
    storeFeedbackPct,
    rating,
    reviewsCount,
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CARTIQ_PRODUCT_SCAN_REQUEST") {
    try {
      sendResponse({ ok: true, product: scanProduct() });
    } catch (error) {
      sendResponse({ ok: false, error: String(error) });
    }
    return true;
  }
  return false;
});
