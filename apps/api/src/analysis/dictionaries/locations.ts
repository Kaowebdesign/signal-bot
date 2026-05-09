export const KYIV_STREETS: string[] = [
  'хрещатик',
  'бандери',
  'перемоги',
  'шевченка',
  'льва толстого',
  'саксаганського',
  'велика васильківська',
  'антоновича',
  'жилянська',
  'володимирська',
  'богдана хмельницького',
  'сагайдачного',
  'набережно-хрещатицька',
  'грушевського',
  'інститутська',
  'городецького',
  'лесі українки',
  'дружби народів',
  'харківське шосе',
  'броварський проспект',
  'столичне шосе',
  'південний міст',
  'міст патона',
  'міст метро',
  'позняки',
  'оболонь',
  'теремки',
  'борщагівка',
  'виноградар',
  'троєщина',
  'дарниця',
  'лівобережна',
  'подол',
  'печерськ',
  'сирець',
  'нивки',
  'берестейська',
  'чоколівський',
  'науки',
  'палладіна',
];

function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/ї/g, 'и')
    .replace(/і/g, 'и')
    .replace(/є/g, 'е')
    .replace(/ґ/g, 'г')
    .replace(/'/g, '')
    .replace(/'/g, '')
    .trim();
}

export function extractLocations(
  normalizedText: string,
  knownLocations: string[],
): string[] {
  const normalizedInput = normalizeForMatching(normalizedText);
  const matched: string[] = [];

  for (const location of knownLocations) {
    const normalizedLocation = normalizeForMatching(location);

    if (normalizedLocation.length < 3) {
      continue;
    }

    if (normalizedInput.includes(normalizedLocation)) {
      matched.push(location);
      continue;
    }

    // Fuzzy: check if at least 80% of the location chars match a substring
    const threshold = Math.floor(normalizedLocation.length * 0.8);
    if (normalizedLocation.length >= 5) {
      for (
        let i = 0;
        i <= normalizedInput.length - threshold;
        i++
      ) {
        const window = normalizedInput.slice(i, i + normalizedLocation.length);
        let matchCount = 0;
        for (let j = 0; j < Math.min(window.length, normalizedLocation.length); j++) {
          if (window[j] === normalizedLocation[j]) {
            matchCount++;
          }
        }
        if (matchCount >= threshold) {
          matched.push(location);
          break;
        }
      }
    }
  }

  return [...new Set(matched)];
}
