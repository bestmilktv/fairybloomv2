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
 * @returns Object with collection slug and title, or fallback collection
 */
export function getPrimaryCollectionFromTags(tags: string[]): { slug: string; title: string } {
  if (!tags || tags.length === 0) {
    // Fallback to a default collection
    return {
      slug: 'vsechny-produkty',
      title: 'Všechny produkty'
    };
  }

  // Filter out "Home page" tag (case-insensitive)
  const filteredTags = tags.filter(tag => 
    tag.toLowerCase() !== "home page"
  );

  if (filteredTags.length === 0) {
    // If only "Home page" tag exists, use the first tag as fallback
    const fallbackTag = tags[0];
    return {
      slug: slugify(fallbackTag),
      title: fallbackTag
    };
  }

  // Use the first non-home-page tag
  const primaryTag = filteredTags[0];
  const collectionSlug = slugify(primaryTag);
  
  return {
    slug: collectionSlug,
    title: primaryTag
  };
}
