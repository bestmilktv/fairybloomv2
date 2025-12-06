import { useEffect, useRef, useState } from 'react';

export const useScrollAnimation = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px', // Trigger slightly before element comes into view
      }
    );

    const currentRef = ref.current; // Uložit do lokální proměnné pro cleanup
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      // OPTIMALIZACE: Vždy disconnect, bez podmínky
      observer.disconnect();
      // Také unobserve pro jistotu
      if (currentRef) {
        try {
          observer.unobserve(currentRef);
        } catch (e) {
          // Ignorovat chyby pokud element už neexistuje
        }
      }
    };
  }, [threshold]);

  return [ref, isVisible] as const;
};