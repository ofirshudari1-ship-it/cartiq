function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .sort();
}

function jaccardSimilarity(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((word) => setB.has(word)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export const DEFAULT_SIMILARITY_THRESHOLD = 0.6;

export function findDuplicateGroups(items, similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD) {
  const groups = [];
  const usedIds = new Set();

  for (let i = 0; i < items.length; i++) {
    if (usedIds.has(items[i].id)) continue;

    const group = [items[i]];
    const tokensA = normalizeTitle(items[i].title);

    for (let j = i + 1; j < items.length; j++) {
      if (usedIds.has(items[j].id)) continue;

      const exactSameProduct = items[i].productId && items[i].productId === items[j].productId;
      const tokensB = normalizeTitle(items[j].title);
      const similarTitle = jaccardSimilarity(tokensA, tokensB) >= similarityThreshold;

      if (exactSameProduct || similarTitle) {
        group.push(items[j]);
        usedIds.add(items[j].id);
      }
    }

    if (group.length > 1) {
      usedIds.add(items[i].id);
      groups.push(group);
    }
  }

  return groups;
}
