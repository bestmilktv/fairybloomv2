// src/config/slideshow.ts
// Konfigurace bannerů pro slideshow na homepage
// Editací tohoto souboru můžeš přidávat, odebírat a upravovat bannery

export interface SlideshowSlideConfig {
  type: 'product' | 'collection' | 'custom';
  enabled: boolean;
  order: number;
  
  // Pro typ 'product' nebo 'collection' - handle z Shopify
  shopifyHandle?: string;
  
  // Pro typ 'custom' - statický banner s vlastním obrázkem
  image?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  cta?: string;
  ctaLink?: string;
  
  // Vlastní přepsání pro product/collection (volitelné)
  // Pokud je null, použije se hodnota z Shopify
  customTitle?: string | null;
  customSubtitle?: string | null;
  customDescription?: string | null;
  customCta?: string | null;
}

export const slideshowConfig: SlideshowSlideConfig[] = [
  // Banner 1: Statický - halloween
  {
    type: 'custom',
    enabled: true,
    order: 1,
    image: '/slideshow/halloween.jpg',  // <-- tady je cesta k obrázku
    title: 'Halloweenská akce',
    // ...
  },
  
  // Banner 2: Statický - vanoece
  {
    type: 'custom',
    enabled: true,
    order: 2,
    image: '/slideshow/christmas.jpg',  // <-- tady je cesta k obrázku
    title: 'Vánoční akce',
  },
  
  // Banner 3: Statický - valentyn
  {
    type: 'custom',
    enabled: true,
    order: 3,
    image: '/slideshow/valentine.jpg',  // <-- tady je cesta k obrázku
    title: 'Valentýnská akce',
  },
  
  // Příklad: Statický custom banner (zakomentovaný - můžeš odkomentovat a použít)
  // {
  //   type: 'custom',
  //   enabled: true,
  //   order: 4,
  //   image: '/slideshow/valentines-sale.jpg', // obrázek v public/slideshow/
  //   title: 'Valentýnská akce',
  //   subtitle: 'Sleva 20%',
  //   description: 'Speciální nabídka pro Valentýna. Pouze tento týden!',
  //   cta: 'Využít akci',
  //   ctaLink: '/nahrdelniky', // kam má vést tlačítko
  // },
  
  // Příklad: Banner s konkrétním produktem z Shopify
  // {
  //   type: 'product',
  //   shopifyHandle: 'zlata-nausnice-srdce', // handle produktu v Shopify
  //   enabled: true,
  //   order: 5,
  //   customTitle: null, // použije se název produktu
  //   customDescription: 'Exkluzivní design s brilianty',
  //   customCta: 'Zobrazit produkt',
  // },
];

