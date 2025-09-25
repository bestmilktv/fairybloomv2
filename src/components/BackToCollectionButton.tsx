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
    
    console.log('BackToCollectionButton - Input tags:', tags);
    
    // Filter out "Home page" tag completely (case-insensitive, with trimming)
    const filteredTags = tags.filter(tag => {
      const normalizedTag = tag.toLowerCase().trim();
      return normalizedTag !== "home page" && normalizedTag !== "homepage" && normalizedTag !== "home";
    });
    console.log('BackToCollectionButton - Filtered tags (without Home page):', filteredTags);
    
    const collectionTag = filteredTags.length > 0 ? filteredTags[0] : null;
    console.log('BackToCollectionButton - Selected collection tag:', collectionTag);
    
    return collectionTag;
  };

  // Extract collection from product collections array, ignoring "Home page"
  const getCollectionFromCollections = (collections: Array<{handle: string; title: string}>): string | null => {
    if (!collections || collections.length === 0) {
      return null;
    }
    
    console.log('BackToCollectionButton - Input collections:', collections);
    
    // Filter out "Home page" collection (case-insensitive, with trimming)
    const filteredCollections = collections.filter(collection => {
      const normalizedTitle = collection.title.toLowerCase().trim();
      const normalizedHandle = collection.handle.toLowerCase().trim();
      return normalizedTitle !== "home page" && normalizedTitle !== "homepage" && normalizedTitle !== "home" &&
             normalizedHandle !== "frontpage" && normalizedHandle !== "home-page";
    });
    console.log('BackToCollectionButton - Filtered collections (without Home page):', filteredCollections);
    
    const collection = filteredCollections.length > 0 ? filteredCollections[0] : null;
    console.log('BackToCollectionButton - Selected collection:', collection);
    
    return collection ? collection.title : null;
  };

  // Guess collection from product handle as last resort
  const guessCollectionFromHandle = (handle: string): string | null => {
    if (!handle) return null;
    
    const handleLower = handle.toLowerCase();
    console.log('BackToCollectionButton - Guessing collection from handle:', handle);
    
    // Common patterns in product handles
    if (handleLower.includes('nahrdelnik') || handleLower.includes('necklace')) {
      return 'Náhrdelníky';
    }
    if (handleLower.includes('nausnice') || handleLower.includes('earring')) {
      return 'Náušnice';
    }
    if (handleLower.includes('prsten') || handleLower.includes('ring')) {
      return 'Prsteny';
    }
    if (handleLower.includes('naramk') || handleLower.includes('bracelet')) {
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
  
  console.log('BackToCollectionButton - Final logic:', {
    productTags,
    collectionTag,
    productCollections,
    collectionFromCollections,
    productHandle,
    guessedCollection,
    fallbackCollectionHandle,
    fallbackCollectionTitle
  });
  
  console.log('BackToCollectionButton - Available collections for filtering:', productCollections);
  
  // Priority 1: Use collection tag from product tags
  if (collectionTag) {
    linkPath = createCollectionPath(collectionTag);
    buttonText = `Zpět do ${collectionTag}`;
    console.log('BackToCollectionButton - Using collection tag:', collectionTag, '->', linkPath);
  }
  // Priority 2: Use collection from product collections array
  else if (collectionFromCollections) {
    linkPath = createCollectionPath(collectionFromCollections);
    buttonText = `Zpět do ${collectionFromCollections}`;
    console.log('BackToCollectionButton - Using collection from collections:', collectionFromCollections, '->', linkPath);
  }
  // Priority 3: Guess collection from product handle
  else if (guessedCollection) {
    linkPath = createCollectionPath(guessedCollection);
    buttonText = `Zpět do ${guessedCollection}`;
    console.log('BackToCollectionButton - Using guessed collection:', guessedCollection, '->', linkPath);
  }
  // Priority 4: Use fallback collection title (if not "Home page")
  else if (fallbackCollectionTitle) {
    const normalizedFallback = fallbackCollectionTitle.toLowerCase().trim();
    if (normalizedFallback !== "home page" && normalizedFallback !== "homepage" && normalizedFallback !== "home") {
      linkPath = createCollectionPath(fallbackCollectionTitle);
      buttonText = `Zpět do ${fallbackCollectionTitle}`;
      console.log('BackToCollectionButton - Using fallback title:', fallbackCollectionTitle, '->', linkPath);
    } else {
      console.log('BackToCollectionButton - Fallback title is also "Home page", using homepage');
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

