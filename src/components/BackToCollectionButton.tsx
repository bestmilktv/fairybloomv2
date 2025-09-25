import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import slugify from 'slugify';

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
  // Extract collection tag from product tags, ignoring "Home page" tag
  const getCollectionTag = (tags: string[]): string | null => {
    if (!tags || tags.length === 0) {
      return null;
    }
    
    // Find the first tag that is not "Home page"
    const collectionTag = tags.find(tag => tag !== "Home page");
    return collectionTag || null;
  };

  // Get the collection tag and create the link
  const collectionTag = productTags ? getCollectionTag(productTags) : null;
  
  let linkPath = '/';
  let buttonText = 'Zpět na hlavní stránku';
  
  if (collectionTag) {
    // Use slugify to create URL-friendly handle from the collection tag
    const collectionHandle = slugify(collectionTag, { lower: true, strict: true });
    linkPath = `/${collectionHandle}`;
    buttonText = `Zpět do ${collectionTag}`;
  } else if (fallbackCollectionHandle && fallbackCollectionTitle) {
    // Fallback to the old logic if no valid tags found
    linkPath = `/${fallbackCollectionHandle}`;
    buttonText = `Zpět do ${fallbackCollectionTitle}`;
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

