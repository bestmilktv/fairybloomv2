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
  // Banner 1: Dynamický z kolekce náhrdelníků
  {
    type: 'collection',
    shopifyHandle: 'nahrdelniky',
    enabled: true,
    order: 1,
    customTitle: null, // použije se název kolekce z Shopify
    customDescription: null,
    customCta: null,
  },
  
  // Banner 2: Dynamický z kolekce náušnic
  {
    type: 'collection',
    shopifyHandle: 'nausnice',
    enabled: true,
    order: 2,
    customTitle: null,
    customDescription: null,
    customCta: null,
  },
  
  // Banner 3: Dynamický z kolekce prstenů
  {
    type: 'collection',
    shopifyHandle: 'prsteny',
    enabled: true,
    order: 3,
    customTitle: null,
    customDescription: null,
    customCta: null,
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

