import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createCollectionPath } from '@/lib/slugify';

interface BackToCollectionButtonProps {
  productTags?: string[];
  fallbackCollectionHandle?: string;
  fallbackCollectionTitle?: string;
}

const BackToCollectionButton: React.FC<BackToCollectionButtonProps> = ({
  productTags,
  fallbackCollectionHandle,
  fallbackCollectionTitle,
}) => {
  // BULLETPROOF: Extract collection tag from product tags, completely ignoring "Home page" tag
  const getValidCollectionTag = (tags: string[]): string | null => {
    if (!tags || tags.length === 0) {
      return null;
    }
    
    // Find the first tag that is NOT "Home page" (case-insensitive, with trimming)
    for (const tag of tags) {
      const normalizedTag = tag.toLowerCase().trim();
      if (normalizedTag !== "home page" && normalizedTag !== "homepage" && normalizedTag !== "home") {
        return tag; // Return the original tag (not normalized)
      }
    }
    
    return null; // No valid collection tag found
  };

  // BULLETPROOF: Get the collection tag and create the link
  const collectionTag = productTags ? getValidCollectionTag(productTags) : null;
  
  let linkPath = '/';
  let buttonText = 'Zpět na hlavní stránku';
  
  if (collectionTag) {
    // Use the collection tag (guaranteed to not be "Home page")
    linkPath = createCollectionPath(collectionTag);
    buttonText = `Zpět do ${collectionTag}`;
  } else if (fallbackCollectionHandle && fallbackCollectionTitle) {
    // Check if fallback title is also not "Home page"
    const normalizedFallback = fallbackCollectionTitle.toLowerCase().trim();
    if (normalizedFallback !== "home page" && normalizedFallback !== "homepage" && normalizedFallback !== "home") {
      linkPath = createCollectionPath(fallbackCollectionTitle);
      buttonText = `Zpět do ${fallbackCollectionTitle}`;
    }
    // If fallback is also "Home page", we'll use the default (home page link)
  }

  return (
    <Link
      to={linkPath}
      className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors duration-200 text-sm font-medium text-gray-700 hover:text-gray-900"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      {buttonText}
    </Link>
  );
};

export default BackToCollectionButton;