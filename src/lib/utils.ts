import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Simple slugify function to create URL-friendly strings
 * Handles Czech characters properly
 * @param text - Text to slugify
 * @returns URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace Czech characters with their ASCII equivalents
    .replace(/á/g, 'a')
    .replace(/č/g, 'c')
    .replace(/ď/g, 'd')
    .replace(/é/g, 'e')
    .replace(/ě/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ň/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ř/g, 'r')
    .replace(/š/g, 's')
    .replace(/ť/g, 't')
    .replace(/ú/g, 'u')
    .replace(/ů/g, 'u')
    .replace(/ý/g, 'y')
    .replace(/ž/g, 'z')
    .replace(/[^\w\s-]/g, '') // Remove remaining special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Determines the primary collection for a product based on its tags
 * Filters out "Home page" tag and uses the first non-home-page tag
 * @param tags - Array of product tags
 * @returns Object with collection slug and title, or null if no valid category found
 */
export function getPrimaryCollectionFromTags(tags: string[]): { slug: string; title: string } | null {
  if (!tags || tags.length === 0) {
    return null;
  }

  // Filter out "Home page" tag (case-insensitive)
  const filteredTags = tags.filter(tag => 
    tag.toLowerCase() !== "home page"
  );

  if (filteredTags.length === 0) {
    // If only "Home page" tag exists, return null (no button)
    return null;
  }

  // Use the first non-home-page tag
  const primaryTag = filteredTags[0];
  const collectionSlug = slugify(primaryTag);
  
  return {
    slug: collectionSlug,
    title: primaryTag
  };
}

/**
 * Alternative function that always returns a collection if any tags exist
 * This ensures the button always appears when there are tags
 * @param tags - Array of product tags
 * @returns Object with collection slug and title
 */
export function getCollectionFromTags(tags: string[]): { slug: string; title: string } | null {
  if (!tags || tags.length === 0) {
    return null;
  }

  // Filter out "Home page" tag (case-insensitive)
  const filteredTags = tags.filter(tag => 
    tag.toLowerCase() !== "home page"
  );

  // Use the first non-home-page tag if available, otherwise use the first tag
  const primaryTag = filteredTags.length > 0 ? filteredTags[0] : tags[0];
  const collectionSlug = slugify(primaryTag);
  
  return {
    slug: collectionSlug,
    title: primaryTag
  };
}
