/**
 * Comprehensive slugify utility function
 * Removes diacritics, converts to lowercase, and creates URL-friendly slugs
 */

// Diacritics mapping for Czech and other common characters
const diacriticsMap: Record<string, string> = {
  // Czech diacritics
  'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i', 'ň': 'n', 'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y', 'ž': 'z',
  'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I', 'Ň': 'N', 'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U', 'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z',
  
  // Other common diacritics (avoiding duplicates with Czech)
  'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae', 'ç': 'c', 'è': 'e', 'ê': 'e', 'ë': 'e', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ð': 'd', 'ñ': 'n', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u', 'þ': 'th', 'ÿ': 'y',
  'À': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE', 'Ç': 'C', 'È': 'E', 'Ê': 'E', 'Ë': 'E', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
  'Ð': 'D', 'Ñ': 'N', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O', 'Ù': 'U', 'Û': 'U', 'Ü': 'U', 'Þ': 'TH', 'Ÿ': 'Y'
};

/**
 * Remove diacritics from a string
 * @param str - Input string
 * @returns String with diacritics removed
 */
function removeDiacritics(str: string): string {
  return str.replace(/[^\u0000-\u007E]/g, (char) => {
    return diacriticsMap[char] || char;
  });
}

/**
 * Convert a string to a URL-friendly slug
 * @param str - Input string
 * @returns URL-friendly slug
 */
export function slugify(str: string): string {
  if (!str) return '';
  
  return str
    .toString()
    .trim()
    // Remove diacritics
    .split('')
    .map(char => diacriticsMap[char] || char)
    .join('')
    // Convert to lowercase
    .toLowerCase()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove all non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Create a collection handle from a collection name
 * @param collectionName - Collection name (e.g., "Náušnice")
 * @returns URL-friendly handle (e.g., "nausnice")
 */
export function createCollectionHandle(collectionName: string): string {
  return slugify(collectionName);
}

/**
 * Create a product handle from a product title
 * @param productTitle - Product title
 * @returns URL-friendly handle
 */
export function createProductHandle(productTitle: string): string {
  return slugify(productTitle);
}

/**
 * Create a collection URL path
 * @param collectionName - Collection name
 * @returns URL path (e.g., "/nausnice")
 */
export function createCollectionPath(collectionName: string): string {
  return `/${createCollectionHandle(collectionName)}`;
}

/**
 * Create a product URL path
 * @param productHandle - Product handle
 * @returns URL path (e.g., "/produkt/example-product")
 */
export function createProductPath(productHandle: string): string {
  return `/produkt/${createProductHandle(productHandle)}`;
}
