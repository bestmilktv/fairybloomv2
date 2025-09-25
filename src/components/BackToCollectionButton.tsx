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
  // Extract collection tag from product tags, completely ignoring "Home page" tag
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

  // AGGRESSIVE: Try multiple sources to find a collection
  let collectionName = null;
  let linkPath = '/';
  let buttonText = 'Zpět na hlavní stránku';
  
  // Method 1: Try to get collection from product tags
  if (productTags && productTags.length > 0) {
    collectionName = getValidCollectionTag(productTags);
    if (collectionName) {
      console.log('BackToCollectionButton: Found collection from tags:', collectionName);
    }
  }
  
  // Method 2: If no collection from tags, try fallback collection title
  if (!collectionName && fallbackCollectionTitle) {
    const normalizedFallback = fallbackCollectionTitle.toLowerCase().trim();
    if (normalizedFallback !== "home page" && normalizedFallback !== "homepage" && normalizedFallback !== "home") {
      collectionName = fallbackCollectionTitle;
      console.log('BackToCollectionButton: Found collection from fallback:', collectionName);
    }
  }
  
  // Method 3: If still no collection, try to extract from fallback handle
  if (!collectionName && fallbackCollectionHandle) {
    // Map common handles to collection names
    const handleToCollectionMap: Record<string, string> = {
      'nahrdelniky': 'Náhrdelníky',
      'nausnice': 'Náušnice', 
      'prsteny': 'Prsteny',
      'naramky': 'Náramky',
      'necklaces': 'Náhrdelníky',
      'earrings': 'Náušnice',
      'rings': 'Prsteny',
      'bracelets': 'Náramky'
    };
    
    const mappedCollection = handleToCollectionMap[fallbackCollectionHandle.toLowerCase()];
    if (mappedCollection) {
      collectionName = mappedCollection;
      console.log('BackToCollectionButton: Found collection from handle mapping:', collectionName);
    }
  }
  
  // Final result
  if (collectionName) {
    linkPath = createCollectionPath(collectionName);
    buttonText = `Zpět do ${collectionName}`;
  }
  
  console.log('BackToCollectionButton: Final result:', {
    productTags,
    fallbackCollectionHandle,
    fallbackCollectionTitle,
    collectionName,
    linkPath,
    buttonText
  });

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