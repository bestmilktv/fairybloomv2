import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import CategoryProductSection from '@/components/CategoryProductSection';
import Footer from '@/components/Footer';

// Import product images
import necklaceImage from '@/assets/necklace-placeholder.jpg';
import earringsImage from '@/assets/earrings-placeholder.jpg';
import ringImage from '@/assets/ring-placeholder.jpg';
import braceletImage from '@/assets/bracelet-placeholder.jpg';

const CategoryPage = () => {
  const location = useLocation();
  const category = location.pathname.substring(1); // Remove leading slash

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [category]);

  // All products data
  const allProducts = {
    'náhrdelníky': {
      title: 'Náhrdelníky',
      subtitle: 'Elegantní náhrdelníky s květinami zachycenými v čase',
      image: necklaceImage,
      products: [
        {
          id: 'n1',
          title: 'Růžové okvětí',
          price: '2 890 Kč',
          image: necklaceImage,
          description: 'Jemný náhrdelník s růžovými okvětními lístky v průzračné pryskyřici.'
        },
        {
          id: 'n2',
          title: 'Lesní kapradina',
          price: '3 200 Kč',
          image: necklaceImage,
          description: 'Minimalistický design s jemnou kapradinou z českých lesů.'
        },
        {
          id: 'n3',
          title: 'Loučka v létě',
          price: '2 650 Kč',
          image: necklaceImage,
          description: 'Barevná směs lučních květů zachycená v elegantním náhrdelníku.'
        },
        {
          id: 'n4',
          title: 'Zimní kouzlo',
          price: '3 100 Kč',
          image: necklaceImage,
          description: 'Křehké zimní větvičky s drobnými krystalky.'
        },
        {
          id: 'n5',
          title: 'Jarní probuzení',
          price: '2 750 Kč',
          image: necklaceImage,
          description: 'Mladé lístky a první jarní květy v jemném náhrdelníku.'
        },
        {
          id: 'n6',
          title: 'Podzimní symfonie',
          price: '3 000 Kč',
          image: necklaceImage,
          description: 'Teplé podzimní barvy listů zachycené v elegantním tvaru.'
        }
      ]
    },
    'náušnice': {
      title: 'Náušnice',
      subtitle: 'Jemné náušnice pro každodenní eleganci',
      image: earringsImage,
      products: [
        {
          id: 'e1',
          title: 'Pomněnkové kapky',
          price: '1 890 Kč',
          image: earringsImage,
          description: 'Drobné náušnice s modrými pomněnkami v kapkovitém tvaru.'
        },
        {
          id: 'e2',
          title: 'Zlaté slunce',
          price: '2 100 Kč',
          image: earringsImage,
          description: 'Kruhové náušnice se žlutými květy a zlatými akcenty.'
        },
        {
          id: 'e3',
          title: 'Bílá čistota',
          price: '1 750 Kč',
          image: earringsImage,
          description: 'Minimalistické náušnice s drobnými bílými květy.'
        },
        {
          id: 'e4',
          title: 'Levandulové sny',
          price: '1 950 Kč',
          image: earringsImage,
          description: 'Dlouhé náušnice s větvičkami levandule.'
        },
        {
          id: 'e5',
          title: 'Růžový úsvit',
          price: '2 200 Kč',
          image: earringsImage,
          description: 'Jemné náušnice s růžovými květy sakury.'
        }
      ]
    },
    'prsteny': {
      title: 'Prsteny',
      subtitle: 'Jedinečné prsteny pro výjimečné okamžiky',
      image: ringImage,
      products: [
        {
          id: 'r1',
          title: 'Věčná láska',
          price: '3 500 Kč',
          image: ringImage,
          description: 'Romantický prsten s červenými růžemi a zlatým rámem.'
        },
        {
          id: 'r2',
          title: 'Přírodní elegance',
          price: '2 900 Kč',
          image: ringImage,
          description: 'Široký prsten s mozaikou drobných polních květů.'
        },
        {
          id: 'r3',
          title: 'Ranní rosa',
          price: '3 200 Kč',
          image: ringImage,
          description: 'Jemný prsten s bílými květy a perleťovými akcenty.'
        },
        {
          id: 'r4',
          title: 'Tajemný les',
          price: '3 800 Kč',
          image: ringImage,
          description: 'Masivní prsten s kapradinami a mechem.'
        }
      ]
    },
    'náramky': {
      title: 'Náramky',
      subtitle: 'Stylové náramky plné přírodní krásy',
      image: braceletImage,
      products: [
        {
          id: 'b1',
          title: 'Zahradní sen',
          price: '2 400 Kč',
          image: braceletImage,
          description: 'Široký náramek s různobarevnými zahradními květy.'
        },
        {
          id: 'b2',
          title: 'Lesní stezka',
          price: '2 100 Kč',
          image: braceletImage,
          description: 'Náramek inspirovaný procházkou lesem s kapradinami a mechem.'
        },
        {
          id: 'b3',
          title: 'Levandulové pole',
          price: '2 650 Kč',
          image: braceletImage,
          description: 'Elegantní náramek s levandulí a stříbrnými detaily.'
        },
        {
          id: 'b4',
          title: 'Mořská bříza',
          price: '2 300 Kč',
          image: braceletImage,
          description: 'Jemný náramek s mořskými řasami a perletí.'
        }
      ]
    }
  };

  // URL decode the category name to handle Czech characters properly
  const decodedCategory = category ? decodeURIComponent(category) : null;
  const categoryData = decodedCategory ? allProducts[decodedCategory as keyof typeof allProducts] : null;

  if (!categoryData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 text-center">
          <h1 className="text-4xl font-serif text-luxury">Kategorie nenalezena</h1>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Category Header */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-luxury mb-6 tracking-wide">
            {categoryData.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {categoryData.subtitle}
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <CategoryProductSection 
            category={decodedCategory || ''}
            initialProducts={categoryData.products}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CategoryPage;