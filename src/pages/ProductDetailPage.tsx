import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Heart } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { ProductRecommendations } from '@/components/ProductRecommendations';

// Import product images
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState(0);
  const [animatingToCart, setAnimatingToCart] = useState(false);
  const productImageRef = useRef<HTMLImageElement>(null);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [productId]);

  // All products data (this could be moved to a data file or context)
  const allProducts = {
    // Náhrdelníky
    'n1': {
      id: 'n1',
      title: 'Růžové okvětí',
      price: '2 890 Kč',
      images: [necklaceImage, necklaceImage, necklaceImage],
      category: 'Náhrdelníky',
      categoryPath: '/nahrdelníky',
      shortDescription: 'Jemný náhrdelník s růžovými okvětními lístky v průzračné pryskyřici.',
      fullDescription: 'Tento jedinečný náhrdelník zachycuje křehkou krásu růžových okvětních lístků v průzračné pryskyřici nejvyšší kvality. Každý kousek je ručně vyráběn s láskou k detailu, přičemž skutečné květy jsou pečlivě vybírány a konzervovány v dokonalém stavu. Náhrdelník je dodáván s elegantním řetízkem z chirurgické oceli a je ideální pro každodenní nošení i speciální příležitosti.'
    },
    'n2': {
      id: 'n2',
      title: 'Lesní kapradina',
      price: '3 200 Kč',
      images: [necklaceImage, necklaceImage],
      category: 'Náhrdelníky',
      categoryPath: '/nahrdelníky',
      shortDescription: 'Minimalistický design s jemnou kapradinou z českých lesů.',
      fullDescription: 'Inspirovaný klidem českých lesů, tento náhrdelník obsahuje jemné listy kapradiny zachycené v čisté pryskyřici. Minimalistický design zdůrazňuje přírodní krásu a organické tvary rostliny. Perfektní volba pro milovníky přírody a jednoduché elegance.'
    },
    'n3': {
      id: 'n3',
      title: 'Loučka v létě',
      price: '2 650 Kč',
      images: [necklaceImage],
      category: 'Náhrdelníky',
      categoryPath: '/nahrdelníky',
      shortDescription: 'Barevná směs lučních květů zachycená v elegantním náhrdelníku.',
      fullDescription: 'Zachycuje podstatu letní louky s pestrou směsí drobných lučních květů. Každý náhrdelník je jedinečný díky přirozené variabilitě květů. Barvy se pohybují od jemných bílých a žlutých po sytější modré a fialové tóny.'
    },
    // Náušnice
    'e1': {
      id: 'e1',
      title: 'Pomněnkové kapky',
      price: '1 890 Kč',
      images: [earringsImage, earringsImage],
      category: 'Náušnice',
      categoryPath: '/nausnice',
      shortDescription: 'Drobné náušnice s modrými pomněnkami v kapkovitém tvaru.',
      fullDescription: 'Tyto půvabné náušnice ve tvaru kapky obsahují skutečné modré pomněnky - symbol věrné lásky a vzpomínek. Kapkovitý tvar dokonale doplňuje jemnost květů a vytváří elegantní doplněk vhodný pro každý den.'
    },
    'e2': {
      id: 'e2',
      title: 'Zlaté slunce',
      price: '2 100 Kč',
      images: [earringsImage],
      category: 'Náušnice',
      categoryPath: '/nausnice',
      shortDescription: 'Kruhové náušnice se žlutými květy a zlatými akcenty.',
      fullDescription: 'Slunečné kruhové náušnice ozdobené skutečnými žlutými květy a jemnými zlatými akcenty. Přinášejí teplo a radost do každého dne a dokonale doplňují jak casualové, tak elegantní outfity.'
    },
    'e3': {
      id: 'e3',
      title: 'Bílá čistota',
      price: '1 750 Kč',
      images: [earringsImage],
      category: 'Náušnice',
      categoryPath: '/nausnice',
      shortDescription: 'Minimalistické náušnice s drobnými bílými květy.',
      fullDescription: 'Čisté a minimalistické náušnice s drobnými bílými květy symbolizují nevinnost a čistotu. Ideální pro nevěsty nebo pro ty, kteří preferují jemné a nenápadné šperky.'
    },
    // Prsteny
    'r1': {
      id: 'r1',
      title: 'Věčná láska',
      price: '3 500 Kč',
      images: [ringImage, ringImage],
      category: 'Prsteny',
      categoryPath: '/prsteny',
      shortDescription: 'Romantický prsten s červenými růžemi a zlatým rámem.',
      fullDescription: 'Symbol věčné lásky - tento výjimečný prsten obsahuje miniaturní červené růže zasazené do zlatého rámu. Každá růže je pečlivě vybrána pro svou dokonalou formu a barvu. Ideální jako zásnubní nebo výroční dar.'
    },
    'r2': {
      id: 'r2',
      title: 'Přírodní elegance',
      price: '2 900 Kč',
      images: [ringImage],
      category: 'Prsteny',
      categoryPath: '/prsteny',
      shortDescription: 'Široký prsten s mozaikou drobných polních květů.',
      fullDescription: 'Široký prsten představující mozaiku drobných polních květů v různých barvách. Každý prsten je unikátní díky náhodné distribuci květů, což vytváří jedinečný přírodní vzor.'
    },
    'r3': {
      id: 'r3',
      title: 'Ranní rosa',
      price: '3 200 Kč',
      images: [ringImage],
      category: 'Prsteny',
      categoryPath: '/prsteny',
      shortDescription: 'Jemný prsten s bílými květy a perleťovými akcenty.',
      fullDescription: 'Jemný prsten evokující ranní rosu na bílých květech, doplněný perleťovými akcenty, které dodávají šperku ručně vyráběný luxusní vzhled. Symbolizuje nové začátky a čistotu.'
    },
    // Náramky
    'b1': {
      id: 'b1',
      title: 'Zahradní sen',
      price: '2 400 Kč',
      images: [braceletImage, braceletImage],
      category: 'Náramky',
      categoryPath: '/naramky',
      shortDescription: 'Široký náramek s různobarevnými zahradními květy.',
      fullDescription: 'Široký náramek zachycující krásu zahradních květů v plném rozkvětu. Pestrobarevná kompozice zahrnuje růže, tulipány, narcisy a další oblíbené zahradní květiny. Dokonalé pro milovníky barev a výrazných doplňků.'
    },
    'b2': {
      id: 'b2',
      title: 'Lesní stezka',
      price: '2 100 Kč',
      images: [braceletImage],
      category: 'Náramky',
      categoryPath: '/naramky',
      shortDescription: 'Náramek inspirovaný procházkou lesem s kapradinami a mechem.',
      fullDescription: 'Tento náramek vás přenese na klidnou procházku lesní stezkou. Obsahuje kapradiny, mech a další lesní rostliny v zemitých zelených tónech. Ideální pro ty, kteří hledají spojení s přírodou.'
    },
    'b3': {
      id: 'b3',
      title: 'Levandulové pole',
      price: '2 650 Kč',
      images: [braceletImage],
      category: 'Náramky',
      categoryPath: '/naramky',
      shortDescription: 'Elegantní náramek s levandulí a stříbrnými detaily.',
      fullDescription: 'Elegantní náramek s větvičkami skutečné levandule a jemnými stříbrnými akcenty. Levandule je známá svými uklidňujícími vlastnostmi a krásnou fialovou barvou. Náramek je nejen krásný, ale také jemně vonný.'
    }
  };

  const product = productId ? allProducts[productId as keyof typeof allProducts] : null;

  const handleAddToCart = () => {
    if (!product || animatingToCart) return;
    
    // Start animation
    setAnimatingToCart(true);
    
    // Create flying image animation
    if (productImageRef.current) {
      const productImg = productImageRef.current;
      const cartIcon = document.querySelector('[data-cart-icon]');
      
      if (cartIcon) {
        // Create clone of product image
        const flyingImg = productImg.cloneNode(true) as HTMLImageElement;
        flyingImg.style.position = 'fixed';
        flyingImg.style.width = '80px';
        flyingImg.style.height = '80px';
        flyingImg.style.borderRadius = '50%';
        flyingImg.style.zIndex = '9999';
        flyingImg.style.transition = 'all 0.8s ease-in-out';
        flyingImg.style.pointerEvents = 'none';
        
        // Get positions
        const productRect = productImg.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();
        
        // Set initial position
        flyingImg.style.left = `${productRect.left + productRect.width / 2 - 40}px`;
        flyingImg.style.top = `${productRect.top + productRect.height / 2 - 40}px`;
        
        document.body.appendChild(flyingImg);
        
        // Animate to cart
        setTimeout(() => {
          flyingImg.style.left = `${cartRect.left + cartRect.width / 2 - 40}px`;
          flyingImg.style.top = `${cartRect.top + cartRect.height / 2 - 40}px`;
          flyingImg.style.transform = 'scale(0.3)';
          flyingImg.style.opacity = '0.7';
        }, 50);
        
        // Remove element after animation
        setTimeout(() => {
          if (flyingImg && flyingImg.parentNode) {
            flyingImg.parentNode.removeChild(flyingImg);
          }
          setAnimatingToCart(false);
        }, 850);
      } else {
        setAnimatingToCart(false);
      }
    }
    
    // Parse price to number (remove "Kč" and spaces, convert to number)
    const priceNumber = parseInt(product.price.replace(/[^\d]/g, ''));
    
    addToCart({
      id: product.id,
      name: product.title,
      price: priceNumber,
      image: product.images[0],
      category: product.category,
    });
    
    toast({
      title: "Přidáno do košíku",
      description: `${product.title} byl přidán do vašeho košíku.`,
    });
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 text-center">
          <h1 className="text-4xl font-serif text-luxury">Produkt nenalezen</h1>
          <Link to="/" className="text-gold hover:underline mt-4 inline-block">
            Zpět na hlavní stránku
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link 
              to={product.categoryPath} 
              className="inline-flex items-center text-muted-foreground hover:text-gold transition-colors duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zpět na {product.category}
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square bg-muted rounded-2xl overflow-hidden">
                <img
                  ref={productImageRef}
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Thumbnail Images */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square bg-muted rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                        selectedImage === index 
                          ? 'border-gold shadow-lg' 
                          : 'border-transparent hover:border-gold/50'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-8">
              {/* Title and Price */}
              <div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-luxury mb-4 tracking-wide">
                  {product.title}
                </h1>
                <p className="text-3xl font-serif font-semibold text-gold">
                  {product.price}
                </p>
              </div>

              {/* Short Description */}
              <p className="text-xl text-muted-foreground leading-relaxed">
                {product.shortDescription}
              </p>

              {/* Add to Cart Button */}
              <div className="flex space-x-4">
                <Button 
                  variant="luxury" 
                  size="lg" 
                  className="flex-1"
                  onClick={handleAddToCart}
                  disabled={animatingToCart}
                >
                  {animatingToCart ? 'Přidávám...' : 'Přidat do košíku'}
                </Button>
                <Button variant="outline" size="lg" className="aspect-square p-0">
                  <Heart className="h-5 w-5" />
                </Button>
              </div>

              {/* Full Description */}
              <div className="border-t border-border pt-8">
                <h3 className="text-xl font-serif font-semibold text-luxury mb-4">
                  O produktu
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.fullDescription}
                </p>
              </div>

              {/* Product Features */}
              <div className="border-t border-border pt-8">
                <h3 className="text-xl font-serif font-semibold text-luxury mb-4">
                  Vlastnosti
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Ručně vyráběno s láskou k detailu</li>
                  <li>• Skutečné květy konzervované v pryskyřici</li>
                  <li>• Hypoalergenní materiály</li>
                  <li>• Každý kus je jedinečný</li>
                  <li>• Dodáváno v elegantním balení</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Recommendations */}
      <ProductRecommendations 
        currentProductId={product.id}
        currentCategory={product.category}
      />

      <Footer />
    </div>
  );
};

export default ProductDetailPage;