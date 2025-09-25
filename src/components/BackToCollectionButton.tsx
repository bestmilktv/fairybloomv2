import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createCollectionPath } from '@/lib/slugify';

interface BackToCollectionButtonProps {
  productTags?: string[];
  fallbackCollectionHandle?: string;
  fallbackCollectionTitle?: string;
  productCollections?: Array<{
    handle: string;
    title: string;
  }>;
  productHandle?: string;
}

const BackToCollectionButton: React.FC<BackToCollectionButtonProps> = ({
  productTags,
  fallbackCollectionHandle,
  fallbackCollectionTitle,
  productCollections,
  productHandle,
}) => {
  // Extract collection tag from product tags, completely ignoring "Home page" tag
  const getCollectionTag = (tags: string[]): string | null => {
    if (!tags || tags.length === 0) {
      return null;
    }
    
    // Filter out "Home page" tag completely (case-insensitive, with trimming)
    const filteredTags = tags.filter(tag => {
      const normalizedTag = tag.toLowerCase().trim();
      return normalizedTag !== "home page" && normalizedTag !== "homepage" && normalizedTag !== "home";
    });
    
    const collectionTag = filteredTags.length > 0 ? filteredTags[0] : null;
    
    return collectionTag;
  };

  // Extract collection from product collections array, ignoring "Home page"
  const getCollectionFromCollections = (collections: Array<{handle: string; title: string}>): string | null => {
    if (!collections || collections.length === 0) {
      return null;
    }
    
    // Filter out "Home page" collection (case-insensitive, with trimming)
    const filteredCollections = collections.filter(collection => {
      const normalizedTitle = collection.title.toLowerCase().trim();
      const normalizedHandle = collection.handle.toLowerCase().trim();
      return normalizedTitle !== "home page" && normalizedTitle !== "homepage" && normalizedTitle !== "home" &&
             normalizedHandle !== "frontpage" && normalizedHandle !== "home-page";
    });
    
    const collection = filteredCollections.length > 0 ? filteredCollections[0] : null;
    
    return collection ? collection.title : null;
  };

  // Guess collection from product handle as last resort
  const guessCollectionFromHandle = (handle: string): string | null => {
    if (!handle) return null;
    
    const handleLower = handle.toLowerCase();
    // Common patterns in product handles - order matters, check more specific patterns first
    if (handleLower.includes('nahrdelnik') || handleLower.includes('necklace')) {
      return 'Náhrdelníky';
    }
    if (handleLower.includes('nausnice') || handleLower.includes('earring')) {
      return 'Náušnice';
    }
    if (handleLower.includes('prsten') || handleLower.includes('ring')) {
      return 'Prsteny';
    }
    // More comprehensive patterns for bracelets
    if (handleLower.includes('naramk') || handleLower.includes('bracelet') || 
        handleLower.includes('náramk') || handleLower.includes('náramky') ||
        handleLower.includes('naramky') || handleLower.includes('naramek')) {
      return 'Náramky';
    }
    return null;
  };

  // Get the collection from multiple sources
  const collectionTag = productTags ? getCollectionTag(productTags) : null;
  const collectionFromCollections = productCollections ? getCollectionFromCollections(productCollections) : null;
  const guessedCollection = productHandle ? guessCollectionFromHandle(productHandle) : null;
  
  let linkPath = '/';
  let buttonText = 'Zpět na hlavní stránku';
  
  // Priority 1: Use collection tag from product tags
  if (collectionTag) {
    linkPath = createCollectionPath(collectionTag);
    buttonText = `Zpět do ${collectionTag}`;
  }
  // Priority 2: Use collection from product collections array
  else if (collectionFromCollections) {
    linkPath = createCollectionPath(collectionFromCollections);
    buttonText = `Zpět do ${collectionFromCollections}`;
  }
  // Priority 3: Guess collection from product handle
  else if (guessedCollection) {
    linkPath = createCollectionPath(guessedCollection);
    buttonText = `Zpět do ${guessedCollection}`;
  }
  // Priority 4: Use fallback collection title (if not "Home page")
  else if (fallbackCollectionTitle) {
    const normalizedFallback = fallbackCollectionTitle.toLowerCase().trim();
    if (normalizedFallback !== "home page" && normalizedFallback !== "homepage" && normalizedFallback !== "home") {
      linkPath = createCollectionPath(fallbackCollectionTitle);
      buttonText = `Zpět do ${fallbackCollectionTitle}`;
    }
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

