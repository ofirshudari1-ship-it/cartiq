export async function getTheme() {
  const stored = await chrome.storage.local.get("cartiq_theme");
  return ["light", "dark", "system"].includes(stored.cartiq_theme) ? stored.cartiq_theme : "system";
}

export async function setTheme(theme) {
  await chrome.storage.local.set({ cartiq_theme: theme });
}

export async function applyTheme() {
  const theme = await getTheme();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  return resolved;
}
