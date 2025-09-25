/**
 * Utility function to create URL-friendly slugs
 * - Removes diacritics (accents)
 * - Converts to lowercase
 * - Replaces spaces with hyphens
 * - Removes special characters
 */

// Map of Czech diacritics to their base characters
const diacriticsMap: Record<string, string> = {
  'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ā': 'a', 'ă': 'a', 'ą': 'a', 'ǎ': 'a', 'å': 'a', 'ã': 'a',
  'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e', 'ē': 'e', 'ĕ': 'e', 'ė': 'e', 'ę': 'e', 'ě': 'e',
  'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i', 'ī': 'i', 'ĭ': 'i', 'į': 'i', 'ǐ': 'i',
  'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'ō': 'o', 'ŏ': 'o', 'ő': 'o', 'ǒ': 'o', 'ø': 'o', 'õ': 'o',
  'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u', 'ū': 'u', 'ŭ': 'u', 'ů': 'u', 'ű': 'u', 'ǔ': 'u',
  'ý': 'y', 'ỳ': 'y', 'ÿ': 'y', 'ŷ': 'y', 'ȳ': 'y',
  'č': 'c', 'ć': 'c', 'ç': 'c', 'ĉ': 'c', 'ċ': 'c',
  'ď': 'd', 'đ': 'd',
  'ň': 'n', 'ñ': 'n', 'ń': 'n',
  'ř': 'r', 'ŕ': 'r',
  'š': 's', 'ś': 's', 'ş': 's', 'ŝ': 's',
  'ť': 't', 'ţ': 't',
  'ž': 'z', 'ź': 'z', 'ż': 'z',
  'Á': 'A', 'À': 'A', 'Ä': 'A', 'Â': 'A', 'Ā': 'A', 'Ă': 'A', 'Ą': 'A', 'Ǎ': 'A', 'Å': 'A', 'Ã': 'A',
  'É': 'E', 'È': 'E', 'Ë': 'E', 'Ê': 'E', 'Ē': 'E', 'Ĕ': 'E', 'Ė': 'E', 'Ę': 'E', 'Ě': 'E',
  'Í': 'I', 'Ì': 'I', 'Ï': 'I', 'Î': 'I', 'Ī': 'I', 'Ĭ': 'I', 'Į': 'I', 'Ǐ': 'I',
  'Ó': 'O', 'Ò': 'O', 'Ö': 'O', 'Ô': 'O', 'Ō': 'O', 'Ŏ': 'O', 'Ő': 'O', 'Ǒ': 'O', 'Ø': 'O', 'Õ': 'O',
  'Ú': 'U', 'Ù': 'U', 'Ü': 'U', 'Û': 'U', 'Ū': 'U', 'Ŭ': 'U', 'Ů': 'U', 'Ű': 'U', 'Ǔ': 'U',
  'Ý': 'Y', 'Ỳ': 'Y', 'Ÿ': 'Y', 'Ŷ': 'Y', 'Ȳ': 'Y',
  'Č': 'C', 'Ć': 'C', 'Ç': 'C', 'Ĉ': 'C', 'Ċ': 'C',
  'Ď': 'D', 'Đ': 'D',
  'Ň': 'N', 'Ñ': 'N', 'Ń': 'N',
  'Ř': 'R', 'Ŕ': 'R',
  'Š': 'S', 'Ś': 'S', 'Ş': 'S', 'Ŝ': 'S',
  'Ť': 'T', 'Ţ': 'T',
  'Ž': 'Z', 'Ź': 'Z', 'Ż': 'Z'
};

/**
 * Removes diacritics from a string
 * @param str - The string to remove diacritics from
 * @returns String with diacritics removed
 */
function removeDiacritics(str: string): string {
  return str.replace(/[^\u0000-\u007E]/g, (char) => {
    return diacriticsMap[char] || char;
  });
}

/**
 * Creates a URL-friendly slug from a string
 * @param str - The string to slugify
 * @returns URL-friendly slug
 */
export function slugify(str: string): string {
  if (!str) return '';
  
  return str
    .toString()
    .toLowerCase()
    .trim()
    .split('')
    .map(char => diacriticsMap[char] || char)
    .join('')
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end
}

/**
 * Creates a slug from a collection name, handling Czech collections specifically
 * @param collectionName - The collection name to slugify
 * @returns URL-friendly slug
 */
export function slugifyCollection(collectionName: string): string {
  const slug = slugify(collectionName);
  
  // Handle specific Czech collection mappings
  const collectionMappings: Record<string, string> = {
    'nahrdelniky': 'nahrdelniky',
    'nausnice': 'nausnice',
    'prsteny': 'prsteny',
    'naramky': 'naramky'
  };
  
  return collectionMappings[slug] || slug;
}

/**
 * Reverses a slug back to a readable collection name
 * @param slug - The slug to reverse
 * @returns Readable collection name
 */
export function deslugifyCollection(slug: string): string {
  const reverseMappings: Record<string, string> = {
    'nahrdelniky': 'Náhrdelníky',
    'nausnice': 'Náušnice',
    'prsteny': 'Prsteny',
    'naramky': 'Náramky',
    'náhrdelníky': 'Náhrdelníky',
    'náušnice': 'Náušnice',
    'náramky': 'Náramky'
  };
  
  return reverseMappings[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * Add diacritics to a handle (for Czech collections)
 * @param handle - The handle to add diacritics to
 * @returns Handle with diacritics
 */
export function addDiacritics(handle: string): string {
  return handle
    .replace(/a/g, 'á')
    .replace(/i/g, 'í')
    .replace(/u/g, 'ú')
    .replace(/y/g, 'ý');
}

/**
 * Remove diacritics from a handle
 * @param handle - The handle to remove diacritics from
 * @returns Handle without diacritics
 */
export function removeDiacriticsFromHandle(handle: string): string {
  return handle
    .replace(/á/g, 'a')
    .replace(/í/g, 'i')
    .replace(/ú/g, 'u')
    .replace(/ý/g, 'y');
}
