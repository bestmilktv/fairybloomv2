import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Determines the primary collection for a product based on its tags
 * Filters out "Home page" tag and uses the first non-home-page tag
 * @param tags - Array of product tags
 * @param collections - Array of product collections
 * @returns Object with collection handle and title, or null if no valid collection found
 */
export function getPrimaryCollectionFromTags(
  tags: string[], 
  collections: Array<{ handle: string; title: string }>
): { handle: string; title: string } | null {
  if (!tags || tags.length === 0 || !collections || collections.length === 0) {
    return null;
  }

  // Filter out "Home page" tag (case-insensitive)
  const filteredTags = tags.filter(tag => 
    tag.toLowerCase() !== "home page"
  );

  if (filteredTags.length === 0) {
    // If no non-home-page tags, fall back to first collection
    return collections[0];
  }

  // Find collection that matches the first non-home-page tag
  const primaryTag = filteredTags[0];
  const matchingCollection = collections.find(collection => 
    collection.title.toLowerCase() === primaryTag.toLowerCase() ||
    collection.handle.toLowerCase() === primaryTag.toLowerCase()
  );

  // If no exact match, try to find a collection with similar name
  if (!matchingCollection) {
    const similarCollection = collections.find(collection => 
      collection.title.toLowerCase().includes(primaryTag.toLowerCase()) ||
      primaryTag.toLowerCase().includes(collection.title.toLowerCase())
    );
    
    if (similarCollection) {
      return similarCollection;
    }
  }

  return matchingCollection || collections[0];
}
