import { useState, useEffect } from 'react';

/**
 * Hook pro preload všech obrázků před zobrazením
 * Vrací true, když jsou všechny obrázky načtené
 */
export function useImagePreloader(imageUrls: string[]): boolean {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    if (imageUrls.length === 0) {
      setImagesLoaded(true);
      return;
    }

    let cancelled = false;
    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    const handleLoad = () => {
      loadedCount++;
      if (loadedCount === imageUrls.length && !cancelled) {
        setImagesLoaded(true);
      }
    };

    const handleError = () => {
      loadedCount++;
      // I při chybě počítáme jako načtené, abychom neblokovali zobrazení
      if (loadedCount === imageUrls.length && !cancelled) {
        setImagesLoaded(true);
      }
    };

    // Preload všech obrázků
    imageUrls.forEach((url) => {
      if (!url) {
        loadedCount++;
        if (loadedCount === imageUrls.length && !cancelled) {
          setImagesLoaded(true);
        }
        return;
      }

      const img = new Image();
      img.onload = handleLoad;
      img.onerror = handleError;
      img.src = url;
      images.push(img);
    });

    // Pokud jsou všechny prázdné URL, nastavíme jako načtené
    if (loadedCount === imageUrls.length && !cancelled) {
      setImagesLoaded(true);
    }

    return () => {
      cancelled = true;
      // Cleanup - uvolníme reference na obrázky
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [imageUrls]);

  return imagesLoaded;
}
