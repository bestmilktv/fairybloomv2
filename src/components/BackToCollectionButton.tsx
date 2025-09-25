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

  // Get the collection tag and create the link
  const collectionTag = productTags ? getCollectionTag(productTags) : null;
  
  let linkPath = '/';
  let buttonText = 'Zpět na hlavní stránku';
  
  console.log('BackToCollectionButton - Final logic:', {
    productTags,
    collectionTag,
    fallbackCollectionHandle,
    fallbackCollectionTitle
  });
  
  if (collectionTag) {
    // Use our custom slugify to create URL-friendly path from the collection tag
    linkPath = createCollectionPath(collectionTag);
    buttonText = `Zpět do ${collectionTag}`;
    console.log('BackToCollectionButton - Using collection tag:', collectionTag, '->', linkPath);
  } else if (fallbackCollectionTitle) {
    // Fallback to the collection title if no valid tags found
    // Make sure the fallback title is not "Home page" either
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

