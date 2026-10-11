import { initI18n, t } from "../shared/i18n.js";
import { applyTheme } from "../shared/theme.js";

function sendToBackground(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

// Titles/store names/images all come from third-party AliExpress pages, so
// every cell is built as a DOM node (textContent / property assignment)
// rather than interpolated into innerHTML - avoids any markup injection.
function bdiNode(text) {
  const el = document.createElement("bdi");
  el.textContent = text;
  return el;
}

function cell(content) {
  const td = document.createElement("td");
  if (content instanceof Node) {
    td.appendChild(content);
  } else if (content != null) {
    td.textContent = content;
  }
  return td;
}

function renderRow(tabData, isCheapest) {
  const tr = document.createElement("tr");
  if (isCheapest) tr.classList.add("cartiq-cheapest");

  let imageCellContent = null;
  if (tabData.image) {
    const img = document.createElement("img");
    img.src = tabData.image;
    img.alt = "";
    imageCellContent = img;
  }

  const priceCell = cell(
    typeof tabData.price === "number" ? bdiNode(`$${tabData.price.toFixed(2)}`) : "—"
  );
  priceCell.classList.add("cartiq-price");

  const ratingCell = cell(
    typeof tabData.rating === "number" ? bdiNode(`★ ${tabData.rating}`) : "—"
  );

  tr.appendChild(cell(imageCellContent));
  tr.appendChild(cell((tabData.title || "").slice(0, 60)));
  tr.appendChild(priceCell);
  tr.appendChild(cell(tabData.storeName || "—"));
  tr.appendChild(ratingCell);

  const actionsCell = document.createElement("td");

  const focusBtn = document.createElement("button");
  focusBtn.className = "cartiq-btn-ghost";
  focusBtn.textContent = t("compare_focusTab");
  focusBtn.addEventListener("click", () => chrome.tabs.update(tabData.tabId, { active: true }));
  actionsCell.appendChild(focusBtn);

  const cheaperBtn = document.createElement("button");
  cheaperBtn.className = "cartiq-btn-ghost";
  cheaperBtn.textContent = t("popup_findCheaper");
  cheaperBtn.addEventListener("click", async () => {
    cheaperBtn.disabled = true;
    const result = await sendToBackground({ type: "CARTIQ_FIND_CHEAPER_REQUEST", product: tabData });
    cheaperBtn.disabled = false;
    if (result?.ok && result.alternatives.length > 0) {
      const best = result.alternatives[0];
      alert(`${t("popup_findCheaper")}: $${best.price.toFixed(2)} — ${best.title.slice(0, 60)}`);
      chrome.tabs.create({ url: best.url });
    } else {
      alert(t("compare_noCheaperFound"));
    }
  });
  actionsCell.appendChild(cheaperBtn);

  tr.appendChild(actionsCell);

  return tr;
}

async function loadComparison() {
  const table = document.getElementById("compareTable");
  const empty = document.getElementById("emptyState");
  const body = document.getElementById("compareBody");
  body.innerHTML = "";

  const result = await sendToBackground({ type: "CARTIQ_COMPARE_TABS_REQUEST" });
  const tabs = result?.tabs || [];

  if (tabs.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  table.hidden = false;

  const sorted = [...tabs].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  const cheapestPrice = sorted.find((row) => typeof row.price === "number")?.price;

  sorted.forEach((tabData) => {
    body.appendChild(renderRow(tabData, tabData.price === cheapestPrice));
  });
}

async function init() {
  await initI18n();
  await applyTheme();
  document.getElementById("refreshBtn").addEventListener("click", loadComparison);
  await loadComparison();
}

init();
